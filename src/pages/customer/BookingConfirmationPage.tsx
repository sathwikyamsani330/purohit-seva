import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { bookingService } from '../../services/bookingService';
import { Booking } from '../../types';
import { Button } from '../../components/Button';
import { Avatar } from '../../components/Avatar';
import { LoadingState } from '../../components/LoadingState';
import { formatCurrency, formatDate } from '../../utils';
import { canShowContactDetails, formatDisplayPhone, getCleanTelUrl } from '../../utils/contactVisibility';
import { ProtectionCard, CustomerSafetyNotice } from '../../components/ProtectionCard';
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Flame,
  ArrowRight,
  Home,
  FileText,
  Printer,
  Sparkles,
  Copy,
  Check,
  CreditCard,
  Phone,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { CallModal } from '../../components/CallModal';

export const BookingConfirmationPage: React.FC = () => {
  const { id: paramId, bookingId: paramBookingId } = useParams<{ id?: string; bookingId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeId = paramId || paramBookingId || searchParams.get('id') || searchParams.get('bookingId');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isCalling, setIsCalling] = useState(false);

  useEffect(() => {
    // Fire celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }

    const loadBooking = async () => {
      if (!activeId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await bookingService.getBookingById(activeId);
        setBooking(data || null);
      } finally {
        setLoading(false);
      }
    };
    loadBooking();
  }, [activeId]);

  const handleCopyId = () => {
    if (booking?.id) {
      navigator.clipboard.writeText(booking.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return <LoadingState message="Fetching auspicious booking confirmation..." fullHeight />;
  }

  if (!booking) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <FileText className="w-6 h-6" />
        </div>
        <h2 className="font-heading text-xl font-bold text-slate-900">Booking Record Not Found</h2>
        <p className="text-xs text-slate-600">
          The requested booking confirmation {activeId ? `"${activeId}"` : ''} could not be located.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link to="/bookings">
            <Button variant="outline">View My Bookings</Button>
          </Link>
          <Link to="/">
            <Button variant="primary">Return to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const formattedAddress = booking.address?.fullAddress || (
    booking.address
      ? `${booking.address.street}, ${booking.address.area}, ${booking.address.city} - ${booking.address.pincode}`
      : String(booking.location || 'Ceremony Venue')
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* 1. SUCCESS HERO HEADER */}
      <div className="text-center space-y-3 bg-white rounded-3xl border border-[#f5ccd2] p-8 shadow-xs">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="inline-flex items-center gap-1.5 bg-[#fdf2f4] text-[#701a28] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-[#f5ccd2]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Auspicious Booking Confirmed</span>
        </div>

        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
          Shubham Astu! Your Puja is Scheduled
        </h1>

        <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
          We have notified <strong>{booking.priestName}</strong>. You will receive an SMS and WhatsApp
          confirmation with preparation instructions. Direct messaging is now unlocked!
        </p>

        {/* Booking Reference with Copy Action */}
        <div className="pt-2 flex items-center justify-center gap-2">
          <span className="font-mono text-xs sm:text-sm font-bold bg-[#faf8f5] text-stone-800 px-3.5 py-1.5 rounded-xl border border-[#eadfd9] flex items-center gap-2">
            Booking ID: <span className="text-[#701a28]">{booking.id}</span>
          </span>
          <button
            onClick={handleCopyId}
            title="Copy Booking ID"
            className="p-1.5 rounded-lg border border-[#eadfd9] hover:bg-[#fdf2f4] text-stone-600 transition cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Purohit Seva Protection System */}
      <ProtectionCard
        bookingId={booking.id}
        isConfirmed={true}
      />

      {/* 2. SUMMARY RECEIPT CARD */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
        <h3 className="font-heading text-lg font-bold text-stone-900 pb-3 border-b border-stone-100 flex items-center justify-between">
          <span>Ceremony Details</span>
          <span className="text-xs font-bold text-emerald-700 capitalize bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            {booking.bookingStatus || booking.status || 'Confirmed'}
          </span>
        </h3>

        {/* Priest & Puja */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Avatar src={booking.priestImage || booking.priestAvatar} name={booking.priestName} size="lg" className="rounded-xl" />
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-stone-900 text-base">{booking.eventName}</h4>
              <p className="text-xs text-[#701a28] font-semibold">{booking.serviceName}</p>
              <p className="text-xs text-stone-500 mt-0.5">Officiating Purohit: <strong>{booking.priestName}</strong></p>
            </div>
          </div>
        </div>

        {/* Dedicated CONTACT PRIEST Section */}
        {canShowContactDetails(booking) ? (
          <div className="p-4 rounded-2xl bg-[#fdf2f4] border border-[#f5ccd2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#701a28] block">
                Contact Priest
              </span>
              <p className="text-sm font-bold text-stone-900">
                {booking.priestName}
              </p>
              <p className="text-xs text-stone-600">
                Direct Mobile: <strong className="font-mono text-stone-900 font-bold text-sm">{formatDisplayPhone(booking.priestPhone, '+91 98450 11223')}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={getCleanTelUrl(booking.priestPhone, '+919845011223')}
                id="confirmation-direct-tel-btn"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>Call Priest</span>
              </a>
              <button
                onClick={() => setIsCalling(true)}
                id="confirmation-call-modal-btn"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold transition-colors"
                title="Open in-app call bridge"
              >
                <span>In-App Call</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center gap-3 text-stone-600">
            <Lock className="w-5 h-5 text-[#e5b869] shrink-0" />
            <div>
              <p className="text-xs font-bold text-stone-800">🔒 Contact details hidden</p>
              <p className="text-[11px] text-stone-500">Available after payment confirmation.</p>
            </div>
          </div>
        )}

        {/* Date, Time & Venue */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#faf8f5] rounded-2xl p-4 text-xs text-stone-700 border border-[#eadfd9]">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-[#701a28] shrink-0" />
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Ceremony Date</span>
              <span className="font-bold text-stone-900">{formatDate(booking.date)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-[#701a28] shrink-0" />
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Muhurtham Slot</span>
              <span className="font-bold text-stone-900">{booking.time || booking.timeSlot}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 sm:col-span-2 pt-2 border-t border-[#eadfd9]">
            <MapPin className="w-4 h-4 text-[#701a28] shrink-0 mt-0.5" />
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Ceremony Venue</span>
              <span className="font-medium text-stone-800">
                {formattedAddress}
              </span>
            </div>
          </div>

          {(booking.notes || booking.specialNotes) && (
            <div className="flex items-start gap-2.5 sm:col-span-2 pt-2 border-t border-[#eadfd9]">
              <FileText className="w-4 h-4 text-[#701a28] shrink-0 mt-0.5" />
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Special Instructions / Gotra</span>
                <span className="font-medium text-stone-800 italic">
                  "{booking.notes || booking.specialNotes}"
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Financials Breakdown */}
        <div className="space-y-2 text-xs pt-2 border-t border-stone-100">
          <div className="flex justify-between text-stone-600">
            <span>Puja Service Dakshina:</span>
            <span className="font-semibold">{formatCurrency(booking.serviceCharge || booking.servicePrice || booking.subtotal || 5000)}</span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Platform Fee:</span>
            <span className="font-semibold">{formatCurrency(booking.platformFee || 250)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-stone-900 pt-2 border-t border-stone-100">
            <span>Total Paid Amount:</span>
            <span className="text-[#701a28] font-extrabold">{formatCurrency(booking.totalAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <div className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span>Payment Mode: <strong>{booking.paymentMethod}</strong></span>
            </div>
            <div>
              Status: <strong className="capitalize text-emerald-700">{booking.paymentStatus || 'Completed'}</strong>
            </div>
          </div>

          {(booking.paymentId || booking.orderId) && (
            <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/80 text-[11px] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-amber-900 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  Gateway Security Reference:
                </span>
                <span className="text-[10px] font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-bold">
                  {booking.isDemoPayment ? 'DEMO GATEWAY' : 'RAZORPAY VERIFIED'}
                </span>
              </div>
              {booking.orderId && (
                <div className="text-stone-600 font-mono text-[10px]">
                  Order ID: <strong>{booking.orderId}</strong>
                </div>
              )}
              {booking.paymentId && (
                <div className="text-stone-600 font-mono text-[10px]">
                  Payment ID: <strong>{booking.paymentId}</strong>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. ACTION CTAS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Link to="/" className="w-full sm:w-auto">
          <Button variant="outline" fullWidth leftIcon={<Home className="w-4 h-4" />}>
            Back to Home
          </Button>
        </Link>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => window.print()}
            type="button"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Download / Print Receipt</span>
          </button>

          <Link to={`/bookings/${booking.id}`} className="w-full sm:w-auto">
            <Button variant="primary" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
              Booking Details & Actions
            </Button>
          </Link>
        </div>
      </div>

      {/* Call Modal */}
      {booking && (
        <CallModal
          isOpen={isCalling}
          onClose={() => setIsCalling(false)}
          participantName={booking.priestName}
          participantPhone={booking.priestPhone}
          participantTitle={booking.priestTitle || 'Vedic Acharya'}
          participantRole="priest"
          bookingId={booking.id}
          eventName={booking.eventName}
        />
      )}
    </div>
  );
};
