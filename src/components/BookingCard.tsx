import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Booking } from '../types';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { Button } from './Button';
import { formatCurrency, formatDate, getStatusBadgeStyle } from '../utils';
import { canShowContactDetails, formatDisplayPhone, getCleanTelUrl } from '../utils/contactVisibility';
import { getGoogleMapsNavigationUrl } from '../utils/mapsNavigation';
import { CustomerLocationCard } from './CustomerLocationCard';
import { CallModal } from './CallModal';
import { normalizeBookingStatus, getStatusDisplayMeta, getNextAllowedPriestAction } from '../utils/bookingStatus';
import {
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Star,
  Phone,
  Lock,
  Navigation,
  Car,
  Flame
} from 'lucide-react';

export interface BookingCardProps {
  booking: Booking;
  onCancel?: (bookingId: string) => void;
  onPay?: (booking: Booking) => void;
  isPriestView?: boolean;
  onAccept?: (bookingId: string) => void;
  onReject?: (bookingId: string) => void;
  onComplete?: (bookingId: string) => void;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onCancel,
  onPay,
  isPriestView = false,
  onAccept,
  onReject,
  onComplete
}) => {
  const [isCalling, setIsCalling] = useState(false);
  const currentStatus = normalizeBookingStatus(booking.bookingStatus || booking.status);
  const statusMeta = getStatusDisplayMeta(currentStatus);
  const isConfirmed = currentStatus !== 'CANCELLED' && currentStatus !== 'REJECTED';
  const isCompleted = currentStatus === 'COMPLETED';
  const showContact = canShowContactDetails(booking);

  const contactPersonName = isPriestView ? booking.customerName : booking.priestName;
  const contactPersonPhone = isPriestView ? booking.customerPhone : booking.priestPhone;
  const cleanPhone = formatDisplayPhone(contactPersonPhone, isPriestView ? '+91 98451 22334' : '+91 98450 11223');
  const telUrl = getCleanTelUrl(contactPersonPhone, isPriestView ? '+919845122334' : '+919845011223');
  const navUrl = getGoogleMapsNavigationUrl(booking.address || booking.location, {
    latitude: booking.latitude || booking.address?.latitude,
    longitude: booking.longitude || booking.address?.longitude
  });

  return (
    <div className="bg-white rounded-2xl border border-[#eadfd9] shadow-xs hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between">
      <div>
        {/* Top bar with ID and Status */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs bg-[#faf8f5] text-stone-700 px-2 py-0.5 rounded-md border border-[#eadfd9]">
              {booking.id}
            </span>
            <span className="text-xs text-stone-400">
              {new Date(booking.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusMeta.badgeBg} ${statusMeta.badgeBorder} ${statusMeta.badgeText}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotColor}`} />
              {statusMeta.label}
            </span>
          </div>
        </div>

        {/* Counterpart Info */}
        <div className="flex items-start gap-3.5 mb-4">
          <Avatar
            src={isPriestView ? undefined : (booking.priestAvatar || booking.priestImage)}
            name={isPriestView ? booking.customerName : booking.priestName}
            size="lg"
            className="rounded-xl"
          />

          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-stone-900 text-base truncate">
              {booking.eventName}
            </h4>
            <p className="text-xs text-stone-600 truncate mt-0.5">
              {isPriestView ? `Devotee: ${booking.customerName}` : `Acharya: ${booking.priestName}`}
            </p>
            <p className="text-[11px] text-[#701a28] font-semibold truncate mt-0.5">
              {booking.serviceName}
            </p>
          </div>
        </div>

        {/* Contact Visibility Strip */}
        <div className="mb-4 p-3 rounded-xl bg-[#faf8f5] border border-[#eadfd9] flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {showContact ? (
              <>
                <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <div className="truncate">
                  <span className="text-stone-500 text-[11px] block">{isPriestView ? 'Customer Mobile:' : 'Priest Mobile:'}</span>
                  <span className="font-mono font-bold text-stone-900">{cleanPhone}</span>
                </div>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-[#701a28] shrink-0" />
                <span className="text-stone-500 text-[11px]">
                  Contact details available after payment confirmation.
                </span>
              </>
            )}
          </div>

          {showContact && (
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={telUrl}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                title={`Call ${contactPersonName}`}
              >
                <Phone className="w-3 h-3 text-emerald-600" />
                <span>Call</span>
              </a>
            </div>
          )}
        </div>

        {/* Schedule Grid */}
        <div className="grid grid-cols-2 gap-2 bg-[#faf8f5] rounded-xl p-3 text-xs text-stone-600 mb-3 border border-[#eadfd9]">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#701a28] shrink-0" />
            <span className="font-medium text-stone-800">{formatDate(booking.date)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#701a28] shrink-0" />
            <span className="font-medium text-stone-800">{booking.time || booking.timeSlot}</span>
          </div>
        </div>

        {/* Location & Navigation Card for Priest View */}
        {isPriestView ? (
          <div className="mb-4">
            <CustomerLocationCard
              address={booking.address || booking.location}
              latitude={booking.latitude || booking.address?.latitude}
              longitude={booking.longitude || booking.address?.longitude}
              customerName={booking.customerName}
              isConfirmed={isConfirmed || isCompleted}
              showExactAddress={showContact}
              compact
            />
          </div>
        ) : (
          <div className="mb-4 flex items-center gap-2 bg-[#faf8f5] rounded-xl p-3 text-xs text-stone-600 border border-[#eadfd9] truncate">
            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="truncate">
              {booking.address?.area || booking.address?.city || booking.location || 'Ceremony Venue'}
            </span>
          </div>
        )}
      </div>

      {/* Footer Pricing and Action Row */}
      <div className="pt-3 border-t border-[#eadfd9] flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[10px] text-stone-400 uppercase font-bold tracking-tight block">
            Dakshina Paid
          </span>
          <span className="text-base font-extrabold text-stone-900">
            {formatCurrency(booking.totalAmount)}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Priest Navigation CTA Button */}
          {isPriestView && isConfirmed && (
            <a
              href={navUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#701a28] hover:bg-[#59131e] text-white text-xs font-bold shadow-xs transition-colors"
              title="Open Google Maps Navigation"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Navigate</span>
            </a>
          )}

          {/* Priest Complete Action */}
          {isPriestView && isConfirmed && !isCompleted && onComplete && (
            <Button
              variant="outline"
              size="sm"
              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              onClick={() => onComplete(booking.id)}
            >
              Mark Completed
            </Button>
          )}

          {/* Repeat Booking CTA for Completed Ceremonies */}
          {!isPriestView && isCompleted && (
            <Link to={`/book/${booking.priestId}`}>
              <Button
                variant="outline"
                size="sm"
                className="text-[#701a28] border-[#f5ccd2] hover:bg-[#fdf2f4]"
                leftIcon={<Flame className="w-3.5 h-3.5 text-[#701a28]" />}
              >
                Book Again
              </Button>
            </Link>
          )}

          <Link to={`/bookings/${booking.id}`}>
            <Button variant="primary" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
              Details
            </Button>
          </Link>
        </div>
      </div>

      {/* Call Modal */}
      {showContact && (
        <CallModal
          isOpen={isCalling}
          onClose={() => setIsCalling(false)}
          participantName={contactPersonName}
          participantPhone={cleanPhone}
          participantTitle={isPriestView ? 'Devotee' : (booking.priestTitle || 'Vedic Acharya')}
          participantRole={isPriestView ? 'customer' : 'priest'}
          bookingId={booking.id}
          eventName={booking.eventName}
        />
      )}
    </div>
  );
};
