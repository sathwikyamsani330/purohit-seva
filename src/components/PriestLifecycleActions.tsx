import React, { useState } from 'react';
import {
  Car,
  MapPin,
  Flame,
  CheckCircle2,
  Navigation,
  Phone,
  AlertTriangle,
  Loader2,
  Calendar,
  Clock
} from 'lucide-react';
import { Booking } from '../types';
import {
  normalizeBookingStatus,
  getNextAllowedPriestAction,
  CanonicalBookingStatus
} from '../utils/bookingStatus';
import { useBooking } from '../context/BookingContext';

interface PriestLifecycleActionsProps {
  booking: Booking;
  onStatusChanged?: (updated: Booking) => void;
  compact?: boolean;
}

export const PriestLifecycleActions: React.FC<PriestLifecycleActionsProps> = ({
  booking,
  onStatusChanged,
  compact = false
}) => {
  const { startJourney, markArrived, startCeremony, completeCeremony } = useBooking();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompleteConfirmModal, setShowCompleteConfirmModal] = useState(false);

  const currentStatus = normalizeBookingStatus(booking.bookingStatus || booking.status);
  const allowedAction = getNextAllowedPriestAction(currentStatus);

  // Construct Google Maps navigation URL
  const getGoogleMapsUrl = () => {
    if (booking.latitude && booking.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${booking.latitude},${booking.longitude}`;
    }
    const dest = encodeURIComponent(booking.location || `${booking.address?.street || ''}, ${booking.address?.city || ''}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  };

  const handleActionClick = async () => {
    if (!allowedAction) return;

    if (allowedAction.action === 'COMPLETE_CEREMONY') {
      setShowCompleteConfirmModal(true);
      return;
    }

    await executeAction(allowedAction.action);
  };

  const executeAction = async (actionType: string) => {
    setIsLoading(true);
    setError(null);
    try {
      let updatedBooking: Booking;
      switch (actionType) {
        case 'START_JOURNEY':
          updatedBooking = await startJourney(booking.id, booking.priestId, booking.priestName);
          break;
        case 'MARK_ARRIVED':
          updatedBooking = await markArrived(booking.id, booking.priestId, booking.priestName);
          break;
        case 'START_CEREMONY':
          updatedBooking = await startCeremony(booking.id, booking.priestId, booking.priestName);
          break;
        case 'COMPLETE_CEREMONY':
          updatedBooking = await completeCeremony(booking.id, booking.priestId, booking.priestName);
          break;
        default:
          throw new Error('Unknown action');
      }

      if (onStatusChanged) {
        onStatusChanged(updatedBooking);
      }
    } catch (err: any) {
      console.error('Failed to update ceremony status:', err);
      setError(err?.message || 'Failed to update ceremony status. Please try again.');
    } finally {
      setIsLoading(false);
      setShowCompleteConfirmModal(false);
    }
  };

  const getActionButtonTheme = (action?: string | null) => {
    switch (action) {
      case 'START_JOURNEY':
        return {
          bg: 'bg-[#701a28] hover:bg-[#59131e] text-white',
          icon: <Car className="w-4 h-4" />,
          label: 'Start Journey'
        };
      case 'MARK_ARRIVED':
        return {
          bg: 'bg-purple-600 hover:bg-purple-700 text-white',
          icon: <MapPin className="w-4 h-4" />,
          label: "I've Arrived"
        };
      case 'START_CEREMONY':
        return {
          bg: 'bg-amber-600 hover:bg-amber-700 text-white',
          icon: <Flame className="w-4 h-4" />,
          label: 'Start Ceremony'
        };
      case 'COMPLETE_CEREMONY':
        return {
          bg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          icon: <CheckCircle2 className="w-4 h-4" />,
          label: 'Complete Ceremony'
        };
      default:
        return {
          bg: 'bg-stone-600 hover:bg-stone-700 text-white',
          icon: null,
          label: ''
        };
    }
  };

  const theme = getActionButtonTheme(allowedAction?.action);

  if (currentStatus === 'COMPLETED') {
    return (
      <div className={`p-4 bg-emerald-50 rounded-xl border border-emerald-200 ${compact ? 'text-xs' : ''}`}>
        <div className="flex items-center gap-2 text-emerald-800 font-bold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Ceremony Completed & Verified</span>
        </div>
        <p className="text-xs text-emerald-700 mt-1">
          Blessings bestowed upon the devotee family. Dakshina and rewards settled.
        </p>
      </div>
    );
  }

  if (currentStatus === 'CANCELLED' || currentStatus === 'REJECTED') {
    return (
      <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 text-xs text-stone-600">
        This booking has been cancelled/closed.
      </div>
    );
  }

  return (
    <div id="priest-lifecycle-actions-card" className={`bg-stone-50 rounded-2xl border border-stone-200 ${compact ? 'p-3' : 'p-5'} shadow-xs`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
            Acharya Duty & Live Ceremony Controls
          </span>
          <span className="text-xs text-stone-600">
            Keep devotee updated with one-tap status milestones
          </span>
        </div>

        {/* Quick Navigation & Call buttons */}
        <div className="flex items-center gap-2">
          {booking.customerPhone && (
            <a
              href={`tel:${booking.customerPhone}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 transition-colors"
              title="Call Devotee"
            >
              <Phone className="w-3.5 h-3.5 text-stone-600" />
              Call Devotee
            </a>
          )}
          <a
            href={getGoogleMapsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
            title="Open Maps Directions"
          >
            <Navigation className="w-3.5 h-3.5 text-blue-600" />
            Directions
          </a>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary Action Button */}
      {allowedAction ? (
        <button
          id={`btn-priest-action-${allowedAction.action?.toLowerCase()}`}
          onClick={handleActionClick}
          disabled={isLoading}
          className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${theme.bg} disabled:opacity-60`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Updating Status...</span>
            </>
          ) : (
            <>
              {theme.icon}
              <span>{theme.label}</span>
            </>
          )}
        </button>
      ) : (
        <div className="text-xs text-stone-500 py-1 text-center font-medium">
          Awaiting confirmation or customer payment completion.
        </div>
      )}

      {/* Confirmation Modal for Complete Ceremony */}
      {showCompleteConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-stone-900 font-bold text-lg mb-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4>Complete Sacred Ceremony?</h4>
                <p className="text-xs font-normal text-stone-500">Purohit Seva Ceremony Completion</p>
              </div>
            </div>

            <p className="text-sm text-stone-600 my-4 leading-relaxed">
              Are you sure the sacred rituals for <strong className="text-stone-900">{booking.eventName}</strong> have concluded?
              This will record final timestamps, award loyalty reward points to the devotee, and enable the review prompt.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowCompleteConfirmModal(false)}
                disabled={isLoading}
                className="px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeAction('COMPLETE_CEREMONY')}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shadow-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Finalizing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Yes, Complete Ceremony</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
