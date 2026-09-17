import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Car,
  MapPin,
  Flame,
  Award,
  AlertCircle,
  HelpCircle,
  Send,
  X,
  Phone,
  ShieldAlert,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Booking, BookingStatusHistoryEntry, SupportIssueReason } from '../types';
import {
  normalizeBookingStatus,
  getStatusDisplayMeta,
  CEREMONY_LIFECYCLE_STEPS,
  getTimelineStepState,
  CanonicalBookingStatus
} from '../utils/bookingStatus';
import { bookingService } from '../services/bookingService';

interface BookingStatusTimelineProps {
  booking: Booking;
  userRole?: 'customer' | 'priest' | 'admin';
  onSupportRequested?: () => void;
}

export const BookingStatusTimeline: React.FC<BookingStatusTimelineProps> = ({
  booking,
  userRole = 'customer',
  onSupportRequested
}) => {
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [issueReason, setIssueReason] = useState<SupportIssueReason>("Priest hasn't arrived");
  const [issueDetails, setIssueDetails] = useState('');
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [supportSuccessMessage, setSupportSuccessMessage] = useState<string | null>(null);
  const [isAuditExpanded, setIsAuditExpanded] = useState(false);

  const currentStatus = normalizeBookingStatus(booking.bookingStatus || booking.status);
  const meta = getStatusDisplayMeta(currentStatus);

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return null;
    }
  };

  const getStepTimestamp = (stepKey: CanonicalBookingStatus): string | null => {
    switch (stepKey) {
      case 'REQUESTED':
        return formatTimestamp(booking.createdAt);
      case 'ACCEPTED':
        return formatTimestamp(booking.acceptedAt);
      case 'PAYMENT_PENDING':
        return formatTimestamp(booking.paidAt);
      case 'CONFIRMED':
        return formatTimestamp(booking.confirmedAt || booking.createdAt);
      case 'PRIEST_ON_THE_WAY':
        return formatTimestamp(booking.journeyStartedAt);
      case 'PRIEST_ARRIVED':
        return formatTimestamp(booking.arrivedAt);
      case 'CEREMONY_STARTED':
        return formatTimestamp(booking.ceremonyStartedAt);
      case 'COMPLETED':
        return formatTimestamp(booking.completedAt);
      default:
        return null;
    }
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueDetails.trim()) return;

    setIsSubmittingSupport(true);
    try {
      await bookingService.createSupportRequest({
        bookingId: booking.id,
        customerId: booking.customerId,
        customerName: booking.customerName || 'Devotee',
        customerPhone: booking.customerPhone,
        priestId: booking.priestId,
        priestName: booking.priestName,
        issueReason,
        description: issueDetails.trim()
      });

      setSupportSuccessMessage('Help request submitted. Our senior concierge is attending immediately.');
      setIssueDetails('');
      if (onSupportRequested) onSupportRequested();
      setTimeout(() => {
        setShowSupportModal(false);
        setSupportSuccessMessage(null);
      }, 2500);
    } catch (err) {
      console.error('Failed to submit support request:', err);
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  const getStepIcon = (key: CanonicalBookingStatus, state: 'completed' | 'current' | 'upcoming') => {
    if (state === 'completed') {
      return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
    }

    if (state === 'current') {
      switch (key) {
        case 'PRIEST_ON_THE_WAY':
          return <Car className="w-5 h-5 text-[#701a28] animate-bounce" />;
        case 'PRIEST_ARRIVED':
          return <MapPin className="w-5 h-5 text-purple-600 animate-pulse" />;
        case 'CEREMONY_STARTED':
          return <Flame className="w-5 h-5 text-[#701a28] animate-pulse" />;
        case 'COMPLETED':
          return <Award className="w-5 h-5 text-emerald-600" />;
        default:
          return <div className="w-3.5 h-3.5 rounded-full bg-[#701a28] animate-ping" />;
      }
    }

    // upcoming
    return <div className="w-2.5 h-2.5 rounded-full bg-stone-300" />;
  };

  // Check if live tracking states are active
  const isEnRoute = currentStatus === 'PRIEST_ON_THE_WAY';
  const isArrived = currentStatus === 'PRIEST_ARRIVED';
  const isStarted = currentStatus === 'CEREMONY_STARTED';
  const isCompleted = currentStatus === 'COMPLETED';

  return (
    <div id="booking-status-timeline-container" className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden mb-6">
      {/* Dynamic Status Header */}
      <div className={`p-5 sm:p-6 border-b ${meta.badgeBorder} ${meta.badgeBg}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${meta.badgeBg} ${meta.badgeBorder} ${meta.badgeText} border`}>
                <span className={`w-2 h-2 rounded-full ${meta.dotColor}`} />
                {meta.label}
              </span>
              <span className="text-xs text-stone-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
              {meta.customerHeadline}
            </h3>
            <p className="text-sm text-stone-600 mt-0.5">
              {meta.customerSubline}
            </p>
          </div>

          {/* Need Help Button */}
          <div className="flex items-center gap-2">
            {booking.priestPhone && (isEnRoute || isArrived || isStarted) && (
              <a
                href={`tel:${booking.priestPhone}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors shadow-xs"
              >
                <Phone className="w-3.5 h-3.5 text-[#701a28]" />
                Call Priest
              </a>
            )}
            <button
              id="btn-need-help-emergency"
              onClick={() => setShowSupportModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 transition-colors shadow-xs"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#e5b869]" />
              Need Help?
            </button>
          </div>
        </div>

        {/* Live en-route callout banner */}
        {isEnRoute && (
          <div className="mt-4 p-3.5 bg-[#fdf2f4] rounded-xl border border-[#f5ccd2] flex items-start gap-3">
            <Car className="w-5 h-5 text-[#701a28] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[#59131e] uppercase tracking-wide">Acharya En Route</p>
              <p className="text-sm text-[#701a28] mt-0.5 leading-relaxed">
                Pandit {booking.priestName} has started travel to your venue. Please ensure the puja room is cleansed and seating mats (asanas) are kept ready.
              </p>
            </div>
          </div>
        )}

        {isArrived && (
          <div className="mt-4 p-3.5 bg-purple-100/80 rounded-xl border border-purple-200 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-purple-950 uppercase tracking-wide">Priest Has Reached Venue</p>
              <p className="text-sm text-purple-900 mt-0.5 leading-relaxed">
                Acharya is at the venue preparing the sacred kalash, rangoli mandap, and samagri for the auspicious muhurtham.
              </p>
            </div>
          </div>
        )}

        {isStarted && (
          <div className="mt-4 p-3.5 bg-amber-100/90 rounded-xl border border-amber-300 flex items-start gap-3">
            <Flame className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-950 uppercase tracking-wide">Sacred Rituals In Progress</p>
              <p className="text-sm text-amber-950 mt-0.5 leading-relaxed">
                Vedic mantras and Sankalpam are underway. Please maintain a serene environment for divine vibrations.
              </p>
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="mt-4 p-3.5 bg-emerald-100/80 rounded-xl border border-emerald-200 flex items-start gap-3">
            <Award className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-950 uppercase tracking-wide">Ceremony Concluded With Blessings</p>
              <p className="text-sm text-emerald-900 mt-0.5 leading-relaxed">
                Mangala Arati and blessings are complete. Loyalty reward points have been added to your account!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sequential Timeline Flow */}
      <div className="p-5 sm:p-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-4">
          Ceremony Progress Timeline
        </h4>

        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-[11px] sm:before:left-[15px] before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-200">
          {CEREMONY_LIFECYCLE_STEPS.map((step, idx) => {
            const state = getTimelineStepState(step.key, currentStatus);
            const recordedTimestamp = getStepTimestamp(step.key);

            return (
              <div key={step.key} className="relative flex items-start gap-3 sm:gap-4 group">
                {/* Node icon */}
                <div
                  className={`absolute -left-6 sm:-left-8 flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 transition-all ${
                    state === 'completed'
                      ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                      : state === 'current'
                      ? 'bg-[#fdf2f4] border-[#701a28] ring-4 ring-[#701a28]/15 shadow-sm'
                      : 'bg-stone-50 border-stone-300'
                  }`}
                >
                  {getStepIcon(step.key, state)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <p
                      className={`text-sm font-semibold ${
                        state === 'completed'
                          ? 'text-stone-900'
                          : state === 'current'
                          ? 'text-[#701a28] font-bold'
                          : 'text-stone-400'
                      }`}
                    >
                      {step.title}
                    </p>

                    {recordedTimestamp && (
                      <span className="text-xs text-stone-500 font-medium">
                        {recordedTimestamp}
                      </span>
                    )}
                  </div>

                  <p
                    className={`text-xs mt-0.5 ${
                      state === 'current'
                        ? 'text-stone-700'
                        : state === 'completed'
                        ? 'text-stone-500'
                        : 'text-stone-400'
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Audit Log / History Accordion */}
        {booking.statusHistory && booking.statusHistory.length > 0 && (
          <div className="mt-8 pt-5 border-t border-stone-100">
            <button
              onClick={() => setIsAuditExpanded(!isAuditExpanded)}
              className="w-full flex items-center justify-between text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors py-1"
            >
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                Detailed Verification & Status Audit Log ({booking.statusHistory.length} events)
              </span>
              {isAuditExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {isAuditExpanded && (
              <div className="mt-3 bg-stone-50 rounded-xl p-3 border border-stone-200 text-xs space-y-2.5">
                {booking.statusHistory.map((h, i) => (
                  <div key={h.id || i} className="flex items-start justify-between gap-2 border-b border-stone-200/60 pb-2 last:border-b-0 last:pb-0">
                    <div>
                      <div className="font-medium text-stone-800">
                        Transitioned to <span className="font-bold text-stone-900">{h.newStatus}</span>
                      </div>
                      <div className="text-stone-500 text-[11px] mt-0.5">
                        By {h.changedByName || h.changedByRole} ({h.changedByRole})
                        {h.reason && ` • Note: ${h.reason}`}
                      </div>
                    </div>
                    <div className="text-stone-400 text-[11px] shrink-0 font-mono">
                      {formatTimestamp(h.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Need Help Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-lg">
                <ShieldAlert className="w-5 h-5 text-[#701a28]" />
                Purohit Seva Concierge Support
              </div>
              <button
                onClick={() => setShowSupportModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {supportSuccessMessage ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <h4 className="text-base font-bold text-stone-900">Request Registered</h4>
                <p className="text-sm text-stone-600 mt-1">{supportSuccessMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleSupportSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    What is the issue?
                  </label>
                  <select
                    value={issueReason}
                    onChange={(e) => setIssueReason(e.target.value as SupportIssueReason)}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-[#eadfd9] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#701a28] focus:border-[#701a28]"
                  >
                    <option value="Priest hasn't arrived">Priest hasn't arrived on time</option>
                    <option value="Priest cannot reach location">Priest cannot locate address</option>
                    <option value="Incorrect location">Incorrect venue location entered</option>
                    <option value="Ceremony issue">Ceremony / Samagri requirement query</option>
                    <option value="Payment issue">Payment or Dakshina clarification</option>
                    <option value="Other">Other emergency assistance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Describe details
                  </label>
                  <textarea
                    rows={3}
                    value={issueDetails}
                    onChange={(e) => setIssueDetails(e.target.value)}
                    placeholder="Provide specific notes or landmark directions..."
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-[#eadfd9] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#701a28] focus:border-[#701a28]"
                  />
                </div>

                <div className="bg-[#faf8f5] rounded-xl p-3 border border-[#eadfd9] text-xs text-stone-600">
                  <span className="font-semibold text-stone-800">Direct Helpline:</span> For immediate ceremony escalations, you may also reach our priest relations desk at <strong className="text-stone-900">+91 98450 11223</strong>.
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowSupportModal(false)}
                    className="px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSupport || !issueDetails.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-[#701a28] hover:bg-[#59131e] disabled:opacity-50 text-white rounded-xl transition-colors shadow-xs"
                  >
                    {isSubmittingSupport ? (
                      <span>Submitting...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
