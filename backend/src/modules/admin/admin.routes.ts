import { Router, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticateToken, requireRole, AuthRequest } from '../../middleware/auth';

const router = Router();

// Apply auth + ADMIN role to all routes in this router
router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

// 1. Dashboard statistics
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await prisma.user.count({ where: { role: 'CLIENT' } });
    const totalCompanions = await prisma.user.count({ where: { role: 'COMPANION' } });
    const pendingKycCount = await prisma.companionProfile.count({ where: { kycStatus: 'PENDING' } });
    const pendingSlipCount = await prisma.paymentSlip.count({ where: { status: 'PENDING' } });
    const totalBookings = await prisma.booking.count();
    const activeBookings = await prisma.booking.count({
      where: { status: { in: ['OFFER_ACCEPTED', 'CONFIRMED_ESCROW', 'CHECKED_IN'] } }
    });

    // Sum platform fees from completed bookings
    const completedBookings = await prisma.booking.findMany({
      where: { status: 'COMPLETED' },
      select: { platformFee: true, totalAmount: true }
    });
    const totalRevenue = completedBookings.reduce((sum, b) => sum + b.platformFee, 0);
    const totalGrossVolume = completedBookings.reduce((sum, b) => sum + b.totalAmount, 0);

    res.json({
      totalUsers,
      totalCompanions,
      pendingKycCount,
      pendingSlipCount,
      totalBookings,
      activeBookings,
      totalRevenue,
      totalGrossVolume
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch admin stats' });
  }
});

// 2. Pending KYC list
router.get('/kyc/pending', async (req: AuthRequest, res: Response) => {
  try {
    const pending = await prisma.companionProfile.findMany({
      where: { kycStatus: 'PENDING' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatar: true,
            city: true,
            gender: true,
            createdAt: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ pending });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch pending KYC' });
  }
});

// 3. Review KYC (Approve / Reject)
router.post('/kyc/:companionId/review', async (req: AuthRequest, res: Response) => {
  try {
    const { companionId } = req.params;
    const { action, note } = req.body; // action: 'APPROVE' or 'REJECT'

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be APPROVE or REJECT' });
    }

    const isApproved = action === 'APPROVE';

    const companion = await prisma.companionProfile.update({
      where: { id: companionId },
      data: {
        kycStatus: isApproved ? 'APPROVED' : 'REJECTED',
        kycNote: note || null,
        user: {
          update: {
            isVerified: isApproved
          }
        }
      },
      include: { user: true }
    });

    res.json({
      message: `KYC has been ${action.toLowerCase()}d successfully`,
      companion
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to review KYC' });
  }
});

// 4. Pending Payment Slips
router.get('/slips/pending', async (req: AuthRequest, res: Response) => {
  try {
    const pendingSlips = await prisma.paymentSlip.findMany({
      where: { status: 'PENDING' },
      include: {
        booking: {
          include: {
            client: { select: { id: true, name: true, phone: true } },
            companion: { select: { id: true, name: true, phone: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ pendingSlips });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch pending slips' });
  }
});

// 5. Review Slip (Approve / Reject)
router.post('/slips/:slipId/review', async (req: AuthRequest, res: Response) => {
  try {
    const { slipId } = req.params;
    const { action, adminNote } = req.body; // action: 'APPROVE' or 'REJECT'
    const adminId = req.user!.id;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be APPROVE or REJECT' });
    }

    const slip = await prisma.paymentSlip.findUnique({
      where: { id: slipId },
      include: { booking: true }
    });

    if (!slip) return res.status(404).json({ error: 'Payment slip not found' });

    const isApproved = action === 'APPROVE';

    const [updatedSlip, updatedBooking] = await prisma.$transaction([
      prisma.paymentSlip.update({
        where: { id: slipId },
        data: {
          status: isApproved ? 'APPROVED' : 'REJECTED',
          adminNote: adminNote || null,
          reviewedAt: new Date(),
          reviewedBy: adminId
        }
      }),
      prisma.booking.update({
        where: { id: slip.bookingId },
        data: {
          status: isApproved ? 'CONFIRMED_ESCROW' : 'OFFER_ACCEPTED'
        }
      })
    ]);

    // Send notification in chat
    await prisma.chatMessage.create({
      data: {
        senderId: adminId,
        receiverId: slip.booking.clientId,
        bookingId: slip.bookingId,
        content: isApproved
          ? `[ADMIN NOTICE] Bank transfer slip verified! Funds are secured in Escrow. Booking is now CONFIRMED.`
          : `[ADMIN NOTICE] Bank transfer slip REJECTED. Reason: ${adminNote || 'Invalid slip/amount mismatch'}. Please upload valid slip.`,
        messageType: 'SYSTEM_ALERT'
      }
    });

    res.json({
      message: `Payment slip ${action.toLowerCase()}d`,
      slip: updatedSlip,
      booking: updatedBooking
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to review payment slip' });
  }
});

// 6. Manage All Bookings
router.get('/bookings', async (req: AuthRequest, res: Response) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        client: { select: { id: true, name: true, phone: true } },
        companion: { select: { id: true, name: true, phone: true } },
        paymentSlip: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ bookings });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch bookings' });
  }
});

// 7. System Settings
router.get('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsMap = settings.reduce((acc: any, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
    res.json({ settings: settingsMap });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch settings' });
  }
});

router.post('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value required' });
    }

    const updated = await prisma.systemSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) }
    });

    res.json({ message: 'Setting saved', setting: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update setting' });
  }
});

// 8. Toggle User Ban
router.post('/users/:userId/toggle-ban', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: !user.isBanned }
    });

    res.json({
      message: `User ${updated.isBanned ? 'banned' : 'unbanned'} successfully`,
      isBanned: updated.isBanned
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to toggle ban' });
  }
});

export default router;
