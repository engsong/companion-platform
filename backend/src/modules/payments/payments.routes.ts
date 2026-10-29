import { Router, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { uploadSlip } from '../../middleware/upload';

const router = Router();

// Get Company Payment / QR details for a booking
router.get('/instructions/:bookingId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Fetch company bank details from settings
    const bankName = await prisma.systemSetting.findUnique({ where: { key: 'COMPANY_BANK_NAME' } });
    const bankAccount = await prisma.systemSetting.findUnique({ where: { key: 'COMPANY_BANK_ACCOUNT' } });
    const accountName = await prisma.systemSetting.findUnique({ where: { key: 'COMPANY_ACCOUNT_NAME' } });
    const qrImage = await prisma.systemSetting.findUnique({ where: { key: 'COMPANY_QR_IMAGE' } });

    res.json({
      bookingId: booking.id,
      refCode: booking.refCode,
      totalAmount: booking.totalAmount,
      bankDetails: {
        bankName: bankName?.value || 'Banque Pour Le Commerce Exterieur Lao (BCEL)',
        accountNumber: bankAccount?.value || '010-12-00-01234567-001',
        accountName: accountName?.value || 'COMPANION PLATFORM CO., LTD',
        qrImageUrl: qrImage?.value || '/static/company_bcel_qr.png'
      },
      instructions: `Please transfer exactly ${booking.totalAmount.toLocaleString()} LAK and put Ref: ${booking.refCode} in transaction remark. Upload the transfer slip below.`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get payment instructions' });
  }
});

// Upload Payment Slip
router.post(
  '/upload-slip',
  authenticateToken,
  uploadSlip.single('slip'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { bookingId, amount, bankRef } = req.body;

      if (!req.file || !bookingId) {
        return res.status(400).json({ error: 'Transfer slip image and bookingId are required' });
      }

      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking) return res.status(404).json({ error: 'Booking not found' });

      const slipUrl = `/uploads/slips/${req.file.filename}`;

      // Upsert payment slip
      const slip = await prisma.paymentSlip.upsert({
        where: { bookingId },
        update: {
          slipUrl,
          amount: Number(amount) || booking.totalAmount,
          bankRef: bankRef || null,
          status: 'PENDING',
          reviewedAt: null,
          reviewedBy: null,
          adminNote: null
        },
        create: {
          bookingId,
          slipUrl,
          amount: Number(amount) || booking.totalAmount,
          bankRef: bankRef || null,
          status: 'PENDING'
        }
      });

      // Update booking status to PENDING_PAYMENT_VERIFICATION
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'PENDING_PAYMENT_VERIFICATION' }
      });

      // Send alert in chat
      await prisma.chatMessage.create({
        data: {
          senderId: booking.clientId,
          receiverId: booking.companionId,
          bookingId: booking.id,
          content: `Payment slip uploaded for ${booking.totalAmount.toLocaleString()} LAK. Pending Admin verification.`,
          messageType: 'SYSTEM_ALERT'
        }
      });

      res.status(201).json({
        message: 'Slip uploaded successfully. Waiting for admin approval.',
        slip
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to upload slip' });
    }
  }
);

export default router;
