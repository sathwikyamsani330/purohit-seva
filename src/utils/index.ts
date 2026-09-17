import { BookingStatus, PaymentStatus } from '../types';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const calculateTax = (amount: number, taxRate: number = 0.05): number => {
  return Math.round(amount * taxRate);
};

export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

export const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatTime = (timeStr: string): string => {
  return timeStr;
};

export const getStatusBadgeStyle = (status: BookingStatus | PaymentStatus | string) => {
  switch (status) {
    case 'confirmed':
    case 'completed':
    case 'verified':
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500'
      };
    case 'pending':
    case 'in_progress':
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500'
      };
    case 'cancelled':
    case 'rejected':
    case 'suspended':
    case 'failed':
      return {
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500'
      };
    case 'refunded':
      return {
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500'
      };
    default:
      return {
        bg: 'bg-stone-50 text-stone-700 border-stone-200',
        dot: 'bg-stone-500'
      };
  }
};

export const generateId = (prefix: string = 'ID'): string => {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomNum}`;
};

export const CITIES_LIST = [
  'All Cities',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Mumbai',
  'Delhi NCR',
  'Pune',
  'Kolkata',
  'Ahmedabad',
  'Kochi',
  'Bhubaneswar',
  'Varanasi'
];

export const LANGUAGES_LIST = [
  'All Languages',
  'Telugu',
  'Tamil',
  'Kannada',
  'Hindi',
  'Sanskrit',
  'Marathi',
  'Bengali',
  'Gujarati',
  'Malayalam',
  'Odia',
  'English'
];

export const TRADITIONS_LIST = [
  'All Traditions',
  'Smartha / Vedic',
  'Vaishnava',
  'Vadama / Dravida',
  'Deshastha Rigvedi',
  'Bengali Vaidika / Shakta',
  'Kerala Tantra',
  'Samavedic'
];
