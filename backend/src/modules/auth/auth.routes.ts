import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { uploadAvatar, uploadBankQr, uploadCover } from '../../middleware/upload';
import { generateWalletId } from '../../utils/walletId';

const router = Router();

// Register User
router.post('/register', uploadBankQr.single('bankQr'), async (req: Request, res: Response) => {
  try {
    const { phone, password, name, role = 'CLIENT', gender, city = 'Vientiane', bio } = req.body;

    if (!phone || !password || !name) {
      return res.status(400).json({ error: 'Phone, password, and name are required' });
    }

    let bankQrUrl: string | undefined = undefined;
    if (req.file) {
      bankQrUrl = `/uploads/bankqr/${req.file.filename}`;
    } else if (req.body.bankQrUrl) {
      bankQrUrl = req.body.bankQrUrl;
    }

    if (!bankQrUrl) {
      return res.status(400).json({ error: 'Bank QR image is required to complete registration' });
    }

    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const walletId = generateWalletId();

    const user = await prisma.user.create({
      data: {
        phone,
        passwordHash,
        name,
        role,
        gender,
        city,
        bio,
        walletId,
        bankQrUrl,
        // If registering as companion, automatically create companion profile entry
        ...(role === 'COMPANION' ? {
          companion: {
            create: {
              services: 'DRINK,PARTY,DINNER',
              hourlyRate: 250000,
              eventRate: 1000000,
              kycStatus: 'NOT_SUBMITTED'
            }
          }
        } : {})
      },
      include: {
        companion: true
      }
    });

    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      process.env.JWT_SECRET || 'super-secret-companion-app-key-2026',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        city: user.city,
        walletId: user.walletId,
        bankQrUrl: user.bankQrUrl,
        isVerified: user.isVerified,
        walletBalance: user.walletBalance,
        companion: user.companion
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { phone },
      include: { companion: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Your account has been banned due to policy violation' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }

    let currentUser = user;
    if (!currentUser.walletId) {
      currentUser = await prisma.user.update({
        where: { id: user.id },
        data: { walletId: generateWalletId() },
        include: { companion: true }
      });
    }

    const token = jwt.sign(
      { id: currentUser.id, phone: currentUser.phone, role: currentUser.role },
      process.env.JWT_SECRET || 'super-secret-companion-app-key-2026',
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: currentUser.id,
        phone: currentUser.phone,
        name: currentUser.name,
        role: currentUser.role,
        avatar: currentUser.avatar,
        bio: currentUser.bio,
        city: currentUser.city,
        walletId: currentUser.walletId,
        bankQrUrl: currentUser.bankQrUrl,
        isVerified: currentUser.isVerified,
        walletBalance: currentUser.walletBalance,
        companion: currentUser.companion
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    let user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { companion: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.walletId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { walletId: generateWalletId() },
        include: { companion: true }
      });
    }

    res.json({
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        gender: user.gender,
        city: user.city,
        walletId: user.walletId,
        bankQrUrl: user.bankQrUrl,
        isVerified: user.isVerified,
        walletBalance: user.walletBalance,
        companion: user.companion
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch user' });
  }
});

// Upload / Update User Bank QR
router.post('/bank-qr', authenticateToken, uploadBankQr.single('bankQr'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    let bankQrUrl: string | undefined = undefined;
    if (req.file) {
      bankQrUrl = `/uploads/bankqr/${req.file.filename}`;
    } else if (req.body.bankQrUrl) {
      bankQrUrl = req.body.bankQrUrl;
    }

    if (!bankQrUrl) {
      return res.status(400).json({ error: 'Bank QR image is required' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { bankQrUrl }
    });

    res.json({ message: 'Bank QR updated successfully', bankQrUrl: updated.bankQrUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update Bank QR' });
  }
});

// Update profile / avatar
router.patch('/profile', authenticateToken, uploadAvatar.single('avatar'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, bio, city, gender } = req.body;
    const avatarUrl = req.file ? `/uploads/avatars/${req.file.filename}` : undefined;

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(name && { name }),
        ...(bio !== undefined && { bio }),
        ...(city && { city }),
        ...(gender && { gender }),
        ...(avatarUrl && { avatar: avatarUrl })
      },
      include: { companion: true }
    });

    res.json({ message: 'Profile updated', user: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update profile' });
  }
});

// Get user profile detail (any user, Facebook style with timeline posts)
router.get('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatar: true,
        coverImage: true,
        bio: true,
        gender: true,
        city: true,
        role: true,
        isVerified: true,
        walletId: true,
        createdAt: true,
        companion: true,
        posts: {
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                city: true,
                isVerified: true,
                role: true
              }
            },
            likes: { select: { userId: true } },
            comments: {
              include: {
                user: { select: { id: true, name: true, avatar: true } }
              },
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const getOnlineUserIds: (() => string[]) | undefined = req.app.get('getOnlineUserIds');
    const onlineIds = new Set(getOnlineUserIds ? getOnlineUserIds() : []);
    const isOnline = onlineIds.has(user.id);

    const totalLikes = user.posts.reduce((acc, p) => acc + p.likesCount, 0);

    // Check friendship status & count
    let isFriend = false;
    let friendCount = 0;
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (token) {
        try {
          const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-companion-app-key-2026');
          if (decoded?.id && decoded.id !== userId) {
            const existing = await prisma.friendship.findFirst({
              where: {
                OR: [
                  { requesterId: decoded.id, receiverId: userId },
                  { requesterId: userId, receiverId: decoded.id }
                ],
                status: 'ACCEPTED'
              }
            });
            isFriend = !!existing;
          }
        } catch (_) {}
      }
      friendCount = await prisma.friendship.count({
        where: {
          OR: [
            { requesterId: userId, status: 'ACCEPTED' },
            { receiverId: userId, status: 'ACCEPTED' }
          ]
        }
      });
    } catch (_) {}

    res.json({
      profile: {
        ...user,
        coverImage: user.coverImage || 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200',
        isOnline,
        isFriend,
        friendCount,
        stats: {
          totalPosts: user.posts.length,
          totalLikes
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch user profile' });
  }
});

// Toggle Add / Remove Friend
router.post('/friends/:targetUserId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user!.id;
    const { targetUserId } = req.params;

    if (currentUserId === targetUserId) {
      return res.status(400).json({ error: 'Cannot add yourself as a friend' });
    }

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: currentUserId, receiverId: targetUserId },
          { requesterId: targetUserId, receiverId: currentUserId }
        ]
      }
    });

    let isFriend = false;
    if (existing) {
      // Toggle / remove friend
      await prisma.friendship.delete({ where: { id: existing.id } });
      isFriend = false;
    } else {
      // Add friend
      await prisma.friendship.create({
        data: {
          requesterId: currentUserId,
          receiverId: targetUserId,
          status: 'ACCEPTED'
        }
      });
      isFriend = true;
    }

    const friendCount = await prisma.friendship.count({
      where: {
        OR: [
          { requesterId: targetUserId, status: 'ACCEPTED' },
          { receiverId: targetUserId, status: 'ACCEPTED' }
        ]
      }
    });

    res.json({
      message: isFriend ? 'Friend added successfully' : 'Unfriended successfully',
      isFriend,
      friendCount
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update friendship' });
  }
});

// Upload User Cover Photo
router.post('/cover', authenticateToken, uploadCover.single('cover'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    let coverUrl: string | undefined = undefined;
    if (req.file) {
      coverUrl = `/uploads/covers/${req.file.filename}`;
    } else if (req.body.coverUrl) {
      coverUrl = req.body.coverUrl;
    }

    if (!coverUrl) {
      return res.status(400).json({ error: 'Cover photo image is required' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { coverImage: coverUrl }
    });

    res.json({ message: 'Cover photo updated successfully', coverImage: updated.coverImage });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update cover photo' });
  }
});

export default router;
