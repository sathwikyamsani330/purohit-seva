export type UserRole = 'customer' | 'priest' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  city?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  city: string;
  gotra?: string;
  createdAt: string;
}

export interface CustomerProfile extends User {
  address?: string;
  preferredLanguage?: string;
  gotra?: string;
  emergencyContact?: string;
  notificationSettings?: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
}

export interface PriestServiceItem {
  id: string;
  eventId: string;
  eventName?: string;
  name?: string;
  description: string;
  price: number; // in INR ₹
  durationHours?: number;
  duration?: string;
  samagriIncluded?: boolean;
  includesSamagri?: boolean;
  homaIncluded?: boolean;
}

export interface PriestAvailabilitySlot {
  id: string;
  date: string; // YYYY-MM-DD
  timeSlots: string[]; // e.g. ["06:00 AM", "08:30 AM", "11:00 AM", "05:00 PM"]
  isBlocked?: boolean;
}

export interface SlotAvailabilityInfo {
  slot: string;
  isBooked: boolean;
  isBlocked: boolean;
  isAvailable: boolean;
  bookingId?: string;
  bookingEventName?: string;
  bookingCustomerName?: string;
  reason?: string;
}

export interface PriestEventAvailability {
  eventId: string;
  eventName?: string;
  allowedDates?: string[];
  allowedSlots?: string[];
  isActive?: boolean;
}

export interface PriestAvailabilitySchedule {
  priestId: string;
  availableDates: string[];
  blockedDates: string[];
  timeSlots: string[];
  customDateSlots?: { [date: string]: string[] };
  eventAvailability?: { [eventId: string]: PriestEventAvailability };
  updatedAt?: string;
}

export interface Priest {
  id: string;
  name: string;
  title: string; // e.g. "Vedic Scholar & Rigveda Acharya"
  avatarUrl: string;
  coverUrl?: string;
  isVerified: boolean;
  verificationStatus: 'verified' | 'pending' | 'rejected' | 'suspended';
  experienceYears: number;
  location: string;
  city: string;
  state?: string;
  languages: string[];
  tradition: string; // e.g., "Smartha", "Vaishnava", "Madhwa", "Shakta"
  gotra?: string;
  rating: number;
  reviewCount: number;
  startingPrice: number;
  about: string;
  education?: string;
  qualifications?: string[];
  phone?: string;
  email?: string;
  services: PriestServiceItem[];
  availableDates: string[]; // YYYY-MM-DD
  availableTimeSlots?: string[];
  timeSlots?: string[];
  blockedDates?: string[];
  customDateSlots?: { [date: string]: string[] };
  eventAvailability?: { [eventId: string]: PriestEventAvailability };
  totalPujasCompleted?: number;
  badge?: string; // "Top Rated", "Veda Scholar", "Most Booked"
}

export interface PujaEvent {
  id: string;
  name: string;
  sanskritName?: string;
  slug?: string;
  category: string;
  shortDescription: string;
  fullDescription: string;
  iconName?: string;
  imageUrl: string;
  priestCount?: number;
  duration?: string;
  typicalDuration?: string;
  basePrice?: number;
  basePriceRange?: string;
  samagriIncluded?: boolean;
  isPopular?: boolean;
  deity?: string;
  significance?: string;
  benefits?: string[];
  inclusions?: string[];
  itemsNeededPreview?: string[];
  isActive?: boolean;
}

export type BookingStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'PRIEST_ON_THE_WAY'
  | 'PRIEST_ARRIVED'
  | 'CEREMONY_STARTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'DISPUTED'
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export interface BookingStatusHistoryEntry {
  id: string;
  bookingId: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  changedByRole: 'CUSTOMER' | 'PRIEST' | 'ADMIN';
  changedByName?: string;
  reason?: string;
  timestamp: string; // ISO string
}

export type SupportIssueReason =
  | "Priest hasn't arrived"
  | 'Priest cannot reach location'
  | 'Incorrect location'
  | 'Ceremony issue'
  | 'Payment issue'
  | 'Other';

export interface BookingSupportRequest {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  priestId: string;
  priestName: string;
  issueReason: SupportIssueReason | string;
  description: string;
  status: 'OPEN' | 'IN_REVIEW' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  resolvedNotes?: string;
}

export type PaymentStatus = 'pending' | 'completed' | 'refunded' | 'failed' | 'PAID' | 'UNPAID';

export type RequestStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_COMPLETED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED';

export type RejectionReason =
  | 'Already booked'
  | 'Not available'
  | 'Location too far'
  | 'Timing unavailable'
  | 'Other';

export interface PriestRequest {
  id: string; // alias for requestId
  requestId?: string; // e.g. "REQ-20260831-4821"
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  priestId: string;
  priestName: string;
  priestAvatar?: string;
  priestImage?: string;
  priestTitle?: string;
  priestRating?: number;
  priestPhone?: string;
  eventId: string;
  eventName: string;
  serviceId?: string;
  serviceName?: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "10:00 AM"
  timeSlot?: string;
  location: string;
  address?: BookingAddress;
  notes: string;
  specialNotes?: string;
  includeSamagri?: boolean;
  servicePrice: number;
  platformFee?: number;
  taxes?: number;
  rewardDiscount?: number;
  appliedRewardId?: string;
  appliedRewardCode?: string;
  totalAmount?: number;
  status: RequestStatus;
  rejectionReason?: RejectionReason | string;
  rejectionNotes?: string;
  bookingId?: string; // Generated only once payment is completed & booking confirmed
  activeOrderId?: string; // Razorpay or Demo Order ID
  paymentMethod?: 'UPI' | 'Card' | 'NetBanking' | 'CashOnPuja';
  paymentStatus?: PaymentStatus;
  createdAt: string;
  updatedAt?: string;
  respondedAt?: string;
}

export type EscrowStatus = 'HELD_IN_ESCROW' | 'READY_FOR_PAYOUT' | 'SETTLED' | 'REFUNDED';

export type PaymentOrderStatus = 'CREATED' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED';

export interface PaymentOrder {
  id: string; // Razorpay Order ID (e.g., order_... or order_DEMO_...)
  orderId: string;
  requestId: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  priestId: string;
  priestName?: string;
  currency: 'INR';
  servicePrice: number;
  platformFee: number;
  rewardDiscount: number;
  totalAmount: number;
  amountInPaise: number;
  status: PaymentOrderStatus;
  paymentId?: string;
  paymentSignature?: string;
  isDemoMode: boolean;
  // Marketplace readiness fields (future-proofed)
  platformCommission?: number;
  priestPayableAmount?: number;
  escrowStatus?: EscrowStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface PaymentWebhookRecord {
  id: string; // x-razorpay-event-id
  event: string;
  orderId?: string;
  paymentId?: string;
  signatureValid: boolean;
  processedAt: string;
  payloadSummary?: Record<string, any>;
}

export type PaymentUIState =
  | 'PAYMENT_REQUIRED'
  | 'ORDER_CREATING'
  | 'GATEWAY_OPEN'
  | 'PAYMENT_PROCESSING'
  | 'VERIFYING'
  | 'PAYMENT_VERIFYING'
  | 'CONFIRMING'
  | 'CONFIRMED'
  | 'PAYMENT_SUCCESSFUL'
  | 'FAILED'
  | 'PAYMENT_FAILED'
  | 'CANCELLED';

// Alias for Request
export type Request = PriestRequest;

export type LoyaltyLevel = 'DEVOTEE' | 'SEVA_MEMBER' | 'SEVA_PLUS' | 'PUROHIT_SEVA_ELITE';

export interface UserRewardsProfile {
  userId: string;
  pointsBalance: number;
  lifetimePoints: number;
  completedBookings: number;
  loyaltyLevel: LoyaltyLevel;
  referralCode: string;
  referredBy?: string;
  totalReferrals?: number;
  updatedAt: string;
}

export type RewardTransactionType = 'EARN' | 'REDEEM' | 'ADJUSTMENT' | 'REFUND' | 'REFERRAL_BONUS';

export interface RewardTransaction {
  id: string;
  userId: string;
  type: RewardTransactionType;
  points: number; // positive for EARN/BONUS, negative for REDEEM
  bookingId?: string;
  rewardId?: string;
  description: string;
  adminId?: string;
  reason?: string;
  createdAt: string;
}

export type RewardStatus = 'AVAILABLE' | 'APPLIED' | 'USED' | 'EXPIRED' | 'CANCELLED';

export interface CustomerReward {
  id: string;
  userId: string;
  rewardType: 'DISCOUNT';
  tierId: string;
  title: string;
  pointsCost: number;
  discountAmount: number;
  minBookingAmount?: number;
  status: RewardStatus;
  rewardCode: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string | null;
  bookingId?: string | null;
}

export interface RewardTier {
  id: string;
  pointsRequired: number;
  discountAmount: number;
  title: string;
  description: string;
  validityDays: number;
  minBookingAmount?: number;
  isActive: boolean;
  iconName?: string;
}

export interface LoyaltyLevelInfo {
  level: LoyaltyLevel;
  name: string;
  minPoints: number;
  maxPoints: number;
  icon: string;
  badgeColor: string;
  tagline: string;
  benefits: string[];
}

export interface RewardsConfig {
  earningRateRupeesPerPoint: number;
  referralPointsReferrer: number;
  referralDiscountReferee: number;
  rewardExpiryDays: number;
  tiers: RewardTier[];
}

export type NotificationCategory =
  | 'BOOKING'
  | 'PAYMENT'
  | 'CEREMONY'
  | 'REVIEW'
  | 'REWARDS'
  | 'SECURITY'
  | 'SUPPORT'
  | 'SYSTEM';

export type NotificationType =
  // Customer notifications
  | 'REQUEST_SUBMITTED'
  | 'REQUEST_SENT'
  | 'REQUEST_ACCEPTED'
  | 'REQUEST_REJECTED'
  | 'PAYMENT_REQUIRED'
  | 'PAYMENT_SUCCESSFUL'
  | 'PAYMENT_COMPLETED'
  | 'BOOKING_CONFIRMED'
  | 'PRIEST_ON_THE_WAY'
  | 'PRIEST_ARRIVED'
  | 'CEREMONY_STARTED'
  | 'CEREMONY_COMPLETED'
  | 'BOOKING_COMPLETED'
  | 'BOOKING_CANCELLED'
  | 'REFUND_UPDATED'
  | 'REVIEW_AVAILABLE'
  | 'POINTS_EARNED'
  | 'REWARD_REDEEMED'
  | 'REWARD_UNLOCKED'
  | 'LEVEL_UPGRADE'
  | 'REWARD_EXPIRING'
  | 'REFERRAL_BONUS'
  | 'SUPPORT_UPDATED'
  | 'REPEAT_BOOKING_STATUS'
  // Priest notifications
  | 'PRIEST_NEW_REQUEST'
  | 'PRIEST_REQUEST_CANCELLED'
  | 'PRIEST_REQUEST_ACCEPTED'
  | 'PRIEST_PAYMENT_RECEIVED'
  | 'PRIEST_BOOKING_CONFIRMED'
  | 'PRIEST_CEREMONY_UPCOMING'
  | 'PRIEST_REVIEW_RECEIVED'
  | 'PRIEST_ISSUE_REPORTED'
  | 'PRIEST_REPORT_UPDATE'
  | 'PRIEST_STATUS_CHANGE'
  // Admin operational alerts
  | 'ADMIN_PRIEST_APPLICATION'
  | 'ADMIN_BOOKING_ISSUE'
  | 'ADMIN_PROTECTION_REPORT'
  | 'ADMIN_DISPUTE'
  | 'ADMIN_PAYMENT_ISSUE'
  | 'ADMIN_REFUND_ISSUE'
  | 'ADMIN_SUSPICIOUS_ACTIVITY'
  | 'ADMIN_POLICY_EVENT'
  // System & alerts
  | 'SYSTEM_ALERT'
  | 'REPORT_UPDATE'
  | 'CEREMONY_REMINDER'
  // Legacy compatibility
  | 'request_received'
  | 'request_accepted'
  | 'request_rejected'
  | 'payment_completed'
  | 'booking_confirmed';

export interface AppNotification {
  id: string;
  userId: string;
  targetRole?: 'customer' | 'priest' | 'admin' | 'all';
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  priority?: 'normal' | 'high' | 'urgent';
  requestId?: string;
  bookingId?: string;
  reportId?: string;
  link?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreferences {
  userId: string;
  // Customizable Non-Critical Notifications
  promotional: boolean;
  rewards: boolean;
  generalUpdates: boolean;
  // Critical Transactional Notifications (Permanently Enabled)
  bookingUpdates: boolean;
  paymentAlerts: boolean;
  securityAndSafety: boolean;
  // Delivery Channels
  inApp: boolean;
  sms: boolean;
  whatsapp: boolean;
  email: boolean;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderName: string;
  senderRole: 'customer' | 'priest';
  text: string;
  timestamp: string;
  read: boolean;
}

export interface BookingAddress {
  houseNumber?: string;
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  fullAddress?: string;
  latitude?: number;
  longitude?: number;
}

export interface BookingDraft {
  bookingId?: string;
  requestId?: string;
  planId?: string;
  ceremonyPlanId?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  priestId: string;
  priestName: string;
  priestImage?: string;
  priestAvatar?: string;
  priestTitle?: string;
  priestRating?: number;
  priestReviewCount?: number;
  priestExperienceYears?: number;
  priestIsVerified?: boolean;
  priestLanguages?: string[];
  eventId: string;
  eventName: string;
  serviceId?: string;
  serviceName: string;
  serviceDescription?: string;
  servicePrice: number;
  includeSamagri?: boolean;
  samagriPrice?: number;
  date: string;
  time: string;
  timeSlot?: string;
  location: {
    street: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
    fullAddress?: string;
    latitude?: number;
    longitude?: number;
  } | string;
  address?: BookingAddress;
  notes?: string;
  specialNotes?: string;
  serviceCharge: number;
  platformFee: number;
  taxes?: number;
  rewardDiscount?: number;
  appliedRewardId?: string;
  appliedRewardCode?: string;
  totalAmount: number;
  paymentMethod?: 'UPI' | 'Card' | 'NetBanking' | 'CashOnPuja';
  status?: BookingStatus;
  bookingStatus?: BookingStatus;
  paymentStatus?: PaymentStatus;
}

export interface Booking {
  id: string;
  bookingId?: string; // e.g. PS-20260831-4821
  requestId?: string; // link to source PriestRequest
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  priestId: string;
  priestName: string;
  priestAvatar?: string;
  priestImage?: string; // alias
  priestTitle?: string;
  priestRating?: number;
  priestPhone?: string;
  eventId: string;
  eventName: string;
  serviceId?: string;
  serviceName?: string;
  date: string; // YYYY-MM-DD
  time?: string; // e.g. "10:00 AM"
  timeSlot?: string;
  location?: string;
  address?: BookingAddress;
  latitude?: number;
  longitude?: number;
  notes?: string;
  specialNotes?: string;
  specialInstructions?: string;
  samagriOpted?: boolean;
  servicePrice?: number;
  serviceCharge?: number;
  subtotal?: number;
  baseAmount?: number;
  dakshinaAmount?: number;
  platformFee: number;
  taxes?: number;
  rewardDiscount?: number;
  appliedRewardId?: string;
  appliedRewardCode?: string;
  totalAmount: number;
  pointsAwarded?: boolean;
  pointsEarned?: number;
  status: BookingStatus;
  bookingStatus?: BookingStatus; // CONFIRMED | COMPLETED | CANCELLED
  paymentStatus: PaymentStatus | string;
  paymentMethod?: 'UPI' | 'Card' | 'NetBanking' | 'CashOnPuja' | 'Credit Card' | 'Cash on Puja' | string;
  paymentId?: string;
  orderId?: string;
  isDemoPayment?: boolean;
  platformCommission?: number;
  priestPayableAmount?: number;
  escrowStatus?: EscrowStatus;
  refundId?: string;
  refundAmount?: number;
  refundedAt?: string;
  createdAt: string;
  updatedAt?: string;
  acceptedAt?: string;
  paidAt?: string;
  confirmedAt?: string;
  journeyStartedAt?: string;
  arrivedAt?: string;
  ceremonyStartedAt?: string;
  completedAt?: string;
  completedBy?: string;
  statusHistory?: BookingStatusHistoryEntry[];
  cancellationReason?: string;
  customerReview?: {
    rating: number;
    comment: string;
    createdAt: string;
  };
  ratingGiven?: number;
  reviewGiven?: string;
}

export type ConfirmedBooking = Booking;

export interface Review {
  id: string;
  priestId: string;
  priestName?: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  bookingId?: string;
  eventName: string;
  rating: number;
  comment: string;
  date: string;
  location: string;
}

export interface Transaction {
  id: string;
  bookingId: string;
  priestId: string;
  priestName: string;
  customerName: string;
  eventName: string;
  amount: number;
  payoutAmount: number;
  platformFee: number;
  status: 'completed' | 'processing' | 'pending';
  date: string;
  type: 'booking_credit' | 'payout_withdrawal' | 'refund_debit';
}

export interface AdminStats {
  totalCustomers: number;
  totalPriests: number;
  verifiedPriests: number;
  pendingPriests: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  recentActivityCount: number;
}

// --- PUROHIT SEVA PROTECTION & ANTI-BYPASS TYPES ---

export type ReportCategory =
  | 'PRIEST_ASKED_DIRECT_PAY'
  | 'PRIEST_OFFERED_CHEAPER_OFF_PLATFORM'
  | 'PRIEST_ASKED_CANCEL_PRIVATE'
  | 'PRIEST_REQUESTED_OFF_PLATFORM_PAYMENT'
  | 'CUSTOMER_PROPOSED_OFF_PLATFORM'
  | 'SUSPICIOUS_BEHAVIOR'
  | 'OTHER';

export type ReportStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';

export interface Report {
  id: string;
  bookingId?: string;
  requestId?: string;
  reporterId: string;
  reporterName?: string;
  reporterEmail?: string;
  reportedUserId: string;
  reportedUserName?: string;
  reporterRole: 'customer' | 'priest';
  category: ReportCategory | string;
  categoryLabel?: string;
  description: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  adminNotes?: string;
  actionTaken?: 'WARNING_ISSUED' | 'ACCOUNT_FLAGGED' | 'ACCOUNT_SUSPENDED' | 'DISMISSED_NO_ACTION' | 'RESOLVED';
}

export type PolicyViolationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PolicyViolation {
  id: string;
  userId: string;
  userName?: string;
  userRole?: 'customer' | 'priest';
  bookingId?: string;
  violationType: string;
  severity: PolicyViolationSeverity;
  evidence?: string;
  createdAt: string;
  resolvedBy: string;
  notes?: string;
}

export type PriestTrustTier = 'HIGHLY_TRUSTED' | 'TRUSTED' | 'VERIFIED';

export interface PriestTrustBadgeInfo {
  tier: PriestTrustTier;
  label: 'Highly Trusted' | 'Trusted Priest' | 'Verified Priest';
  description: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  metrics: {
    completedBookings: number;
    rating: number;
    reviewCount: number;
    cancellationRatePercent: number;
    violationCount: number;
  };
}

export interface PriestPolicyAcknowledgement {
  priestId: string;
  acknowledgedAt: string;
  version: string;
  agreedToTerms: boolean;
}

// --- AI CEREMONY PLANNER TYPES ---

export type SamagriCategory =
  | 'Puja Essentials'
  | 'Flowers & Leaves'
  | 'Fruits & Offerings'
  | 'Homa & Hawan Samagri'
  | 'Vessels & Setup'
  | 'Other Items';

export interface SamagriItem {
  id: string;
  name: string;
  quantity?: string;
  category: SamagriCategory;
  checked: boolean;
  isOptional?: boolean;
  isCustom?: boolean;
  notes?: string;
}

export interface RitualStep {
  step: number;
  name: string;
  description: string;
  durationMinutes?: number;
  isOptional?: boolean;
}

export interface PreparationTimeline {
  sevenDaysBefore: string[];
  oneOrTwoDaysBefore: string[];
  ceremonyDay: string[];
}

export interface PriestRequirements {
  priestCount: number;
  suggestedExpertise: string[];
  languagePreference: string;
  notes?: string;
}

export interface EstimatedBudget {
  min: number;
  max: number;
  currency: string;
  isApproximate: boolean;
  note: string;
}

export type CeremonyPlanStatus = 'planning' | 'priest_requested' | 'confirmed' | 'completed';

export interface CeremonyPlan {
  id: string;
  userId: string;
  title: string;
  ceremonyType: string;
  eventDetails: {
    rawQuery?: string;
    purpose: string;
    description: string;
    significance?: string;
  };
  location: string;
  date: string;
  guestCount: number | string;
  language: string;
  tradition: string;
  rituals: {
    mainRituals: string[];
    optionalRituals: string[];
    sequence: RitualStep[];
  };
  samagri: {
    requiredItems: SamagriItem[];
    optionalItems: SamagriItem[];
  };
  preparationSteps: PreparationTimeline;
  priestRequirements: PriestRequirements;
  estimatedDuration: string;
  estimatedBudget: EstimatedBudget;
  readinessPercentage: number;
  status: CeremonyPlanStatus;
  matchedPriestId?: string;
  bookingId?: string;
  disclaimer: string;
  createdAt: string;
  updatedAt: string;
}

export interface CeremonyPlannerInput {
  rawQuery?: string;
  eventType?: string;
  location?: string;
  date?: string;
  guestCount?: number | string;
  language?: string;
  tradition?: string;
  budgetRange?: string;
  specialRequirements?: string;
}

export interface AIClarificationResponse {
  isAmbiguous: boolean;
  suggestedCeremonyType?: string;
  greeting?: string;
  clarificationQuestion?: string;
  quickOptions?: string[];
  detectedInfo?: Partial<CeremonyPlannerInput>;
}
