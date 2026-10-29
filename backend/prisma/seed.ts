import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. System Settings
  const settings = [
    { key: 'PLATFORM_FEE_PERCENT', value: '15' },
    { key: 'COMPANY_BANK_NAME', value: 'Banque Pour Le Commerce Exterieur Lao (BCEL)' },
    { key: 'COMPANY_BANK_ACCOUNT', value: '010-12-00-01234567-001' },
    { key: 'COMPANY_ACCOUNT_NAME', value: 'COMPANION PLATFORM SOLE CO., LTD' },
    { key: 'COMPANY_QR_IMAGE', value: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60' }
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s
    });
  }

  // 2. Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { phone: '02099999999' },
    update: {},
    create: {
      phone: '02099999999',
      email: 'admin@platform.com',
      passwordHash: adminPassword,
      name: 'System Super Admin',
      role: 'ADMIN',
      city: 'Vientiane',
      isVerified: true
    }
  });

  // 3. Client User
  const clientPassword = await bcrypt.hash('pass123', 10);
  const client = await prisma.user.upsert({
    where: { phone: '02088888888' },
    update: {},
    create: {
      phone: '02088888888',
      email: 'client@example.com',
      passwordHash: clientPassword,
      name: 'Somphone VIP',
      role: 'CLIENT',
      gender: 'Male',
      city: 'Vientiane',
      bio: 'Loves rooftop bars, craft cocktails and live music.',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
      walletBalance: 2000000
    }
  });

  // 4. Companions
  const companionPassword = await bcrypt.hash('pass123', 10);

  // Companion 1: Mina (Verified)
  const mina = await prisma.user.upsert({
    where: { phone: '02077777777' },
    update: {},
    create: {
      phone: '02077777777',
      email: 'mina@example.com',
      passwordHash: companionPassword,
      name: 'Mina Keomany',
      role: 'COMPANION',
      gender: 'Female',
      city: 'Vientiane',
      isVerified: true,
      bio: 'Enthusiastic and polite. Friendly partner for dinner dates, wine parties, and corporate social events.',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
      companion: {
        create: {
          hourlyRate: 350000,
          eventRate: 1500000,
          services: 'DRINK,PARTY,DINNER,MOVIE',
          height: 168,
          languages: 'Lao, Thai, English',
          kycStatus: 'APPROVED',
          kycIdCardUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400',
          kycSelfieUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
          rating: 4.9,
          reviewCount: 38
        }
      }
    }
  });

  // Companion 2: Alex (Pending KYC - so Admin can test approving it!)
  const alex = await prisma.user.upsert({
    where: { phone: '02077112233' },
    update: {},
    create: {
      phone: '02077112233',
      email: 'alex@example.com',
      passwordHash: companionPassword,
      name: 'Alex Sengchanh',
      role: 'COMPANION',
      gender: 'Male',
      city: 'Vientiane',
      isVerified: false,
      bio: 'Gentleman escort for parties, business dinner meetings, and VIP plus-one.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      companion: {
        create: {
          hourlyRate: 300000,
          eventRate: 1200000,
          services: 'DRINK,PARTY,DINNER',
          height: 180,
          languages: 'Lao, English',
          kycStatus: 'PENDING',
          kycIdCardUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400',
          kycSelfieUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
          rating: 5.0,
          reviewCount: 4
        }
      }
    }
  });

  // 5. Sample Media Posts for Feed
  await prisma.post.createMany({
    data: [
      {
        userId: mina.id,
        caption: 'Friday night chill at Landmark Mekong Riverside 🍸',
        mediaUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
        mediaType: 'IMAGE',
        likesCount: 142
      },
      {
        userId: mina.id,
        caption: 'Ready for tonight corporate banquet and wine pairing 🥂✨',
        mediaUrl: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&auto=format&fit=crop&q=80',
        mediaType: 'IMAGE',
        likesCount: 98
      },
      {
        userId: alex.id,
        caption: 'Cocktail tasting session downtown Vientiane 🥃',
        mediaUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&auto=format&fit=crop&q=80',
        mediaType: 'IMAGE',
        likesCount: 65
      }
    ]
  });

  // 6. Sample Booking with Pending Payment Slip for Admin Approval demo
  const sampleBooking = await prisma.booking.upsert({
    where: { refCode: 'BK-SAMPLE-001' },
    update: {},
    create: {
      refCode: 'BK-SAMPLE-001',
      clientId: client.id,
      companionId: mina.id,
      status: 'PENDING_PAYMENT_VERIFICATION',
      activityType: 'DRINK',
      venueName: 'Senglao Lounge & Bar',
      venueAddress: 'Souphanouvong Road, Vientiane',
      eventDate: '2026-11-02',
      startTime: '19:30',
      durationHours: 3,
      totalAmount: 1050000,
      platformFee: 157500,
      companionPayout: 892500,
      paymentSlip: {
        create: {
          slipUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
          amount: 1050000,
          bankRef: 'BCEL-TXN-9842103',
          status: 'PENDING'
        }
      }
    }
  });

  console.log('✅ Seed completed successfully!');
  console.log('Admin account: 02099999999 / admin123');
  console.log('Client account: 02088888888 / pass123');
  console.log('Companion account: 02077777777 / pass123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
