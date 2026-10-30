import { Router, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { uploadSlip } from '../../middleware/upload';
import { generateWalletId } from '../../utils/walletId';

const router = Router();

// 1. Get current user wallet balance, unique walletId, and transaction history
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        walletId: true,
        walletBalance: true,
        bankQrUrl: true
      }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Auto-generate unique walletId if not set yet
    if (!user.walletId) {
      const generated = generateWalletId();
      user = await prisma.user.update({
        where: { id: userId },
        data: { walletId: generated },
        select: {
          id: true,
          name: true,
          phone: true,
          walletId: true,
          walletBalance: true,
          bankQrUrl: true
        }
      });
    }

    const transactions = await prisma.walletTransaction.findMany({
      where: { userId },
      include: {
        targetUser: {
          select: { id: true, name: true, phone: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({
      balance: user.walletBalance,
      walletId: user.walletId,
      bankQrUrl: user.bankQrUrl,
      transactions,
      walletQrData: `WALLET:${user.walletId}`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch wallet info' });
  }
});

// 2. Get Top-up Instructions & Platform Deposit Bank Info
router.get('/instructions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const bankName = await prisma.systemSetting.findUnique({ where: { key: 'COMPANY_BANK_NAME' } });
    const bankAccount = await prisma.systemSetting.findUnique({ where: { key: 'COMPANY_BANK_ACCOUNT' } });
    const accountName = await prisma.systemSetting.findUnique({ where: { key: 'COMPANY_ACCOUNT_NAME' } });
    const qrImage = await prisma.systemSetting.findUnique({ where: { key: 'COMPANY_QR_IMAGE' } });

    res.json({
      bankDetails: {
        bankName: bankName?.value || 'Banque Pour Le Commerce Exterieur Lao (BCEL)',
        accountNumber: bankAccount?.value || '010-12-00-01234567-001',
        accountName: accountName?.value || 'COMPANION PLATFORM CO., LTD',
        qrImageUrl: qrImage?.value || '/static/company_bcel_qr.png'
      },
      instructions: 'Please transfer via BCEL One or bank app, capture the payment slip, and upload it below. Admin will verify and deposit funds into your wallet.'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch top-up instructions' });
  }
});

// 3. Submit Top-up Request with Transfer Slip
router.post(
  '/topup',
  authenticateToken,
  uploadSlip.single('slip'),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { amount, bankName = 'BCEL One' } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'Payment transfer slip image is required' });
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Valid top-up amount is required' });
      }

      const slipUrl = `/uploads/slips/${req.file.filename}`;

      const transaction = await prisma.walletTransaction.create({
        data: {
          userId,
          type: 'TOPUP',
          amount: numAmount,
          status: 'PENDING',
          bankName,
          slipUrl
        }
      });

      // Notify admin via socket if connected
      const io = req.app.get('io');
      if (io) {
        io.emit('new_wallet_topup', { transaction });
      }

      res.status(201).json({
        message: 'Top-up slip submitted successfully! Admin will verify and credit your balance.',
        transaction
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to submit top-up request' });
    }
  }
);

// 4. Request Wallet Withdrawal (using Bank QR)
router.post('/withdraw', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, bankQrUrl, bankName } = req.body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid withdrawal amount is required' });
    }

    // Atomic transaction: verify balance, user bank QR and deduct immediately
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('User not found');

      const targetBankQr = bankQrUrl || user.bankQrUrl;
      if (!targetBankQr) {
        throw new Error('Bank QR is required. Please upload your Bank QR before requesting withdrawal.');
      }

      if (user.walletBalance < numAmount) {
        throw new Error(`Insufficient wallet balance. You have ${user.walletBalance.toLocaleString()} LAK available.`);
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          walletBalance: { decrement: numAmount }
        }
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          userId,
          type: 'WITHDRAW',
          amount: numAmount,
          status: 'PENDING',
          bankName: bankName || 'Bank QR (Lao QR / BCEL One)',
          accountNumber: user.walletId || user.phone,
          accountName: user.name,
          bankQrUrl: targetBankQr
        }
      });

      return { updatedUser, transaction };
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('wallet_updated', { balance: result.updatedUser.walletBalance });
      io.emit('new_wallet_withdrawal', { transaction: result.transaction });
    }

    res.status(201).json({
      message: 'Withdrawal request submitted! Admin will transfer funds to your Bank QR.',
      balance: result.updatedUser.walletBalance,
      transaction: result.transaction
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to process withdrawal request' });
  }
});

// 5. Send Inquiry for Recipient Wallet (QR Payload or Wallet ID)
router.post('/inquiry', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user!.id;
    const { targetIdentifier } = req.body;

    if (!targetIdentifier || typeof targetIdentifier !== 'string') {
      return res.status(400).json({ error: 'Recipient QR code or Wallet ID is required' });
    }

    let cleanTarget = targetIdentifier.trim();
    if (cleanTarget.startsWith('WALLET:')) {
      const parts = cleanTarget.split(':');
      // Format: WALLET:walletId
      cleanTarget = parts[1] || parts[2] || cleanTarget;
    }

    let targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { walletId: cleanTarget },
          { walletId: cleanTarget.toUpperCase() },
          { walletId: cleanTarget.replace(/-/g, '') },
          { id: cleanTarget },
          { phone: cleanTarget }
        ]
      },
      select: {
        id: true,
        name: true,
        phone: true,
        walletId: true,
        avatar: true,
        city: true,
        role: true
      }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Recipient wallet account not found. Please verify Wallet ID or QR.' });
    }

    if (targetUser.id === senderId) {
      return res.status(400).json({ error: 'Cannot transfer money to your own wallet account' });
    }

    // Ensure recipient has a unique walletId
    if (!targetUser.walletId) {
      const generated = generateWalletId();
      await prisma.user.update({
        where: { id: targetUser.id },
        data: { walletId: generated }
      });
      targetUser.walletId = generated;
    }

    res.json({
      success: true,
      recipient: {
        id: targetUser.id,
        name: targetUser.name,
        walletId: targetUser.walletId,
        avatar: targetUser.avatar,
        city: targetUser.city,
        role: targetUser.role
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to query recipient wallet' });
  }
});

// 6. Real-time Wallet to Wallet Transfer with E-Slip generation
router.post('/transfer', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user!.id;
    const { targetIdentifier, amount } = req.body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid transfer amount is required' });
    }

    if (!targetIdentifier || typeof targetIdentifier !== 'string') {
      return res.status(400).json({ error: 'Recipient Wallet ID or QR is required' });
    }

    // Parse target identifier: can be "WALLET:walletId", raw walletId, or phone
    let cleanTarget = targetIdentifier.trim();
    if (cleanTarget.startsWith('WALLET:')) {
      const parts = cleanTarget.split(':');
      cleanTarget = parts[1] || parts[2] || cleanTarget;
    }

    // Find recipient by walletId, id, or phone
    let targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { walletId: cleanTarget },
          { walletId: cleanTarget.toUpperCase() },
          { walletId: cleanTarget.replace(/-/g, '') },
          { id: cleanTarget },
          { phone: cleanTarget }
        ]
      }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Recipient wallet account not found' });
    }

    if (targetUser.id === senderId) {
      return res.status(400).json({ error: 'Cannot transfer money to your own wallet' });
    }

    // Ensure targetUser has walletId
    if (!targetUser.walletId) {
      const genId = generateWalletId();
      targetUser = await prisma.user.update({
        where: { id: targetUser.id },
        data: { walletId: genId }
      });
    }

    const referenceId = 'TX' + Date.now().toString().slice(-8) + Math.floor(1000 + Math.random() * 9000);

    // Perform atomic transfer
    const result = await prisma.$transaction(async (tx) => {
      let sender = await tx.user.findUnique({ where: { id: senderId } });
      if (!sender) throw new Error('Sender not found');

      if (!sender.walletId) {
        sender = await tx.user.update({
          where: { id: senderId },
          data: { walletId: generateWalletId() }
        });
      }

      if (sender.walletBalance < numAmount) {
        throw new Error(`Insufficient wallet balance. You have ${sender.walletBalance.toLocaleString()} LAK available.`);
      }

      // 1. Deduct sender
      const updatedSender = await tx.user.update({
        where: { id: senderId },
        data: { walletBalance: { decrement: numAmount } }
      });

      // 2. Credit receiver
      const updatedReceiver = await tx.user.update({
        where: { id: targetUser!.id },
        data: { walletBalance: { increment: numAmount } }
      });

      // 3. Create TRANSFER_OUT record for sender
      const outTx = await tx.walletTransaction.create({
        data: {
          userId: senderId,
          type: 'TRANSFER_OUT',
          amount: numAmount,
          status: 'COMPLETED',
          targetUserId: targetUser!.id,
          accountName: targetUser!.name,
          adminNote: `REF:${referenceId}`
        }
      });

      // 4. Create TRANSFER_IN record for receiver
      const inTx = await tx.walletTransaction.create({
        data: {
          userId: targetUser!.id,
          type: 'TRANSFER_IN',
          amount: numAmount,
          status: 'COMPLETED',
          targetUserId: senderId,
          accountName: sender.name,
          adminNote: `REF:${referenceId}`
        }
      });

      return { updatedSender, updatedReceiver, outTx, inTx, sender };
    });

    const eslip = {
      referenceId,
      transactionId: result.outTx.id,
      dateTime: result.outTx.createdAt,
      amount: numAmount,
      fee: 0,
      debit: {
        userId: senderId,
        name: result.sender.name,
        walletId: result.sender.walletId || `CPW-${senderId.slice(0, 8).toUpperCase()}`,
        avatar: result.sender.avatar
      },
      credit: {
        userId: targetUser.id,
        name: targetUser.name,
        walletId: targetUser.walletId || `CPW-${targetUser.id.slice(0, 8).toUpperCase()}`,
        avatar: targetUser.avatar
      }
    };

    // Realtime Socket.io Notification to both parties
    const io = req.app.get('io');
    if (io) {
      // Notify sender
      io.to(`user_${senderId}`).emit('wallet_updated', {
        balance: result.updatedSender.walletBalance,
        type: 'TRANSFER_OUT',
        amount: numAmount,
        targetName: targetUser.name,
        referenceId
      });

      // Notify receiver immediately
      io.to(`user_${targetUser.id}`).emit('wallet_updated', {
        balance: result.updatedReceiver.walletBalance,
        type: 'TRANSFER_IN',
        amount: numAmount,
        fromName: result.sender.name,
        referenceId
      });
    }

    res.json({
      success: true,
      message: `Successfully transferred ${numAmount.toLocaleString()} LAK to ${targetUser.name}`,
      balance: result.updatedSender.walletBalance,
      eslip
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to complete wallet transfer' });
  }
});

export default router;
