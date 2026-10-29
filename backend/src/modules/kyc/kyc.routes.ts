import { Router, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { uploadKyc } from '../../middleware/upload';

const router = Router();

// Submit KYC documents (ID Card + Selfie)
router.post(
  '/submit',
  authenticateToken,
  uploadKyc.fields([
    { name: 'idCard', maxCount: 1 },
    { name: 'selfie', maxCount: 1 }
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      if (!files?.idCard?.[0] || !files?.selfie?.[0]) {
        return res.status(400).json({ error: 'Both ID Card and live Selfie images are required' });
      }

      const idCardUrl = `/uploads/kyc/${files.idCard[0].filename}`;
      const selfieUrl = `/uploads/kyc/${files.selfie[0].filename}`;

      const companion = await prisma.companionProfile.upsert({
        where: { userId: req.user!.id },
        update: {
          kycIdCardUrl: idCardUrl,
          kycSelfieUrl: selfieUrl,
          kycStatus: 'PENDING',
          kycNote: null
        },
        create: {
          userId: req.user!.id,
          kycIdCardUrl: idCardUrl,
          kycSelfieUrl: selfieUrl,
          kycStatus: 'PENDING'
        }
      });

      res.json({
        message: 'KYC documents submitted successfully. Please wait for admin approval.',
        kycStatus: companion.kycStatus
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to submit KYC' });
    }
  }
);

// Get current KYC status
router.get('/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const companion = await prisma.companionProfile.findUnique({
      where: { userId: req.user!.id },
      select: {
        kycStatus: true,
        kycNote: true,
        kycIdCardUrl: true,
        kycSelfieUrl: true,
        updatedAt: true
      }
    });

    if (!companion) {
      return res.json({ kycStatus: 'NOT_SUBMITTED' });
    }

    res.json(companion);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get KYC status' });
  }
});

export default router;
