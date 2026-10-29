import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticateToken, AuthRequest } from '../../middleware/auth';

const router = Router();

// Get list of active and verified companions
router.get('/', async (req: Request, res: Response) => {
  try {
    const { activity, city, search, minPrice, maxPrice } = req.query;

    const companions = await prisma.companionProfile.findMany({
      where: {
        isAvailable: true,
        user: {
          isBanned: false,
          ...(city ? { city: String(city) } : {}),
          ...(search ? {
            OR: [
              { name: { contains: String(search) } },
              { bio: { contains: String(search) } }
            ]
          } : {})
        },
        ...(activity ? {
          services: { contains: String(activity).toUpperCase() }
        } : {}),
        ...(minPrice || maxPrice ? {
          hourlyRate: {
            ...(minPrice ? { gte: Number(minPrice) } : {}),
            ...(maxPrice ? { lte: Number(maxPrice) } : {})
          }
        } : {})
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            city: true,
            gender: true,
            bio: true,
            isVerified: true
          }
        }
      },
      orderBy: { rating: 'desc' }
    });

    res.json({ companions });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch companions' });
  }
});

// Get companion detail by User ID
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const companion = await prisma.companionProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            city: true,
            gender: true,
            bio: true,
            isVerified: true,
            createdAt: true,
            posts: {
              where: { isApproved: true },
              orderBy: { createdAt: 'desc' },
              take: 12
            }
          }
        }
      }
    });

    if (!companion) {
      return res.status(404).json({ error: 'Companion not found' });
    }

    res.json({ companion });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch companion profile' });
  }
});

// Update own companion profile
router.put('/me/settings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { hourlyRate, eventRate, services, height, languages, isAvailable } = req.body;

    const updated = await prisma.companionProfile.upsert({
      where: { userId: req.user!.id },
      update: {
        ...(hourlyRate !== undefined && { hourlyRate: Number(hourlyRate) }),
        ...(eventRate !== undefined && { eventRate: Number(eventRate) }),
        ...(services !== undefined && { services }),
        ...(height !== undefined && { height: Number(height) }),
        ...(languages !== undefined && { languages }),
        ...(isAvailable !== undefined && { isAvailable: Boolean(isAvailable) })
      },
      create: {
        userId: req.user!.id,
        hourlyRate: Number(hourlyRate) || 250000,
        eventRate: Number(eventRate) || 1000000,
        services: services || 'DRINK,PARTY,DINNER',
        height: height ? Number(height) : null,
        languages: languages || 'Lao, Thai, English',
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true
      }
    });

    res.json({ message: 'Companion settings updated', companion: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update companion settings' });
  }
});

export default router;
