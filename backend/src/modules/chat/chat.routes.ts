import fs from 'fs';
import { Router, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { inspectMessageContent } from '../../middleware/chatFilter';
import { uploadChatMedia } from '../../middleware/upload';
import { inspectImageContent } from '../../middleware/imageInspection';

const router = Router();

// Get conversation messages between current user and target user
router.get('/messages/:otherUserId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user!.id;
    const { otherUserId } = req.params;

    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: currentUserId }
        ]
      },
      orderBy: { createdAt: 'asc' },
      take: 100
    });

    // Mark messages from other user as read
    await prisma.chatMessage.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: currentUserId,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({ messages });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch messages' });
  }
});

// Get conversations list for current user
router.get('/conversations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Find all unique users exchanged messages with
    const sent = await prisma.chatMessage.findMany({
      where: { senderId: userId },
      select: { receiverId: true },
      distinct: ['receiverId']
    });

    const received = await prisma.chatMessage.findMany({
      where: { receiverId: userId },
      select: { senderId: true },
      distinct: ['senderId']
    });

    const partnerIds = Array.from(
      new Set([...sent.map((s) => s.receiverId), ...received.map((r) => r.senderId)])
    );

    const conversations = await Promise.all(
      partnerIds.map(async (partnerId) => {
        const partner = await prisma.user.findUnique({
          where: { id: partnerId },
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
            isVerified: true,
            city: true
          }
        });

        const lastMessage = await prisma.chatMessage.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: partnerId },
              { senderId: partnerId, receiverId: userId }
            ]
          },
          orderBy: { createdAt: 'desc' }
        });

        const unreadCount = await prisma.chatMessage.count({
          where: {
            senderId: partnerId,
            receiverId: userId,
            isRead: false
          }
        });

        return {
          partner,
          lastMessage,
          unreadCount
        };
      })
    );

    res.json({ conversations });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch conversations' });
  }
});

// Send message via REST API (also triggers anti-leak inspectMessageContent)
router.post('/send', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user!.id;
    const { receiverId, content, messageType = 'TEXT', bookingId } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ error: 'receiverId and content are required' });
    }

    // Inspect content with Anti-Leak & Phone/Account Filter (except safe LOCATION maps links)
    const isLocation = messageType === 'LOCATION';
    const filterResult = isLocation
      ? { isBlocked: false, censoredContent: content, reasons: [] }
      : inspectMessageContent(content);

    const message = await prisma.chatMessage.create({
      data: {
        senderId,
        receiverId,
        bookingId: bookingId || null,
        content: filterResult.censoredContent,
        messageType,
        isBlocked: filterResult.isBlocked,
        blockedReason: filterResult.reasons.join(', ') || null
      }
    });

    res.status(201).json({
      message,
      securityWarning: filterResult.isBlocked
        ? 'Off-platform contact or payment details detected and censored for security.'
        : null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

// Upload image, audio voice note, or file in chat
router.post('/upload', authenticateToken, uploadChatMedia.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user!.id;
    const { receiverId, bookingId, messageType = 'IMAGE' } = req.body;

    if (!receiverId || !req.file) {
      return res.status(400).json({ error: 'receiverId and file are required' });
    }

    // Inspect image uploads for QR payment codes, bank e-slips, and phone numbers (020/030)
    if (req.file.mimetype.startsWith('image/')) {
      const scan = await inspectImageContent(req.file.path);
      if (scan.isBlocked) {
        // Delete prohibited image from server disk immediately
        try {
          if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error('Failed to unlink prohibited file:', e);
        }

        return res.status(400).json({
          error: 'SECURITY_BLOCKED',
          message: 'Security Alert: Payment QR codes, bank transfer slips, and contact numbers (020/030) are blocked. For safety, date payments must be booked through the platform.',
          reasons: scan.reasons
        });
      }
    }

    const fileUrl = `/uploads/chat/${req.file.filename}`;

    const message = await prisma.chatMessage.create({
      data: {
        senderId,
        receiverId,
        bookingId: bookingId || null,
        content: fileUrl,
        messageType: messageType || 'IMAGE',
        isBlocked: false
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } }
      }
    });

    const io = req.app.get('io');
    if (io) {
      // Emit to receiver's room (sender receives it directly via HTTP response body)
      io.to(`user_${receiverId}`).emit('new_message', message);
      if (bookingId) {
        io.to(`booking_${bookingId}`).emit('booking_message', message);
      }
    }

    res.status(201).json({ message });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to upload chat file' });
  }
});

// Get contacts list (all clients & companions with online status)
router.get('/contacts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user!.id;
    const getOnlineUserIds: (() => string[]) | undefined = req.app.get('getOnlineUserIds');
    const onlineIds = new Set(getOnlineUserIds ? getOnlineUserIds() : []);

    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        isBanned: false
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        role: true,
        city: true,
        gender: true,
        bio: true,
        isVerified: true,
        createdAt: true,
        companion: {
          select: {
            hourlyRate: true,
            rating: true,
            services: true,
            isAvailable: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const contacts = users.map((u) => ({
      ...u,
      isOnline: onlineIds.has(u.id)
    }));

    // Sort contacts: online users first, then verified, then others
    contacts.sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      if (a.isVerified && !b.isVerified) return -1;
      if (!a.isVerified && b.isVerified) return 1;
      return 0;
    });

    res.json({ contacts, onlineUserIds: Array.from(onlineIds) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch chat contacts' });
  }
});

export default router;
