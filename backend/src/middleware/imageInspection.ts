import fs from 'fs';
import { Jimp } from 'jimp';
import jsQR from 'jsqr';
import { createWorker } from 'tesseract.js';

export interface ImageInspectionResult {
  isBlocked: boolean;
  reasons: string[];
  detectedText?: string;
}

let tesseractWorker: any = null;

async function getWorker() {
  if (!tesseractWorker) {
    tesseractWorker = await createWorker('eng');
    await tesseractWorker.setParameters({
      tessedit_pageseg_mode: '11' as any
    });
  }
  return tesseractWorker;
}

/**
 * Scan for QR code finder patterns (1:1:3:1:1 black-white-black-white-black module ratio)
 */
function detectQRFinderPatterns(bitmap: { width: number; height: number; data: Buffer | Uint8Array }): number {
  const w = bitmap.width;
  const h = bitmap.height;
  const data = bitmap.data;

  const isBlack = (x: number, y: number): boolean => {
    const idx = (y * w + x) * 4;
    return (data[idx] + data[idx + 1] + data[idx + 2]) / 3 < 128;
  };

  let patterns = 0;
  // Step through vertical lines with stride 2 for performance
  for (let y = 0; y < h; y += 2) {
    const runs = [0, 0, 0, 0, 0];
    let currentIsBlack = false;

    for (let x = 0; x < w; x++) {
      const b = isBlack(x, y);
      if (b === currentIsBlack) {
        runs[4]++;
      } else {
        runs[0] = runs[1];
        runs[1] = runs[2];
        runs[2] = runs[3];
        runs[3] = runs[4];
        runs[4] = 1;
        currentIsBlack = b;

        if (currentIsBlack) {
          const total = runs[0] + runs[1] + runs[2] + runs[3] + runs[4];
          const unit = total / 7;
          if (
            unit >= 2 &&
            Math.abs(runs[0] - unit) <= unit * 0.6 &&
            Math.abs(runs[1] - unit) <= unit * 0.6 &&
            Math.abs(runs[2] - 3 * unit) <= unit * 1.0 &&
            Math.abs(runs[3] - unit) <= unit * 0.6 &&
            Math.abs(runs[4] - unit) <= unit * 0.6
          ) {
            patterns++;
          }
        }
      }
    }
  }

  return patterns;
}

/**
 * Inspect uploaded image for:
 * 1. QR payment codes (LAPNet, LAO QR, BCEL One, promptpay, etc.)
 * 2. Bank transfer e-slips / payment receipts
 * 3. Phone numbers (020, 030, +856) and bank account numbers
 */
export async function inspectImageContent(filePath: string): Promise<ImageInspectionResult> {
  const reasons: string[] = [];

  try {
    const img: any = await Jimp.read(filePath);

    // 1. Check for standard QR code via jsQR
    try {
      const qrData = jsQR(
        new Uint8ClampedArray(img.bitmap.data),
        img.bitmap.width,
        img.bitmap.height
      );

      if (qrData && qrData.data) {
        reasons.push('QR Code detected in image. Direct off-platform payment QR codes are strictly prohibited.');
      }
    } catch (e) {
      // Ignore decoder errors and proceed to pattern & OCR inspection
    }

    // 2. Check for QR code finder pattern signatures (1:1:3:1:1 module ratio)
    const finderPatterns = detectQRFinderPatterns(img.bitmap);
    if (finderPatterns >= 3) {
      if (!reasons.some(r => r.includes('QR Code'))) {
        reasons.push('Payment QR Code structure detected in image.');
      }
    }

    // 3. Prepare image for OCR (upscale if small to recognize phone numbers and bank text clearly)
    let ocrImg: any = img;
    if (img.bitmap.width < 800) {
      const scale = 800 / img.bitmap.width;
      ocrImg = img.clone().resize({
        w: Math.round(img.bitmap.width * scale),
        h: Math.round(img.bitmap.height * scale)
      });
    }

    const ocrBuffer = await ocrImg.getBuffer('image/png');
    const worker = await getWorker();
    const ocrResult = await worker.recognize(ocrBuffer);
    const rawText = ocrResult?.data?.text || '';
    const textLower = rawText.toLowerCase();

    // Normalized text to catch OCR substitution tricks (e.g. O/D -> 0, I/l -> 1)
    const normalizedDigits = textLower
      .replace(/[oOdDqQ]/g, '0')
      .replace(/[iIl|]/g, '1')
      .replace(/[sS]/g, '5')
      .replace(/[bB]/g, '8');

    // 4. Check for Phone numbers (020, 030, +856, 85620, 85630)
    const phonePattern = /(020|030|85620|85630|\+856)\s*[\d\-xX.*]{4,10}/i;
    const phonePrefixPattern = /\b(020|030)\b/i;
    const standalone8Digits = /\b\d{8}\b/;

    if (phonePattern.test(normalizedDigits) || phonePrefixPattern.test(textLower) || standalone8Digits.test(textLower)) {
      reasons.push('Phone number (020/030/+856) detected in image. Off-platform contact sharing is prohibited.');
    }

    // 5. Check for Bank Transfer e-slips & Payment Receipts
    const bankKeywords = [
      'bcel', 'onepay', 'lapnet', 'laoqr', 'lao qr', 'phongsavanh',
      'jdb', 'ldb', 'apb', 'maruhan', 'vietinbank', 'sacombank',
      'kasikorn', 'kbank', 'scb', 'promptpay', 'krungthai', 'bangkok bank'
    ];

    const slipKeywords = [
      'transfer', 'transfert', 'payment', 'eslip', 'slip', 'receipt',
      'bill', 'paid', 'amount', 'amou', 'lak', 'kip', 'thb', 'account', 'acc:'
    ];

    const hasBank = bankKeywords.some(b => textLower.includes(b));
    const hasSlip = slipKeywords.some(s => textLower.includes(s));

    if (hasBank && hasSlip) {
      reasons.push('Bank transfer e-slip or payment receipt detected in image. Off-platform payments are prohibited.');
    } else if (hasBank) {
      reasons.push('Bank / payment service branding detected in image.');
    } else if (hasSlip && (textLower.includes('account') || textLower.includes('amount') || textLower.includes('lak'))) {
      reasons.push('Bank account or payment amount details detected in image.');
    }

    // 6. Check for long Bank Account numbers (10 to 18 digits)
    const bankAccountPattern = /\b\d{10,18}\b/;
    if (bankAccountPattern.test(textLower)) {
      reasons.push('Bank account number sequence detected in image.');
    }

    return {
      isBlocked: reasons.length > 0,
      reasons,
      detectedText: rawText.slice(0, 200)
    };
  } catch (err: any) {
    console.error('[ImageInspection] Error scanning image:', err);
    // On unexpected inspection failure, allow safe fallback but log warning
    return {
      isBlocked: false,
      reasons: []
    };
  }
}
