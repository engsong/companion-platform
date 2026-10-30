import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './modules/auth/auth.routes';
import companionRoutes from './modules/companion/companion.routes';
import kycRoutes from './modules/kyc/kyc.routes';
import postRoutes from './modules/posts/posts.routes';
import bookingRoutes from './modules/bookings/bookings.routes';
import paymentRoutes from './modules/payments/payments.routes';
import chatRoutes from './modules/chat/chat.routes';
import adminRoutes from './modules/admin/admin.routes';
import { inspectMessageContent } from './middleware/chatFilter';
import { prisma } from './config/prisma';

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'companion-platform-api', time: new Date() });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/companions', companionRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

// Realtime WebSocket Chat
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // User joins their personal room to receive private messages and alerts
  socket.on('join_user', (userId: string) => {
    socket.join(`user_${userId}`);
    console.log(`[Socket.io] User joined room: user_${userId}`);
  });

  // User joins a booking room
  socket.on('join_booking', (bookingId: string) => {
    socket.join(`booking_${bookingId}`);
    console.log(`[Socket.io] Socket joined booking room: booking_${bookingId}`);
  });

  // Real-time chat message with anti-leak filtering
  socket.on('send_message', async (data: {
    senderId: string;
    receiverId: string;
    content: string;
    bookingId?: string;
    messageType?: string;
  }) => {
    try {
      const { senderId, receiverId, content, bookingId, messageType = 'TEXT' } = data;

      // 1. Inspect and filter content for phone numbers, bank accounts, and off-platform keywords
      const filterResult = inspectMessageContent(content);

      // 2. Save message in DB
      const message = await prisma.chatMessage.create({
        data: {
          senderId,
          receiverId,
          bookingId: bookingId || null,
          content: filterResult.censoredContent,
          messageType,
          isBlocked: filterResult.isBlocked,
          blockedReason: filterResult.reasons.join(', ') || null
        },
        include: {
          sender: { select: { id: true, name: true, avatar: true } }
        }
      });

      // 3. Emit message to both sender and receiver rooms
      io.to(`user_${receiverId}`).emit('new_message', message);
      socket.emit('message_sent', {
        message,
        securityWarning: filterResult.isBlocked
          ? 'Off-platform contact or payment details detected and censored for security.'
          : null
      });

      // If tied to a booking, broadcast to booking room
      if (bookingId) {
        io.to(`booking_${bookingId}`).emit('booking_message', message);
      }
    } catch (err: any) {
      console.error('[Socket.io] Error sending message:', err);
      socket.emit('error', { message: 'Failed to process message' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Companion Platform Backend running on http://localhost:${PORT}`);
});
