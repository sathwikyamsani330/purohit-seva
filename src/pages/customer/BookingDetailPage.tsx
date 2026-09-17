import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { bookingService } from '../../services/bookingService';
import { priestService } from '../../services/priestService';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Booking, Priest } from '../../types';
import { Avatar } from '../../components/Avatar';
import { Rating } from '../../components/Rating';
import { Button } from '../../components/Button';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { formatCurrency, formatDate, getStatusBadgeStyle } from '../../utils';
import { canShowContactDetails, formatDisplayPhone, getCleanTelUrl } from '../../utils/contactVisibility';
import { CallModal } from '../../components/CallModal';
import { ReviewModal } from '../../components/ReviewModal';
import { CustomerLocationCard } from '../../components/CustomerLocationCard';
import { BookingStatusTimeline } from '../../components/BookingStatusTimeline';
import { PriestLifecycleActions } from '../../components/PriestLifecycleActions';
import {
  normalizeBookingStatus,
  getCancellationRules,
  getStatusDisplayMeta
} from '../../utils/bookingStatus';
import { db } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { ProtectionCard, OffPlatformNotice } from '../../components/ProtectionCard';
import { ReportIssueModal } from '../../components/ReportIssueModal';
import {
  Calendar,
  Clock,
  MapPin,
  Flame,
  Phone,
  CheckCircle2,
  FileText,
  Star,
  ArrowLeft,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Check,
  Lock,
  Navigation
} from 'lucide-react';

export const BookingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const { currentUser, role } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [priest, setPriest] = useState<Priest | null>(null);
  const [loading, setLoading] = useState(true);

  // Calling & Review Modals
  const [isCalling, setIsCalling] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchDetail = async () => {
    if (!id) return;
    try {
      const data = await bookingService.getBookingById(id);
      if (data) {
        setBooking(data);
        const p = await priestService.getPriestById(data.priestId);
        setPriest(p || null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  // Real-time Firestore document listener
  useEffect(() => {
    if (!id) return;

    let unsubscribe: (() => void) | null = null;
    try {
      const docRef = doc(db, 'bookings', id);
      unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const updated = { ...docSnap.data(), id: docSnap.id } as Booking;
            setBooking(updated);
          }
        },
        () => {
          // ignore or fallback
        }
      );
    } catch {
      // ignore
    }

    const handleCustomEvent = (e: any) => {
      if (e.detail && (e.detail.id === id || e.detail.bookingId === id)) {
        setBooking(e.detail);
      } else {
        fetchDetail();
      }
    };

    window.addEventListener('purohit_booking_updated', handleCustomEvent);
    window.addEventListener('purohit_data_updated', fetchDetail);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('purohit_booking_updated', handleCustomEvent);
      window.removeEventListener('purohit_data_updated', fetchDetail);
    };
  }, [id]);

  const handleCancelBooking = async () => {
    if (!booking) return;
    setCancelling(true);
    try {
      await bookingService.cancelBooking(booking.id, 'Cancelled by devotee');
      success('Booking has been cancelled.');
      setCancelModalOpen(false);
      fetchDetail();
    } catch {
      error('Failed to cancel booking.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading booking particulars..." fullHeight />;
  }

  if (!booking) {
    return (
      <ErrorState
        title="Booking Not Found"
        message="Unable to locate this booking reference."
        onRetry={() => navigate('/bookings')}
      />
    );
  }

  const currentStatus = normalizeBookingStatus(booking.bookingStatus || booking.status);
  const statusMeta = getStatusDisplayMeta(currentStatus);
  const cancelRules = getCancellationRules(currentStatus);

  const isPriestUser =
    role === 'priest' ||
    currentUser?.role === 'priest' ||
    booking.priestId === currentUser?.id;

  const isCompleted = currentStatus === 'COMPLETED';
  const showContact = canShowContactDetails(booking);

  const priestPhone = formatDisplayPhone(booking.priestPhone || priest?.phone, '+91 98450 11223');
  const telUrl = getCleanTelUrl(booking.priestPhone || priest?.phone, '+919845011223');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back Link */}
      <Link
        to={isPriestUser ? "/priest/bookings" : "/bookings"}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to {isPriestUser ? "Priest Assignments" : "My Bookings"}</span>
      </Link>

      {/* Priest Live Lifecycle Action Controls (Only for Priest or Admin) */}
      {isPriestUser && (
        <PriestLifecycleActions
          booking={booking}
          onStatusChanged={(updated) => setBooking(updated)}
        />
      )}

      {/* Production-Ready Live Booking & Ceremony Status Tracker */}
      <BookingStatusTimeline
        booking={booking}
        userRole={role || 'customer'}
        onSupportRequested={() => fetchDetail()}
      />

      {/* Purohit Seva Protection System */}
      <ProtectionCard
        bookingId={booking.id}
        isConfirmed={booking.paymentStatus === 'PAID' || currentStatus === 'CONFIRMED' || isCompleted}
        onReportClick={() => setIsReportModalOpen(true)}
      />

      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold bg-amber-50 text-amber-900 px-2.5 py-1 rounded-md border border-amber-200">
                {booking.id}
              </span>
              <span className="text-xs text-stone-400">
                Confirmed {new Date(booking.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 className="font-heading text-2xl font-bold text-stone-900 mt-2">
              {booking.eventName}
            </h1>
            <p className="text-xs text-amber-800 font-semibold mt-0.5">{booking.serviceName}</p>
          </div>

          <div className="flex flex-col sm:items-end gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${statusMeta.badgeBg} ${statusMeta.badgeBorder} ${statusMeta.badgeText}`}>
              <span className={`w-2 h-2 rounded-full ${statusMeta.dotColor}`} />
              {statusMeta.label}
            </span>
            <span className="text-xs text-stone-500">
              Payment Status: <strong className="text-emerald-700 font-bold uppercase">{booking.paymentStatus || 'PAID'}</strong> ({booking.paymentMethod})
            </span>
          </div>
        </div>

        {/* Dedicated CONTACT Section */}
        <div className="my-6 p-5 rounded-2xl bg-stone-50 border border-stone-200/80">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
              <Phone className="w-4 h-4 text-amber-600" />
              <span>{isPriestUser ? "Devotee Contact Coordinates" : "Contact Officiating Priest"}</span>
            </h3>
            {showContact ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                Verified Contact Unlocked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                <Lock className="w-3 h-3" />
                Contact Hidden
              </span>
            )}
          </div>

          {showContact ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-bold text-stone-900">
                  {isPriestUser ? (
                    <>Devotee: <span className="text-amber-900">{booking.customerName}</span></>
                  ) : (
                    <>Acharya: <span className="text-amber-900">{booking.priestName}</span></>
                  )}
                </p>
                <p className="text-xs text-stone-600">
                  Mobile:{' '}
                  <strong className="font-mono text-stone-900 font-bold text-sm">
                    {isPriestUser ? (booking.customerPhone || '+91 98451 22334') : priestPhone}
                  </strong>
                </p>
                <p className="text-[11px] text-stone-500">
                  Direct call line to coordinate auspicious muhurtham arrival and sacred mandap prep.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={isPriestUser ? `tel:${booking.customerPhone || '+919845122334'}` : telUrl}
                  id="booking-detail-direct-tel-btn"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>{isPriestUser ? "Call Devotee" : "Call Priest"}</span>
                </a>
                <button
                  onClick={() => setIsCalling(true)}
                  id="booking-detail-call-modal-btn"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold transition-colors"
                  title="Open in-app call bridge"
                >
                  <span>In-App Call</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-stone-600 py-1">
              <Lock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-stone-800">🔒 Contact details hidden</p>
                <p className="text-[11px] text-stone-500">Unlocked upon booking confirmation and advance dakshina.</p>
              </div>
            </div>
          )}

          {/* Off-Platform Booking & Contact Safety Notice */}
          <OffPlatformNotice
            className="mt-4"
            onReportClick={() => setIsReportModalOpen(true)}
          />
        </div>

        {/* Schedule & Address Grid with Google Maps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-4">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              Ceremony Schedule
            </h3>
            <div className="bg-stone-50 rounded-2xl p-4 text-xs space-y-2 text-stone-700">
              <p><strong>Auspicious Date:</strong> {formatDate(booking.date)}</p>
              <p><strong>Muhurtham Slot:</strong> {booking.time || booking.timeSlot}</p>
              {(booking.notes || booking.specialNotes) && (
                <div className="pt-2 border-t border-stone-200/60">
                  <strong>Notes & Sankalpam:</strong>
                  <p className="italic text-stone-600 mt-0.5">{booking.notes || booking.specialNotes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <CustomerLocationCard
              address={booking.address || booking.location}
              latitude={booking.latitude || booking.address?.latitude}
              longitude={booking.longitude || booking.address?.longitude}
              customerName={booking.customerName}
              isConfirmed={currentStatus !== 'CANCELLED' && currentStatus !== 'REJECTED'}
              showExactAddress={showContact}
            />
          </div>
        </div>
      </div>

      {/* Priest Details Card */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs">
        <h3 className="font-bold text-stone-900 text-base mb-4 flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-600" />
          Officiating Purohit
        </h3>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar src={booking.priestAvatar || booking.priestImage} name={booking.priestName} size="xl" />
            <div>
              <h4 className="font-bold text-stone-900 text-base">{booking.priestName}</h4>
              <p className="text-xs text-amber-800 font-medium">{booking.priestTitle || priest?.title || 'Vedic Acharya'}</p>
              {priest && (
                <div className="mt-1">
                  <Rating value={priest.rating} reviewCount={priest.reviewCount} size="sm" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to={`/priests/${booking.priestId}`}>
              <Button variant="outline" size="sm">
                View Profile
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Financials & Receipt Breakdown */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-4">
        <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-600" />
          Dakshina & Payment Breakdown
        </h3>

        <div className="space-y-2 text-xs text-stone-600">
          <div className="flex justify-between">
            <span>Puja Service & Dakshina:</span>
            <span className="font-semibold text-stone-900">{formatCurrency(booking.serviceCharge || booking.servicePrice || booking.subtotal || 5000)}</span>
          </div>
          <div className="flex justify-between">
            <span>Platform Fee:</span>
            <span className="font-semibold text-stone-900">{formatCurrency(booking.platformFee || 250)}</span>
          </div>
          {booking.rewardDiscount && booking.rewardDiscount > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Loyalty Reward Voucher Discount:</span>
              <span>-{formatCurrency(booking.rewardDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-extrabold text-stone-900 pt-3 border-t border-stone-100">
            <span>Total Paid Amount:</span>
            <span className="text-amber-900">{formatCurrency(booking.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Bottom Action Controls for Customer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="text-xs text-stone-500">
          Booking Reference: <span className="font-mono font-bold text-stone-800">{booking.id}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Report Issue Button */}
          <Button
            variant="outline"
            size="sm"
            className="text-stone-600 border-stone-200 hover:bg-stone-50"
            onClick={() => setIsReportModalOpen(true)}
            leftIcon={<ShieldAlert className="w-4 h-4 text-[#701a28]" />}
          >
            Report an Issue
          </Button>

          {/* Customer Reviews & Rating */}
          {isCompleted && (
            <Button
              variant="gold"
              size="sm"
              onClick={() => setIsReviewOpen(true)}
              leftIcon={<Star className="w-4 h-4" />}
            >
              {booking.customerReview ? 'Update Feedback' : 'Rate Your Experience'}
            </Button>
          )}

          {/* Repeat Booking CTA for Customer */}
          {isCompleted && !isPriestUser && (
            <Link to={`/book/${booking.priestId}`}>
              <Button
                variant="primary"
                size="sm"
                className="bg-[#701a28] hover:bg-[#59131e]"
                leftIcon={<Flame className="w-4 h-4 text-[#e5b869]" />}
              >
                Book this Priest Again
              </Button>
            </Link>
          )}

          {/* Customer Cancel Button (Enforces cancellation rules) */}
          {cancelRules.allowed && (
            <Button
              variant="outline"
              size="sm"
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
              onClick={() => setCancelModalOpen(true)}
              leftIcon={<XCircle className="w-4 h-4" />}
            >
              Cancel Booking
            </Button>
          )}
        </div>
      </div>

      {/* Call Modal */}
      <CallModal
        isOpen={isCalling}
        onClose={() => setIsCalling(false)}
        participantName={isPriestUser ? booking.customerName : booking.priestName}
        participantPhone={isPriestUser ? (booking.customerPhone || '+91 98451 22334') : priestPhone}
        participantTitle={isPriestUser ? 'Devotee' : (booking.priestTitle || 'Vedic Acharya')}
        participantRole={isPriestUser ? 'customer' : 'priest'}
        bookingId={booking.id}
        eventName={booking.eventName}
      />

      {/* Review Modal */}
      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => {
          setIsReviewOpen(false);
          fetchDetail();
        }}
        bookingId={booking.id}
        priestId={booking.priestId}
        priestName={booking.priestName}
        eventName={booking.eventName}
        customerId={booking.customerId}
        customerName={booking.customerName}
        onReviewSubmitted={() => {
          success('Your divine review was successfully registered!');
          fetchDetail();
        }}
      />

      {/* Cancel Confirmation Modal with Dynamic Rules Message */}
      <ConfirmationModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleCancelBooking}
        title={cancelRules.dialogTitle}
        message={cancelRules.dialogMessage}
        confirmText="Yes, Cancel"
        type="danger"
        isLoading={cancelling}
      />

      {/* Report Issue Modal */}
      <ReportIssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        bookingId={booking.id}
        reporterId={currentUser?.id || (isPriestUser ? booking.priestId : booking.customerId)}
        reporterName={isPriestUser ? booking.priestName : (currentUser?.name || booking.customerName)}
        reporterEmail={currentUser?.email || ''}
        reportedUserId={isPriestUser ? booking.customerId : booking.priestId}
        reportedUserName={isPriestUser ? booking.customerName : booking.priestName}
        reporterRole={isPriestUser ? 'priest' : 'customer'}
        onSuccess={() => {
          success('Your confidential report has been submitted to the Acharya Council.');
        }}
      />
    </div>
  );
};

