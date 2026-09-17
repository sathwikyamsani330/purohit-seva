import { Booking, BookingStatus } from '../types';

export type CanonicalBookingStatus =
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
  | 'DISPUTED';

/**
 * Normalizes any legacy or lowercase status to a canonical uppercase status.
 */
export function normalizeBookingStatus(status?: string | null): CanonicalBookingStatus {
  if (!status) return 'CONFIRMED';
  const clean = status.trim().toUpperCase();

  switch (clean) {
    case 'PENDING':
      return 'REQUESTED';
    case 'REQUESTED':
    case 'REQUEST_SENT':
      return 'REQUESTED';
    case 'ACCEPTED':
    case 'REQUEST_ACCEPTED':
      return 'ACCEPTED';
    case 'PAYMENT_PENDING':
      return 'PAYMENT_PENDING';
    case 'CONFIRMED':
    case 'PAID':
    case 'BOOKING_CONFIRMED':
      return 'CONFIRMED';
    case 'PRIEST_ON_THE_WAY':
    case 'ON_THE_WAY':
    case 'ONTHEWAY':
      return 'PRIEST_ON_THE_WAY';
    case 'PRIEST_ARRIVED':
    case 'ARRIVED':
      return 'PRIEST_ARRIVED';
    case 'CEREMONY_STARTED':
    case 'IN_PROGRESS':
    case 'STARTED':
      return 'CEREMONY_STARTED';
    case 'COMPLETED':
    case 'CEREMONY_COMPLETED':
      return 'COMPLETED';
    case 'CANCELLED':
    case 'CANCELED':
      return 'CANCELLED';
    case 'REJECTED':
    case 'DECLINED':
      return 'REJECTED';
    case 'REFUND_PENDING':
      return 'REFUND_PENDING';
    case 'REFUNDED':
      return 'REFUNDED';
    case 'DISPUTED':
      return 'DISPUTED';
    default:
      return 'CONFIRMED';
  }
}

/**
 * Visual metadata for display banners, badges, and state indications.
 */
export interface StatusDisplayMeta {
  label: string;
  customerHeadline: string;
  customerSubline: string;
  iconName: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dotColor: string;
  accentColor: string;
}

export function getStatusDisplayMeta(rawStatus?: string | null): StatusDisplayMeta {
  const status = normalizeBookingStatus(rawStatus);

  switch (status) {
    case 'REQUESTED':
      return {
        label: 'Requested',
        customerHeadline: 'Puja Request Submitted',
        customerSubline: 'Awaiting Acharya confirmation and availability schedule.',
        iconName: 'Clock',
        badgeBg: 'bg-[#fdf2f4]',
        badgeBorder: 'border-[#f5ccd2]',
        badgeText: 'text-[#701a28]',
        dotColor: 'bg-[#701a28]',
        accentColor: 'text-[#701a28]'
      };
    case 'ACCEPTED':
      return {
        label: 'Priest Accepted',
        customerHeadline: 'Acharya Accepted Your Request',
        customerSubline: 'Please complete the dakshina payment to lock the auspicious muhurtham.',
        iconName: 'CheckCircle2',
        badgeBg: 'bg-emerald-50',
        badgeBorder: 'border-emerald-200',
        badgeText: 'text-emerald-900',
        dotColor: 'bg-emerald-500',
        accentColor: 'text-emerald-700'
      };
    case 'PAYMENT_PENDING':
      return {
        label: 'Payment Pending',
        customerHeadline: 'Dakshina Advance Pending',
        customerSubline: 'Complete digital payment to confirm your booking and unlock contact info.',
        iconName: 'CreditCard',
        badgeBg: 'bg-[#fbf8ed]',
        badgeBorder: 'border-[#ecd9a3]',
        badgeText: 'text-[#8d591c]',
        dotColor: 'bg-[#c9932b]',
        accentColor: 'text-[#8d591c]'
      };
    case 'CONFIRMED':
      return {
        label: 'Booking Confirmed',
        customerHeadline: '🟢 Booking Confirmed',
        customerSubline: 'Priest is scheduled. Preparation of sacred samagri and muhurtham in place.',
        iconName: 'ShieldCheck',
        badgeBg: 'bg-blue-50',
        badgeBorder: 'border-blue-200',
        badgeText: 'text-blue-900',
        dotColor: 'bg-blue-500',
        accentColor: 'text-blue-700'
      };
    case 'PRIEST_ON_THE_WAY':
      return {
        label: 'Priest On The Way',
        customerHeadline: '🚗 Priest is on the way',
        customerSubline: 'The Acharya has commenced the journey towards your ceremony venue.',
        iconName: 'Car',
        badgeBg: 'bg-[#fdf2f4]',
        badgeBorder: 'border-[#f5ccd2]',
        badgeText: 'text-[#701a28]',
        dotColor: 'bg-[#701a28] animate-ping',
        accentColor: 'text-[#701a28]'
      };
    case 'PRIEST_ARRIVED':
      return {
        label: 'Priest Arrived',
        customerHeadline: '📍 Priest has arrived',
        customerSubline: 'Acharya is at the venue. Preparing mandap and sacred samagri.',
        iconName: 'MapPin',
        badgeBg: 'bg-purple-50',
        badgeBorder: 'border-purple-200',
        badgeText: 'text-purple-900',
        dotColor: 'bg-purple-500',
        accentColor: 'text-purple-700'
      };
    case 'CEREMONY_STARTED':
      return {
        label: 'Ceremony Started',
        customerHeadline: '🪔 Ceremony has started',
        customerSubline: 'Sacred chants, Sankalpam and Vedic rituals are currently in progress.',
        iconName: 'Flame',
        badgeBg: 'bg-[#fae4e7]',
        badgeBorder: 'border-[#eda4af]',
        badgeText: 'text-[#59131e]',
        dotColor: 'bg-[#701a28] animate-pulse',
        accentColor: 'text-[#701a28]'
      };
    case 'COMPLETED':
      return {
        label: 'Completed',
        customerHeadline: '🙏 Ceremony Completed',
        customerSubline: 'Sacred rituals concluded with divine blessings. Prasad & Prasadam distributed.',
        iconName: 'Award',
        badgeBg: 'bg-emerald-50',
        badgeBorder: 'border-emerald-200',
        badgeText: 'text-emerald-900',
        dotColor: 'bg-emerald-600',
        accentColor: 'text-emerald-700'
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        customerHeadline: 'Booking Cancelled',
        customerSubline: 'This ceremony reservation has been cancelled.',
        iconName: 'XCircle',
        badgeBg: 'bg-rose-50',
        badgeBorder: 'border-rose-200',
        badgeText: 'text-rose-900',
        dotColor: 'bg-rose-500',
        accentColor: 'text-rose-700'
      };
    case 'REJECTED':
      return {
        label: 'Declined',
        customerHeadline: 'Request Declined',
        customerSubline: 'Priest was unavailable for the chosen slot.',
        iconName: 'XCircle',
        badgeBg: 'bg-stone-100',
        badgeBorder: 'border-stone-200',
        badgeText: 'text-stone-800',
        dotColor: 'bg-stone-500',
        accentColor: 'text-stone-700'
      };
    case 'REFUND_PENDING':
    case 'REFUNDED':
      return {
        label: status === 'REFUNDED' ? 'Refunded' : 'Refund Processing',
        customerHeadline: status === 'REFUNDED' ? 'Dakshina Refunded' : 'Refund Initiated',
        customerSubline: 'Payment refund processed back to source account.',
        iconName: 'CreditCard',
        badgeBg: 'bg-indigo-50',
        badgeBorder: 'border-indigo-200',
        badgeText: 'text-indigo-900',
        dotColor: 'bg-indigo-500',
        accentColor: 'text-indigo-700'
      };
    case 'DISPUTED':
      return {
        label: 'Disputed',
        customerHeadline: 'Under Review',
        customerSubline: 'Our Purohit Seva administrative committee is reviewing this booking.',
        iconName: 'AlertTriangle',
        badgeBg: 'bg-rose-100',
        badgeBorder: 'border-rose-300',
        badgeText: 'text-rose-950',
        dotColor: 'bg-rose-600',
        accentColor: 'text-rose-800'
      };
  }
}

/**
 * Sequential timeline step definitions
 */
export interface TimelineStepConfig {
  key: CanonicalBookingStatus;
  title: string;
  description: string;
  timestampField?: keyof Booking;
}

export const CEREMONY_LIFECYCLE_STEPS: TimelineStepConfig[] = [
  {
    key: 'REQUESTED',
    title: 'Request Sent',
    description: 'Devotee submitted ceremony requirements and Muhurtham preference',
    timestampField: 'createdAt'
  },
  {
    key: 'ACCEPTED',
    title: 'Priest Accepted',
    description: 'Acharya validated muhurtham availability and accepted auspicious duty',
    timestampField: 'acceptedAt'
  },
  {
    key: 'PAYMENT_PENDING',
    title: 'Payment Completed',
    description: 'Advance dakshina and platform fee settled securely',
    timestampField: 'paidAt'
  },
  {
    key: 'CONFIRMED',
    title: 'Booking Confirmed',
    description: 'Reservation finalized, contact coordinates verified and unlocked',
    timestampField: 'confirmedAt'
  },
  {
    key: 'PRIEST_ON_THE_WAY',
    title: 'Priest On The Way',
    description: 'Acharya commenced journey towards the ceremony venue',
    timestampField: 'journeyStartedAt'
  },
  {
    key: 'PRIEST_ARRIVED',
    title: 'Priest Arrived',
    description: 'Priest arrived at ceremony venue and commenced setup',
    timestampField: 'arrivedAt'
  },
  {
    key: 'CEREMONY_STARTED',
    title: 'Ceremony Started',
    description: 'Sankalpam performed and sacred Vedic homa/puja underway',
    timestampField: 'ceremonyStartedAt'
  },
  {
    key: 'COMPLETED',
    title: 'Completed',
    description: 'Rituals concluded, Mangala Arati completed, blessings showered',
    timestampField: 'completedAt'
  }
];

const STATUS_RANK: Record<CanonicalBookingStatus, number> = {
  REQUESTED: 0,
  ACCEPTED: 1,
  PAYMENT_PENDING: 2,
  CONFIRMED: 3,
  PRIEST_ON_THE_WAY: 4,
  PRIEST_ARRIVED: 5,
  CEREMONY_STARTED: 6,
  COMPLETED: 7,
  CANCELLED: -1,
  REJECTED: -1,
  REFUND_PENDING: -1,
  REFUNDED: -1,
  DISPUTED: -1
};

/**
 * Returns 'completed' | 'current' | 'upcoming' for a step given current booking status
 */
export function getTimelineStepState(
  stepKey: CanonicalBookingStatus,
  currentStatus: CanonicalBookingStatus
): 'completed' | 'current' | 'upcoming' {
  if (currentStatus === 'CANCELLED' || currentStatus === 'REJECTED' || currentStatus === 'DISPUTED') {
    return 'upcoming';
  }

  const currentRank = STATUS_RANK[currentStatus] ?? 3;
  const stepRank = STATUS_RANK[stepKey] ?? 0;

  if (currentRank > stepRank) return 'completed';
  if (currentRank === stepRank) return 'current';
  return 'upcoming';
}

/**
 * PRIEST ALLOWED TRANSITIONS
 * Only specific sequential transitions are permitted by the priest:
 * CONFIRMED -> PRIEST_ON_THE_WAY
 * PRIEST_ON_THE_WAY -> PRIEST_ARRIVED
 * PRIEST_ARRIVED -> CEREMONY_STARTED
 * CEREMONY_STARTED -> COMPLETED
 */
export function getNextAllowedPriestAction(rawStatus?: string | null): {
  action: 'START_JOURNEY' | 'MARK_ARRIVED' | 'START_CEREMONY' | 'COMPLETE_CEREMONY' | null;
  targetStatus: CanonicalBookingStatus | null;
  buttonLabel: string;
  confirmationRequired: boolean;
  confirmTitle?: string;
  confirmMessage?: string;
} | null {
  const current = normalizeBookingStatus(rawStatus);

  switch (current) {
    case 'CONFIRMED':
      return {
        action: 'START_JOURNEY',
        targetStatus: 'PRIEST_ON_THE_WAY',
        buttonLabel: 'Start Journey',
        confirmationRequired: false
      };
    case 'PRIEST_ON_THE_WAY':
      return {
        action: 'MARK_ARRIVED',
        targetStatus: 'PRIEST_ARRIVED',
        buttonLabel: "I've Arrived",
        confirmationRequired: false
      };
    case 'PRIEST_ARRIVED':
      return {
        action: 'START_CEREMONY',
        targetStatus: 'CEREMONY_STARTED',
        buttonLabel: 'Start Ceremony',
        confirmationRequired: false
      };
    case 'CEREMONY_STARTED':
      return {
        action: 'COMPLETE_CEREMONY',
        targetStatus: 'COMPLETED',
        buttonLabel: 'Complete Ceremony',
        confirmationRequired: true,
        confirmTitle: 'Complete Sacred Ceremony?',
        confirmMessage: 'Are you sure the ceremony has been completed? This will finalize the booking, record completion timestamps, and enable devotee ratings and rewards.'
      };
    default:
      return null;
  }
}

/**
 * Strict Priest Transition Validator
 */
export function isValidPriestTransition(currentRaw: string, targetRaw: string): boolean {
  const current = normalizeBookingStatus(currentRaw);
  const target = normalizeBookingStatus(targetRaw);

  if (current === 'CONFIRMED' && target === 'PRIEST_ON_THE_WAY') return true;
  if (current === 'PRIEST_ON_THE_WAY' && target === 'PRIEST_ARRIVED') return true;
  if (current === 'PRIEST_ARRIVED' && target === 'CEREMONY_STARTED') return true;
  if (current === 'CEREMONY_STARTED' && target === 'COMPLETED') return true;

  return false;
}

/**
 * Cancellation rules based on status
 */
export function getCancellationRules(rawStatus?: string | null): {
  allowed: boolean;
  warningLevel: 'normal' | 'caution' | 'forbidden';
  dialogTitle: string;
  dialogMessage: string;
} {
  const status = normalizeBookingStatus(rawStatus);

  if (status === 'COMPLETED') {
    return {
      allowed: false,
      warningLevel: 'forbidden',
      dialogTitle: 'Cannot Cancel Completed Ceremony',
      dialogMessage: 'This ceremony has already been successfully concluded and recorded.'
    };
  }

  if (status === 'CEREMONY_STARTED') {
    return {
      allowed: false,
      warningLevel: 'forbidden',
      dialogTitle: 'Ceremony In Progress',
      dialogMessage: 'The sacred rituals have already commenced. Cancellations are not permitted during the ceremony. Please contact Purohit Seva support if urgent assistance is required.'
    };
  }

  if (status === 'PRIEST_ARRIVED' || status === 'PRIEST_ON_THE_WAY') {
    return {
      allowed: true,
      warningLevel: 'caution',
      dialogTitle: 'Priest Already En Route / Arrived',
      dialogMessage: 'The Acharya has already commenced travel or reached your venue. Cancellation at this stage may incur cancellation charges or require admin assistance. Do you wish to proceed?'
    };
  }

  // CONFIRMED or earlier
  return {
    allowed: true,
    warningLevel: 'normal',
    dialogTitle: 'Cancel Booking?',
    dialogMessage: 'Are you sure you want to cancel this booking? Any advanced dakshina will be refunded per policy.'
  };
}
