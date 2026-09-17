import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useBooking } from '../../context/BookingContext';
import { priestService } from '../../services/priestService';
import { Priest, PriestRequest, Booking, RejectionReason } from '../../types';
import { RequestCard } from '../../components/RequestCard';
import { BookingCard } from '../../components/BookingCard';
import { RejectRequestModal } from '../../components/RejectRequestModal';
import { PriestProtectionPanel } from '../../components/PriestProtectionPanel';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { formatCurrency } from '../../utils';
import {
  Calendar,
  Clock,
  DollarSign,
  Star,
  Flame,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  BellRing
} from 'lucide-react';

export const PriestDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { success, error } = useToast();
  const { requests, bookings, refreshRequests, refreshBookings, acceptRequest, rejectRequest } = useBooking();

  const [priest, setPriest] = useState<Priest | null>(null);
  const [loading, setLoading] = useState(true);

  // Reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetRequest, setTargetRequest] = useState<PriestRequest | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchPriestInfo = async () => {
    setLoading(true);
    try {
      const priestId = currentUser?.id || priest?.id || '';
      const [pData] = await Promise.all([
        priestId ? priestService.getPriestById(priestId) : Promise.resolve(null),
        refreshRequests(),
        refreshBookings()
      ]);
      setPriest(pData || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriestInfo();
  }, [currentUser]);

  const handleAcceptRequest = async (requestId: string) => {
    setIsActionLoading(true);
    try {
      await acceptRequest(requestId);
      success('Request accepted! The devotee has been notified to proceed with payment.');
    } catch {
      error('Failed to accept request.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleOpenRejectModal = (req: PriestRequest) => {
    setTargetRequest(req);
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (reason: RejectionReason | string, notes?: string) => {
    if (!targetRequest) return;
    setIsActionLoading(true);
    try {
      await rejectRequest(targetRequest.id, reason, notes);
      success('Request declined with specified reason.');
    } catch {
      error('Failed to decline request.');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading Acharya workspace..." fullHeight />;
  }

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const acceptedRequests = requests.filter((r) => r.status === 'ACCEPTED' || r.status === 'PAYMENT_PENDING');
  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending');
  const completedBookings = bookings.filter((b) => b.status === 'completed');

  const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.totalAmount * 0.95), 0);

  return (
    <div className="space-y-8">
      {/* 1. WELCOME BANNER */}
      <div className="bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-amber-500/20">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
            Acharya Workspace
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold">
            Namaskaram, {currentUser?.name || priest?.name || 'Pandit ji'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 mt-1">
            You have <strong className="text-amber-300">{pendingRequests.length} new booking requests</strong> requiring your availability review.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/priest/availability">
            <Button variant="gold" size="sm" leftIcon={<Clock className="w-4 h-4" />}>
              Set Availability
            </Button>
          </Link>
          <Link to="/priest/bookings">
            <Button variant="outline" size="sm" className="text-white border-stone-700 hover:bg-stone-800">
              Manage All Requests
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">New Requests</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{pendingRequests.length}</p>
          <span className="text-[11px] text-amber-700 font-medium mt-1 block">Awaiting your response</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Awaiting Payment</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{acceptedRequests.length}</p>
          <span className="text-[11px] text-emerald-700 font-medium mt-1 block">Accepted by you</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Confirmed Pujas</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{confirmedBookings.length}</p>
          <span className="text-[11px] text-blue-700 font-medium mt-1 block">Paid & scheduled</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Acharya Rating</span>
            <div className="w-8 h-8 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{priest?.rating || 4.9} ★</p>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">{priest?.reviewCount || 18} reviews</span>
        </div>
      </div>

      {/* Priest Platform Protection & Privileges Panel */}
      <PriestProtectionPanel
        priestId={currentUser?.id || priest?.id || ''}
        priestName={currentUser?.name || priest?.name || 'Pandit ji'}
      />

      {/* 3. NEW BOOKING REQUESTS (PENDING PRIEST APPROVAL) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-amber-600" />
            <span>New Booking Requests ({pendingRequests.length})</span>
          </h2>
          <Link to="/priest/bookings">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              View All Requests
            </Button>
          </Link>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-slate-900 text-sm">All caught up!</h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              You have no pending requests at the moment. New requests from devotees will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pendingRequests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                isPriestView
                onAccept={handleAcceptRequest}
                onReject={handleOpenRejectModal}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. UPCOMING CONFIRMED PUJAS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-stone-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#701a28]" />
            <span>Upcoming Confirmed Ceremonies ({confirmedBookings.length})</span>
          </h2>
          <Link to="/priest/bookings">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              All Bookings
            </Button>
          </Link>
        </div>

        {confirmedBookings.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <p className="text-slate-600 text-sm font-semibold">No confirmed upcoming pujas at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {confirmedBookings.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                isPriestView
              />
            ))}
          </div>
        )}
      </section>

      {/* REJECTION MODAL */}
      <RejectRequestModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onConfirmReject={handleConfirmReject}
        requestTitle={targetRequest?.eventName}
        customerName={targetRequest?.customerName}
        date={targetRequest?.date}
        time={targetRequest?.time}
        isLoading={isActionLoading}
      />
    </div>
  );
};
