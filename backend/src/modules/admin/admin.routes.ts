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

// 9. Get Pending Wallet Top-ups
router.get('/wallet/pending-topups', async (req: AuthRequest, res: Response) => {
  try {
    const pending = await prisma.walletTransaction.findMany({
      where: { type: 'TOPUP', status: 'PENDING' },
      include: {
        user: { select: { id: true, name: true, phone: true, avatar: true, walletBalance: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ pendingTopups: pending });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch pending topups' });
  }
});

// 10. Review Wallet Top-up (Approve & Deposit / Reject)
router.post('/wallet/topup/:id/review', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, note } = req.body;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be APPROVE or REJECT' });
    }

    const tx = await prisma.walletTransaction.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!tx || tx.type !== 'TOPUP') {
      return res.status(404).json({ error: 'Top-up transaction not found' });
    }

    if (tx.status !== 'PENDING') {
      return res.status(400).json({ error: `Transaction is already ${tx.status}` });
    }

    let updatedTx: any;
    let newBalance = tx.user.walletBalance;

    if (action === 'APPROVE') {
      const result = await prisma.$transaction(async (prismaTx) => {
        const user = await prismaTx.user.update({
          where: { id: tx.userId },
          data: { walletBalance: { increment: tx.amount } }
        });

        const transaction = await prismaTx.walletTransaction.update({
          where: { id },
          data: {
            status: 'APPROVED',
            adminNote: note || null,
            reviewedAt: new Date(),
            reviewedBy: req.user!.id
          }
        });

        return { user, transaction };
      });

      updatedTx = result.transaction;
      newBalance = result.user.walletBalance;
    } else {
      updatedTx = await prisma.walletTransaction.update({
        where: { id },
        data: {
          status: 'REJECTED',
          adminNote: note || 'Top-up slip could not be verified',
          reviewedAt: new Date(),
          reviewedBy: req.user!.id
        }
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${tx.userId}`).emit('wallet_updated', {
        balance: newBalance,
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        amount: tx.amount,
        type: 'TOPUP'
      });
    }

    res.json({
      message: action === 'APPROVE' ? 'Deposit approved and balance credited!' : 'Top-up request rejected',
      transaction: updatedTx
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to review top-up' });
  }
});

// 11. Get Pending Wallet Withdrawals
router.get('/wallet/pending-withdrawals', async (req: AuthRequest, res: Response) => {
  try {
    const pending = await prisma.walletTransaction.findMany({
      where: { type: 'WITHDRAW', status: 'PENDING' },
      include: {
        user: { select: { id: true, name: true, phone: true, avatar: true, walletBalance: true, walletId: true, bankQrUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ pendingWithdrawals: pending });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch pending withdrawals' });
  }
});

// 12. Review Wallet Withdrawal (Approve & Complete / Reject & Refund)
router.post('/wallet/withdraw/:id/review', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, note, slipUrl } = req.body;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be APPROVE or REJECT' });
    }

    const tx = await prisma.walletTransaction.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!tx || tx.type !== 'WITHDRAW') {
      return res.status(404).json({ error: 'Withdrawal transaction not found' });
    }

    if (tx.status !== 'PENDING') {
      return res.status(400).json({ error: `Transaction is already ${tx.status}` });
    }

    let updatedTx: any;
    let newBalance = tx.user.walletBalance;

    if (action === 'APPROVE') {
      updatedTx = await prisma.walletTransaction.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          slipUrl: slipUrl || null,
          adminNote: note || null,
          reviewedAt: new Date(),
          reviewedBy: req.user!.id
        }
      });
    } else {
      // Refund held balance back to user
      const result = await prisma.$transaction(async (prismaTx) => {
        const user = await prismaTx.user.update({
          where: { id: tx.userId },
          data: { walletBalance: { increment: tx.amount } }
        });

        const transaction = await prismaTx.walletTransaction.update({
          where: { id },
          data: {
            status: 'REJECTED',
            adminNote: note || 'Withdrawal rejected, balance refunded',
            reviewedAt: new Date(),
            reviewedBy: req.user!.id
          }
        });

        return { user, transaction };
      });

      updatedTx = result.transaction;
      newBalance = result.user.walletBalance;
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${tx.userId}`).emit('wallet_updated', {
        balance: newBalance,
        status: action === 'APPROVE' ? 'COMPLETED' : 'REJECTED',
        amount: tx.amount,
        type: 'WITHDRAW'
      });
    }

    res.json({
      message: action === 'APPROVE' ? 'Withdrawal marked as completed!' : 'Withdrawal rejected and balance refunded to user',
      transaction: updatedTx
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to review withdrawal' });
  }
});

// 13. Get All Wallet Transactions History
router.get('/wallet/transactions', async (req: AuthRequest, res: Response) => {
  try {
    const transactions = await prisma.walletTransaction.findMany({
      include: {
        user: { select: { id: true, name: true, phone: true } },
        targetUser: { select: { id: true, name: true, phone: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json({ transactions });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch wallet transactions' });
  }
});

export default router;
