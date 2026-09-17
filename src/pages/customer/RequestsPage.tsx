import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CreditCard,
  Search,
  Calendar,
  MapPin,
  ChevronRight,
  UserCheck,
  Star,
  RefreshCw,
  Send,
  MessageSquare
} from 'lucide-react';
import { useBooking } from '../../context/BookingContext';
import { PriestRequest, RequestStatus } from '../../types';

export const RequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { requests, refreshRequests } = useBooking();
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'>('PENDING');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshRequests();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshRequests();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const filteredRequests = requests.filter((req) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'PENDING') return req.status === 'PENDING';
    if (activeTab === 'ACCEPTED') return req.status === 'ACCEPTED' || req.status === 'PAYMENT_PENDING';
    if (activeTab === 'REJECTED') return req.status === 'REJECTED';
    if (activeTab === 'CANCELLED') return req.status === 'CANCELLED' || req.status === 'PAYMENT_COMPLETED' || req.status === 'CONFIRMED';
    return true;
  });

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 animate-spin text-amber-600" />
            Awaiting Response
          </span>
        );
      case 'ACCEPTED':
      case 'PAYMENT_PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Accepted • Payment Required
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Rejected
          </span>
        );
      case 'PAYMENT_COMPLETED':
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            Confirmed Booking
          </span>
        );
      case 'CANCELLED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
            <AlertCircle className="w-3.5 h-3.5 text-stone-500" />
            Cancelled
          </span>
        );
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const acceptedCount = requests.filter((r) => r.status === 'ACCEPTED' || r.status === 'PAYMENT_PENDING').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-amber-800 tracking-wider uppercase mb-1">
              <Send className="w-3.5 h-3.5 text-amber-600" />
              <span>Devotee Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
              Priest Booking Requests
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Track priest availability responses, complete payments, or request alternative Acharyas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-semibold shadow-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link
              to="/priests"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Find Priests</span>
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-stone-200 pb-2 mb-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'PENDING'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <span>Pending</span>
            {pendingCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'PENDING' ? 'bg-amber-700 text-amber-100' : 'bg-amber-100 text-amber-800'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ACCEPTED')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'ACCEPTED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <span>Accepted</span>
            {acceptedCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'ACCEPTED' ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {acceptedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('REJECTED')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <span>Rejected</span>
            {rejectedCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'REJECTED' ? 'bg-rose-700 text-rose-100' : 'bg-rose-100 text-rose-800'
              }`}>
                {rejectedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'ALL'
                ? 'bg-stone-800 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            All Requests ({requests.length})
          </button>
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-serif font-bold text-stone-900">No requests in this tab</h3>
            <p className="text-sm text-stone-500 max-w-md mx-auto mt-1 mb-6">
              When you request a priest for any Vedic puja ceremony, the pending status and priest replies appear here.
            </p>
            <Link
              to="/priests"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Explore Verified Priests</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                id={`request-card-${req.id}`}
                className="bg-white rounded-2xl border border-stone-200/90 shadow-sm hover:shadow-md transition-shadow p-5 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-stone-100">
                  <div className="flex items-start gap-4">
                    <img
                      src={req.priestAvatar || req.priestImage || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2'}
                      alt={req.priestName}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-200/70 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-serif font-bold text-stone-900">
                          {req.eventName}
                        </h3>
                        {getStatusBadge(req.status)}
                      </div>
                      <p className="text-sm text-stone-700 font-medium flex items-center gap-1.5 mt-0.5">
                        <span>Requested Priest:</span>
                        <span className="text-amber-900 font-semibold">{req.priestName}</span>
                        {req.priestRating && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            {req.priestRating}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-stone-400 mt-1 font-mono">
                        Request ID: <span className="font-semibold text-stone-700">{req.id}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-xs text-stone-500">Dakshina Amount</div>
                    <div className="text-xl font-bold text-stone-900">₹{req.totalAmount || (req.servicePrice + 250)}</div>
                    <div className="text-[11px] text-stone-400">Includes samagri & service fee</div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-3.5 text-xs text-stone-600 bg-stone-50/70 px-4 rounded-xl mt-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                    <span><strong className="text-stone-800">Date:</strong> {req.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span><strong className="text-stone-800">Muhurtham:</strong> {req.time}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-1 col-span-1">
                    <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="truncate"><strong className="text-stone-800">Venue:</strong> {req.location}</span>
                  </div>
                </div>

                {/* Notes or Rejection Reason Banner */}
                {req.status === 'REJECTED' && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-xs text-rose-800">
                    <div className="font-semibold flex items-center gap-1.5 text-rose-900">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Priest is Unavailable for this Slot</span>
                    </div>
                    <p className="mt-0.5 text-rose-700">
                      Reason: <strong className="font-medium">{req.rejectionReason || 'Schedule conflict'}</strong>
                      {req.rejectionNotes ? ` — "${req.rejectionNotes}"` : ''}
                    </p>
                  </div>
                )}

                {req.notes && req.status !== 'REJECTED' && (
                  <div className="mt-3 px-3 py-2 rounded-xl bg-amber-50/60 border border-amber-200/50 text-xs text-amber-900">
                    <span className="font-semibold text-amber-950">Devotee Notes: </span>
                    <span>{req.notes}</span>
                  </div>
                )}

                {/* Action Row */}
                <div className="mt-4 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-stone-500">
                    {req.status === 'PENDING' && (
                      <span className="text-amber-800 font-medium">
                        No payment is required until the priest confirms availability.
                      </span>
                    )}
                    {(req.status === 'ACCEPTED' || req.status === 'PAYMENT_PENDING') && (
                      <span className="text-emerald-800 font-medium">
                        Priest accepted availability. Please pay to finalize booking.
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    {(req.status === 'ACCEPTED' || req.status === 'PAYMENT_PENDING') && (
                      <button
                        onClick={() => navigate(`/payment/${req.id}`)}
                        id={`pay-btn-${req.id}`}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Proceed to Payment</span>
                      </button>
                    )}

                    {req.status === 'REJECTED' && (
                      <Link
                        to="/priests"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-colors"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Find Another Priest</span>
                      </Link>
                    )}

                    {req.bookingId && (
                      <Link
                        to={`/bookings/${req.bookingId}`}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold shadow-sm transition-colors"
                      >
                        <span>View Confirmed Booking</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
