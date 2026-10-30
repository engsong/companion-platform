export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  avatar: string | null;
  bio?: string;
  city: string;
  gender?: string;
  isVerified: boolean;
  walletBalance: number;
  walletId?: string;
  bankQrUrl?: string | null;
  companion?: {
    id: string;
    hourlyRate: number;
    eventRate: number;
    services: string;
    height?: number;
    languages: string;
    kycStatus: string;
    rating: number;
    reviewCount: number;
  };
}

export interface CompanionCard {
  id: string;
  userId: string;
  hourlyRate: number;
  eventRate: number;
  services: string;
  languages: string;
  rating: number;
  reviewCount: number;
  user: {
    id: string;
    name: string;
    avatar: string | null;
    city: string;
    gender: string | null;
    bio: string | null;
    isVerified: boolean;
  };
}

export interface PostItem {
  id: string;
  userId: string;
  caption: string | null;
  mediaUrl: string;
  mediaType: string;
  likesCount: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
    city: string;
    isVerified: boolean;
  };
  likes: { userId: string }[];
  comments: {
    id: string;
    content: string;
    user: { id: string; name: string; avatar: string | null };
  }[];
}

export interface Booking {
  id: string;
  refCode: string;
  status: string;
  activityType: string;
  venueName: string;
  venueAddress: string | null;
  eventDate: string;
  startTime: string;
  durationHours: number;
  totalAmount: number;
  platformFee: number;
  companionPayout: number;
  client: { id: string; name: string; phone: string; avatar: string | null };
  companion: { id: string; name: string; phone: string; avatar: string | null };
  paymentSlip: { id: string; status: string; slipUrl: string } | null;
}

export interface ChatMsg {
  id: string;
  senderId: string;
  receiverId: string;
  bookingId?: string | null;
  content: string;
  messageType: string;
  isBlocked: boolean;
  blockedReason?: string | null;
  createdAt: string;
}

export interface WalletTx {
  id: string;
  userId: string;
  type: 'TOPUP' | 'WITHDRAW' | 'TRANSFER_OUT' | 'TRANSFER_IN';
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  bankName?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  bankQrUrl?: string | null;
  slipUrl?: string | null;
  adminNote?: string | null;
  targetUser?: { id: string; name: string; phone: string; avatar: string | null } | null;
  createdAt: string;
}

export interface WalletRecipient {
  id: string;
  name: string;
  walletId: string;
  phone?: string;
  avatar?: string | null;
  city?: string;
  role?: string;
}

export interface WalletTransferEslip {
  referenceId: string;
  transactionId: string;
  dateTime: string;
  amount: number;
  fee: number;
  debit: {
    userId: string;
    name: string;
    walletId: string;
    avatar?: string | null;
  };
  credit: {
    userId: string;
    name: string;
    walletId: string;
    avatar?: string | null;
  };
}

