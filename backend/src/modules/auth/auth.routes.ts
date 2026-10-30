import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { uploadAvatar } from '../../middleware/upload';
import { generateWalletId } from '../../utils/walletId';

const router = Router();

// Register User
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { phone, password, name, role = 'CLIENT', gender, city = 'Vientiane', bio } = req.body;

    if (!phone || !password || !name) {
      return res.status(400).json({ error: 'Phone, password, and name are required' });
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
        isVerified: user.isVerified,
        walletBalance: user.walletBalance,
        companion: user.companion
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch user' });
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

export default router;
