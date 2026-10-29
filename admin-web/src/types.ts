export interface AdminStats {
  totalUsers: number;
  totalCompanions: number;
  pendingKycCount: number;
  pendingSlipCount: number;
  totalBookings: number;
  activeBookings: number;
  totalRevenue: number;
  totalGrossVolume: number;
}

export interface KycApplicant {
  id: string;
  userId: string;
  hourlyRate: number;
  eventRate: number;
  services: string;
  kycStatus: string;
  kycIdCardUrl: string | null;
  kycSelfieUrl: string | null;
  kycNote: string | null;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    phone: string;
    avatar: string | null;
    city: string;
    gender: string | null;
    createdAt: string;
  };
}

export interface PaymentSlipItem {
  id: string;
  bookingId: string;
  slipUrl: string;
  amount: number;
  bankRef: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  booking: {
    id: string;
    refCode: string;
    totalAmount: number;
    platformFee: number;
    companionPayout: number;
    activityType: string;
    venueName: string;
    eventDate: string;
    startTime: string;
    durationHours: number;
    status: string;
    client: { id: string; name: string; phone: string };
    companion: { id: string; name: string; phone: string };
  };
}

export interface BookingRecord {
  id: string;
  refCode: string;
  status: string;
  activityType: string;
  venueName: string;
  eventDate: string;
  startTime: string;
  durationHours: number;
  totalAmount: number;
  platformFee: number;
  companionPayout: number;
  createdAt: string;
  client: { id: string; name: string; phone: string };
  companion: { id: string; name: string; phone: string };
  paymentSlip: { id: string; status: string; slipUrl: string } | null;
}

export interface SystemSettings {
  PLATFORM_FEE_PERCENT?: string;
  COMPANY_BANK_NAME?: string;
  COMPANY_BANK_ACCOUNT?: string;
  COMPANY_ACCOUNT_NAME?: string;
  COMPANY_QR_IMAGE?: string;
  [key: string]: string | undefined;
}
