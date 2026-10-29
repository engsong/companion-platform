import { Router, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticateToken, AuthRequest } from '../../middleware/auth';

const router = Router();

// Create Booking Offer
router.post('/offer', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const {
      companionId,
      activityType = 'DRINK',
      venueName,
      venueAddress,
      eventDate,
      startTime,
      durationHours = 3,
      totalAmount
    } = req.body;

    if (!companionId || !venueName || !eventDate || !startTime || !totalAmount) {
      return res.status(400).json({ error: 'Missing required booking details (companionId, venueName, eventDate, startTime, totalAmount)' });
    }

    const clientId = req.user!.id;

    // Check if companion exists
    const companion = await prisma.user.findUnique({
      where: { id: companionId },
      include: { companion: true }
    });

    if (!companion || !companion.companion) {
      return res.status(404).json({ error: 'Companion not found' });
    }

    // Default 15% platform fee
    const feeRateSetting = await prisma.systemSetting.findUnique({ where: { key: 'PLATFORM_FEE_PERCENT' } });
    const feePercent = feeRateSetting ? Number(feeRateSetting.value) : 15;
    
    const amount = Number(totalAmount);
    const platformFee = Math.round(amount * (feePercent / 100));
    const companionPayout = amount - platformFee;

    const refCode = `BK-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const booking = await prisma.booking.create({
      data: {
        refCode,
        clientId,
        companionId,
        activityType,
        venueName,
        venueAddress,
        eventDate,
        startTime,
        durationHours: Number(durationHours),
        totalAmount: amount,
        platformFee,
        companionPayout,
        status: 'OFFER_SENT'
      },
      include: {
        client: { select: { id: true, name: true, phone: true, avatar: true } },
        companion: { select: { id: true, name: true, phone: true, avatar: true } }
      }
    });

    // Automatically send an OFFER_CARD message in chat
    await prisma.chatMessage.create({
      data: {
        senderId: clientId,
        receiverId: companionId,
        bookingId: booking.id,
        content: `Booking Offer: ${activityType} at ${venueName} on ${eventDate} @ ${startTime} (${durationHours}h) - ${amount.toLocaleString()} LAK`,
        messageType: 'OFFER_CARD'
      }
    });

    res.status(201).json({ message: 'Booking offer created and sent', booking });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create booking offer' });
  }
});

// Accept Booking Offer (The other party accepts the agreement)
router.post('/:bookingId/accept', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user!.id;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Must be either client or companion to accept
    if (booking.clientId !== userId && booking.companionId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to accept this booking' });
    }

    if (booking.status !== 'OFFER_SENT') {
      return res.status(400).json({ error: `Cannot accept booking in status: ${booking.status}` });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'OFFER_ACCEPTED' },
      include: {
        client: { select: { id: true, name: true, avatar: true } },
        companion: { select: { id: true, name: true, avatar: true } }
      }
    });

    // Notify in chat
    await prisma.chatMessage.create({
      data: {
        senderId: userId,
        receiverId: userId === booking.clientId ? booking.companionId : booking.clientId,
        bookingId: booking.id,
        content: `Booking agreement accepted! Client please proceed with QR bank payment upload to lock the date.`,
        messageType: 'SYSTEM_ALERT'
      }
    });

    res.json({ message: 'Booking offer accepted', booking: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to accept booking' });
  }
});

// Venue Check-in (Client or Companion)
router.post('/:bookingId/checkin', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user!.id;

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (booking.status !== 'CONFIRMED_ESCROW' && booking.status !== 'CHECKED_IN') {
      return res.status(400).json({ error: 'Booking must be CONFIRMED_ESCROW to check in' });
    }

    const isClient = booking.clientId === userId;
    const isCompanion = booking.companionId === userId;

    if (!isClient && !isCompanion) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const dataToUpdate: any = {};
    if (isClient) dataToUpdate.clientCheckInAt = new Date();
    if (isCompanion) dataToUpdate.companionCheckInAt = new Date();

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        ...dataToUpdate,
        status: 'CHECKED_IN'
      }
    });

    res.json({ message: 'Checked in at venue', booking: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to check in' });
  }
});

// Complete Booking (Release payout to Companion's wallet balance)
router.post('/:bookingId/complete', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user!.id;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Usually client marks as complete or companion requests complete
    if (booking.clientId !== userId && booking.companionId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (booking.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Booking is already completed' });
    }

    // Complete booking and credit companion wallet
    const [updatedBooking, updatedCompanion] = await prisma.$transaction([
      prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      }),
      prisma.user.update({
        where: { id: booking.companionId },
        data: {
          walletBalance: { increment: booking.companionPayout }
        }
      })
    ]);

    res.json({
      message: 'Booking completed successfully. Escrow funds released to companion wallet.',
      booking: updatedBooking,
      companionWallet: updatedCompanion.walletBalance
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to complete booking' });
  }
});

// Get My Bookings (Client or Companion)
router.get('/my', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [{ clientId: userId }, { companionId: userId }]
      },
      include: {
        client: { select: { id: true, name: true, phone: true, avatar: true } },
        companion: { select: { id: true, name: true, phone: true, avatar: true } },
        paymentSlip: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ bookings });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch bookings' });
  }
});

// Get Booking Detail by ID
router.get('/:bookingId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: { select: { id: true, name: true, phone: true, avatar: true } },
        companion: { select: { id: true, name: true, phone: true, avatar: true } },
        paymentSlip: true
      }
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json({ booking });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch booking detail' });
  }
});

export default router;
