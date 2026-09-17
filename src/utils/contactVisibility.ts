import { Booking, PriestRequest } from '../types';

/**
 * Contact visibility business rule:
 * Customer's and Priest's mobile numbers must remain HIDDEN until:
 * 1. Priest accepts the request
 * 2. Customer successfully completes payment
 *
 * The strict condition is:
 * booking.paymentStatus === 'PAID' (or 'completed')
 * AND
 * booking.bookingStatus === 'CONFIRMED' (or 'COMPLETED', case-insensitive status)
 */
export function canShowContactDetails(booking?: Booking | PriestRequest | null): boolean {
  if (!booking) return false;

  const paymentStatus = String(booking.paymentStatus || '').toUpperCase();
  const rawStatus = String(('bookingStatus' in booking && booking.bookingStatus) || booking.status || '').toUpperCase();

  const isPaid = paymentStatus === 'PAID' || paymentStatus === 'COMPLETED';
  const isConfirmed = rawStatus === 'CONFIRMED' || rawStatus === 'COMPLETED';

  return isPaid && isConfirmed;
}

/**
 * Returns a privacy-safe masked phone representation for pre-payment views
 */
export function getMaskedPhone(_phone?: string): string {
  return '+91 XXXXX XXXXX';
}

/**
 * Formats a phone number for clean display
 */
export function formatDisplayPhone(phone?: string, fallback = '+91 98765 43210'): string {
  if (!phone || phone.trim() === '') return fallback;
  return phone.trim();
}

/**
 * Cleans phone number to create a standard tel: link
 */
export function getCleanTelUrl(phone?: string, fallback = '+919876543210'): string {
  const raw = phone || fallback;
  const digitsAndPlus = raw.replace(/[^\d+]/g, '');
  return `tel:${digitsAndPlus || '+919876543210'}`;
}
