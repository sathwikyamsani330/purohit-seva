import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useBooking } from '../../context/BookingContext';
import { requestService } from '../../services/requestService';
import { bookingService } from '../../services/bookingService';
import { Booking, PriestRequest } from '../../types';
import { BookingCard } from '../../components/BookingCard';
import { RequestCard } from '../../components/RequestCard';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { normalizeBookingStatus } from '../../utils/bookingStatus';
import {
  Calendar,
  Search,
  Filter,
  Plus,
  Clock,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  CreditCard,
  Flame,
  ArrowRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';

type TabType = 'all' | 'requests' | 'accepted' | 'confirmed' | 'completed' | 'rejected';

export const MyBookingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const { requests, bookings, refreshRequests, refreshBookings } = useBooking();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Cancel request modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [itemToCancel, setItemToCancel] = useState<{ id: string; type: 'request' | 'booking' } | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([refreshRequests(), refreshBookings()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleCancelClick = (id: string, type: 'request' | 'booking' = 'booking') => {
    setItemToCancel({ id, type });
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!itemToCancel) return;
    setCancelling(true);
    try {
      if (itemToCancel.type === 'request') {
        await requestService.cancelRequest(itemToCancel.id, 'Cancelled by client');
        success('Puja request cancelled.');
      } else {
        await bookingService.cancelBooking(itemToCancel.id, 'Cancelled by customer');
        success('Confirmed booking cancelled.');
      }
      setCancelModalOpen(false);
      loadData();
    } catch {
      error('Failed to cancel. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.priestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'requests') return r.status === 'PENDING';
    if (activeTab === 'accepted') return r.status === 'ACCEPTED' || r.status === 'PAYMENT_PENDING';
    if (activeTab === 'rejected') return r.status === 'REJECTED' || r.status === 'CANCELLED';
    if (activeTab === 'confirmed') return false; // Handled under bookings
    if (activeTab === 'completed') return false;
    return true; // 'all' tab shows non-confirmed requests too
  });

  // Filter confirmed bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.priestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'requests') return false;
    if (activeTab === 'accepted') return false;

    const s = normalizeBookingStatus(b.bookingStatus || b.status);
    if (activeTab === 'rejected') return s === 'CANCELLED' || s === 'REJECTED';
    if (activeTab === 'confirmed') return s === 'CONFIRMED' || s === 'PRIEST_ON_THE_WAY' || s === 'PRIEST_ARRIVED' || s === 'CEREMONY_STARTED';
    if (activeTab === 'completed') return s === 'COMPLETED';
    return true; // 'all'
  });

  const counts = {
    all: requests.length + bookings.length,
    requests: requests.filter(r => r.status === 'PENDING').length,
    accepted: requests.filter(r => r.status === 'ACCEPTED' || r.status === 'PAYMENT_PENDING').length,
    confirmed: bookings.filter(b => {
      const s = normalizeBookingStatus(b.bookingStatus || b.status);
      return s === 'CONFIRMED' || s === 'PRIEST_ON_THE_WAY' || s === 'PRIEST_ARRIVED' || s === 'CEREMONY_STARTED';
    }).length,
    completed: bookings.filter(b => normalizeBookingStatus(b.bookingStatus || b.status) === 'COMPLETED').length,
    rejected: requests.filter(r => r.status === 'REJECTED' || r.status === 'CANCELLED').length +
      bookings.filter(b => {
        const s = normalizeBookingStatus(b.bookingStatus || b.status);
        return s === 'CANCELLED' || s === 'REJECTED';
      }).length
  };

  const hasAcceptedToPay = counts.accepted > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#701a28] block mb-1">
            Customer Dashboard
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
            My Puja Requests & Bookings
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Track your priest requests, pending approvals, accepted ceremonies awaiting payment, and confirmed bookings.
          </p>
        </div>

        <Link to="/priests">
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
            Request New Priest
          </Button>
        </Link>
      </div>

      {/* Prominent Action Banner when any request is accepted and ready to pay */}
      {hasAcceptedToPay && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent rounded-2xl border border-emerald-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="font-bold text-emerald-950 text-sm">
                Priest Accepted! Action Required
              </h4>
              <p className="text-xs text-emerald-800">
                You have {counts.accepted} accepted priest {counts.accepted === 1 ? 'request' : 'requests'} waiting for payment. Complete payment to secure your booking ID.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 whitespace-nowrap shadow-md shadow-emerald-600/20"
            onClick={() => setActiveTab('accepted')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            View Accepted ({counts.accepted})
          </Button>
        </div>
      )}

      {/* Tabs & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>All Items</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
            }`}>
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <span>Pending Requests</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'requests' ? 'bg-amber-800 text-amber-100' : 'bg-amber-200 text-amber-900'
            }`}>
              {counts.requests}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('accepted')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'accepted'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <span>Accepted (Pay Now)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'accepted' ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-200 text-emerald-950'
            }`}>
              {counts.accepted}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('confirmed')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'confirmed'
                ? 'bg-[#701a28] text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <span>Confirmed Bookings</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'confirmed' ? 'bg-[#59131e] text-[#fdf2f4]' : 'bg-stone-200 text-stone-700'
            }`}>
              {counts.confirmed}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'completed'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Completed</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'completed' ? 'bg-slate-900 text-slate-300' : 'bg-slate-200 text-slate-700'
            }`}>
              {counts.completed}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rejected')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'rejected'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60'
            }`}
          >
            <span>Unavailable / Cancelled</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'rejected' ? 'bg-rose-800 text-rose-100' : 'bg-rose-200 text-rose-900'
            }`}>
              {counts.rejected}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="w-full md:w-64">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search ceremonies or priests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent outline-none"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <LoadingState message="Loading your requests and bookings..." />
      ) : filteredRequests.length === 0 && filteredBookings.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-8 h-8 text-[#701a28]" />}
          title="No Items Found"
          description="You don't have any requests or bookings matching this filter."
          actionLabel="Request a Priest"
          onAction={() => navigate('/priests')}
        />
      ) : (
        <div className="space-y-8">
          {/* SECTION 1: PRIEST REQUESTS (if any matching) */}
          {filteredRequests.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  Priest Requests ({filteredRequests.length})
                </h3>
                <span className="text-xs text-slate-400">
                  Request → Priest Review → Payment
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRequests.map((req) => (
                  <RequestCard
                    key={req.id}
                    request={req}
                    isPriestView={false}
                    onPay={(r) => navigate(`/payment?requestId=${r.id}`)}
                    onCancel={(id) => handleCancelClick(id, 'request')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: CONFIRMED BOOKINGS (if any matching) */}
          {filteredBookings.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Confirmed Bookings ({filteredBookings.length})
                </h3>
                <span className="text-xs text-slate-400">
                  Paid & Scheduled Vedic Pujas
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBookings.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    onCancel={(id) => handleCancelClick(id, 'booking')}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title={itemToCancel?.type === 'request' ? 'Cancel Priest Request?' : 'Cancel Confirmed Puja Booking?'}
        message="Are you sure you want to cancel this item? The officiating Acharya will be notified and the slot will be released."
        confirmText="Yes, Cancel"
        type="danger"
        isLoading={cancelling}
      />
    </div>
  );
};
