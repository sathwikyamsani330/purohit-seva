import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useBooking } from '../../context/BookingContext';
import { PriestRequest, Booking, RejectionReason } from '../../types';
import { RequestCard } from '../../components/RequestCard';
import { BookingCard } from '../../components/BookingCard';
import { RejectRequestModal } from '../../components/RejectRequestModal';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { normalizeBookingStatus } from '../../utils/bookingStatus';
import { Search, Calendar, Clock, Flame, CheckCircle2, XCircle } from 'lucide-react';

type PriestTab = 'requests' | 'accepted' | 'confirmed' | 'completed' | 'rejected' | 'all';

export const PriestBookingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { success, error } = useToast();
  const { requests, bookings, refreshRequests, refreshBookings, acceptRequest, rejectRequest } = useBooking();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PriestTab>('requests');
  const [searchQuery, setSearchQuery] = useState('');

  // Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetRequest, setTargetRequest] = useState<PriestRequest | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

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

  const handleAcceptRequest = async (requestId: string) => {
    setIsActionLoading(true);
    try {
      await acceptRequest(requestId);
      success('Request accepted! The devotee has been notified to complete payment.');
      loadData();
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
      success('Request declined.');
      loadData();
    } catch {
      error('Failed to decline request.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeTab === 'requests') return r.status === 'PENDING';
    if (activeTab === 'accepted') return r.status === 'ACCEPTED' || r.status === 'PAYMENT_PENDING';
    if (activeTab === 'rejected') return r.status === 'REJECTED' || r.status === 'CANCELLED';
    if (activeTab === 'confirmed' || activeTab === 'completed') return false;
    return true; // 'all'
  });

  // Filter confirmed bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeTab === 'requests') return false;
    if (activeTab === 'accepted') return false;

    const s = normalizeBookingStatus(b.bookingStatus || b.status);
    if (activeTab === 'confirmed') {
      return s === 'CONFIRMED' || s === 'PRIEST_ON_THE_WAY' || s === 'PRIEST_ARRIVED' || s === 'CEREMONY_STARTED';
    }
    if (activeTab === 'completed') return s === 'COMPLETED';
    if (activeTab === 'rejected') return s === 'CANCELLED' || s === 'REJECTED';
    return true; // 'all'
  });

  const tabCounts = {
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
      }).length,
    all: requests.length + bookings.length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#701a28] block mb-1">
          Priest Portal
        </span>
        <h1 className="font-heading text-2xl font-bold text-stone-900">
          Puja Requests & Bookings Manager
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Review new customer requests, confirm your availability, and oversee scheduled ceremonies.
        </p>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <span>New Requests</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'requests' ? 'bg-amber-800 text-amber-100' : 'bg-amber-200 text-amber-950 font-bold'
            }`}>
              {tabCounts.requests}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('accepted')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'accepted'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <span>Awaiting Payment</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'accepted' ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-200 text-emerald-950 font-bold'
            }`}>
              {tabCounts.accepted}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('confirmed')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'confirmed'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>Confirmed Pujas</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'confirmed' ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-800 font-bold'
            }`}>
              {tabCounts.confirmed}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'completed'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>Completed</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'completed' ? 'bg-slate-900 text-slate-100' : 'bg-slate-200 text-slate-800 font-bold'
            }`}>
              {tabCounts.completed}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rejected')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'rejected'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-900 hover:bg-rose-100 border border-rose-200/60'
            }`}
          >
            <span>Declined / Cancelled</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'rejected' ? 'bg-rose-800 text-rose-100' : 'bg-rose-200 text-rose-950 font-bold'
            }`}>
              {tabCounts.rejected}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>All Items</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'all' ? 'bg-slate-800 text-slate-100' : 'bg-slate-200 text-slate-800 font-bold'
            }`}>
              {tabCounts.all}
            </span>
          </button>
        </div>

        <div className="w-full md:w-64">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by client or puja..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent outline-none"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState message="Loading priest booking records..." />
      ) : filteredRequests.length === 0 && filteredBookings.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-8 h-8 text-[#701a28]" />}
          title="No Records Found"
          description="There are no puja requests or bookings matching your filter selection."
        />
      ) : (
        <div className="space-y-6">
          {/* Priest Requests Cards */}
          {filteredRequests.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRequests.map((req) => (
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

          {/* Confirmed Bookings Cards */}
          {filteredBookings.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBookings.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  isPriestView
                />
              ))}
            </div>
          )}
        </div>
      )}

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
