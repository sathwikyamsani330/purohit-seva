import React, { useEffect, useState } from 'react';
import { bookingService } from '../../services/bookingService';
import { Booking, BookingSupportRequest, BookingStatus } from '../../types';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { LoadingState } from '../../components/LoadingState';
import { formatCurrency, formatDate } from '../../utils';
import {
  normalizeBookingStatus,
  getStatusDisplayMeta,
  CanonicalBookingStatus
} from '../../utils/bookingStatus';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Car,
  MapPin,
  Flame,
  Award,
  ShieldAlert,
  Clock,
  Phone,
  HelpCircle,
  ChevronRight,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export const AdminBookingsPage: React.FC = () => {
  const { success, error } = useToast();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'bookings' | 'support'>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [supportRequests, setSupportRequests] = useState<BookingSupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Booking detail modal & override
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<CanonicalBookingStatus>('CONFIRMED');
  const [overrideReason, setOverrideReason] = useState('');
  const [isOverriding, setIsOverriding] = useState(false);

  // Support ticket resolution
  const [activeSupportTicket, setActiveSupportTicket] = useState<BookingSupportRequest | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allBookings, allSupport] = await Promise.all([
        bookingService.getAllBookings(),
        bookingService.getSupportRequests()
      ]);
      setBookings(allBookings);
      setSupportRequests(allSupport);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleCustomEvent = () => {
      loadData();
    };
    window.addEventListener('purohit_booking_updated', handleCustomEvent);
    window.addEventListener('purohit_data_updated', handleCustomEvent);

    return () => {
      window.removeEventListener('purohit_booking_updated', handleCustomEvent);
      window.removeEventListener('purohit_data_updated', handleCustomEvent);
    };
  }, []);

  const handleAdminOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBooking) return;

    setIsOverriding(true);
    try {
      const updated = await bookingService.adminOverrideStatus(
        activeBooking.id,
        overrideStatus as unknown as BookingStatus,
        currentUser?.id || 'admin-root',
        currentUser?.name || 'Senior Admin',
        overrideReason.trim() || 'Admin manual verification'
      );
      success(`Booking status updated to ${overrideStatus}`);
      setActiveBooking(updated);
      setOverrideReason('');
      loadData();
    } catch (err: any) {
      error(err?.message || 'Failed to update booking status.');
    } finally {
      setIsOverriding(false);
    }
  };

  const handleResolveSupport = async (status: 'IN_PROGRESS' | 'RESOLVED') => {
    if (!activeSupportTicket) return;
    setIsResolving(true);
    try {
      await bookingService.updateSupportRequestStatus(
        activeSupportTicket.id,
        status,
        resolveNotes.trim()
      );
      success(`Support ticket marked as ${status}`);
      setActiveSupportTicket(null);
      setResolveNotes('');
      loadData();
    } catch {
      error('Failed to update support ticket.');
    } finally {
      setIsResolving(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.id.toLowerCase().includes(search.toLowerCase()) ||
      b.eventName.toLowerCase().includes(search.toLowerCase()) ||
      b.customerName.toLowerCase().includes(search.toLowerCase()) ||
      b.priestName.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;

    const s = normalizeBookingStatus(b.bookingStatus || b.status);
    return s === statusFilter;
  });

  const openSupportCount = supportRequests.filter((r) => r.status === 'OPEN').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 block mb-1">
            Operations Console
          </span>
          <h1 className="font-heading text-2xl font-bold text-stone-900">
            Live Booking & Ceremony Tracking Control
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time monitor for Acharya journeys, puja milestones, and devotee concierge escalations.
          </p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Primary Tab Bar */}
      <div className="flex items-center gap-3 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'bookings'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Active Bookings & Ceremonies</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-stone-700 text-stone-200">
            {bookings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('support')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'support'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Emergency Support Tickets</span>
          {openSupportCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-800 text-rose-100 font-bold animate-pulse">
              {openSupportCount} OPEN
            </span>
          )}
        </button>
      </div>

      {activeTab === 'bookings' ? (
        <>
          {/* Search and Status Filters */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-800 w-full sm:w-80">
              <Search className="w-4 h-4 text-stone-400 shrink-0" />
              <input
                type="text"
                placeholder="Search by ID, ceremony, client, priest..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-stone-500 font-semibold">Lifecycle State:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-medium bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 outline-hidden"
              >
                <option value="all">All Ceremonies</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PRIEST_ON_THE_WAY">Priest En Route</option>
                <option value="PRIEST_ARRIVED">Priest Arrived</option>
                <option value="CEREMONY_STARTED">Ceremony In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Bookings Table */}
          {loading ? (
            <LoadingState message="Loading platform ceremony registry..." />
          ) : (
            <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase font-semibold">
                    <tr>
                      <th className="p-4">Reference</th>
                      <th className="p-4">Ceremony</th>
                      <th className="p-4">Devotee</th>
                      <th className="p-4">Officiating Purohit</th>
                      <th className="p-4">Muhurtham</th>
                      <th className="p-4">Live Lifecycle Status</th>
                      <th className="p-4 text-right">Dakshina</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredBookings.map((b) => {
                      const canonical = normalizeBookingStatus(b.bookingStatus || b.status);
                      const meta = getStatusDisplayMeta(canonical);
                      const isLive =
                        canonical === 'PRIEST_ON_THE_WAY' ||
                        canonical === 'PRIEST_ARRIVED' ||
                        canonical === 'CEREMONY_STARTED';

                      return (
                        <tr key={b.id} className={`hover:bg-stone-50/60 transition ${isLive ? 'bg-amber-50/30' : ''}`}>
                          <td className="p-4 font-mono font-bold text-stone-900">{b.id}</td>
                          <td className="p-4">
                            <p className="font-bold text-stone-900">{b.eventName}</p>
                            <p className="text-[11px] text-amber-800">{b.serviceName}</p>
                          </td>
                          <td className="p-4">
                            <p className="font-medium text-stone-800">{b.customerName}</p>
                            <p className="text-[11px] text-stone-500">{b.customerPhone}</p>
                          </td>
                          <td className="p-4">
                            <p className="font-medium text-stone-800">{b.priestName}</p>
                            <p className="text-[11px] text-stone-500">{b.priestPhone}</p>
                          </td>
                          <td className="p-4 text-stone-600">
                            <p className="font-semibold text-stone-900">{formatDate(b.date)}</p>
                            <p className="text-[11px] text-stone-400">{b.time || b.timeSlot}</p>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${meta.badgeBg} ${meta.badgeBorder} ${meta.badgeText}`}>
                              <span className={`w-2 h-2 rounded-full ${meta.dotColor} ${isLive ? 'animate-ping' : ''}`} />
                              {meta.label}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <p className="font-extrabold text-stone-900">{formatCurrency(b.totalAmount)}</p>
                            {b.escrowStatus && (
                              <span className="inline-block text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 mt-0.5">
                                {b.escrowStatus}
                              </span>
                            )}
                            {b.paymentId && (
                              <p className="text-[9px] font-mono text-stone-400 mt-0.5 truncate max-w-[90px] ml-auto">
                                {b.paymentId}
                              </p>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setActiveBooking(b);
                                setOverrideStatus(canonical);
                              }}
                              leftIcon={<Eye className="w-3.5 h-3.5" />}
                            >
                              Audit & Override
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Support Requests Section */
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2 mb-1">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Devotee & Acharya Help Desk Requests
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Direct emergency calls submitted by devotees during live ceremony lifecycle milestones.
            </p>

            {supportRequests.length === 0 ? (
              <div className="py-12 text-center text-stone-400 text-xs">
                No active support tickets. All ceremonies running harmoniously!
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {supportRequests.map((ticket) => (
                  <div key={ticket.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md">
                          {ticket.bookingId}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            ticket.status === 'OPEN'
                              ? 'bg-rose-100 text-rose-800'
                              : ticket.status === 'IN_PROGRESS'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {ticket.status}
                        </span>
                        <span className="text-xs text-stone-400">
                          {new Date(ticket.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-stone-900">{ticket.issueReason}</h4>
                      <p className="text-xs text-stone-600 italic">"{ticket.description}"</p>
                      <p className="text-[11px] text-stone-500">
                        Devotee: <strong>{ticket.customerName}</strong> ({ticket.customerPhone}) • Priest: {ticket.priestName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {ticket.customerPhone && (
                        <a
                          href={`tel:${ticket.customerPhone}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          Call Client
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setActiveSupportTicket(ticket);
                          setResolveNotes(ticket.resolvedNotes || '');
                        }}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                      >
                        Manage Ticket
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Booking Details & Audit Modal */}
      {activeBooking && (
        <Modal
          isOpen={Boolean(activeBooking)}
          onClose={() => setActiveBooking(null)}
          title={`Booking Audit & Timeline: ${activeBooking.id}`}
        >
          <div className="space-y-4 text-xs text-stone-700">
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-stone-900 text-sm">{activeBooking.eventName}</span>
                <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                  {normalizeBookingStatus(activeBooking.bookingStatus || activeBooking.status)}
                </span>
              </div>
              <p><strong>Devotee:</strong> {activeBooking.customerName} ({activeBooking.customerPhone})</p>
              <p><strong>Officiating Acharya:</strong> {activeBooking.priestName} ({activeBooking.priestPhone})</p>
              <p><strong>Muhurtham:</strong> {formatDate(activeBooking.date)} at {activeBooking.time || activeBooking.timeSlot}</p>
              <p><strong>Venue:</strong> {activeBooking.address?.street || activeBooking.location}, {activeBooking.address?.city}</p>
            </div>

            {/* Lifecycle Timestamps */}
            <div className="p-3 bg-stone-100 rounded-xl space-y-1 text-[11px]">
              <p className="font-bold text-stone-800 uppercase tracking-wide">Milestone Timestamps:</p>
              <p>• Journey Started: {activeBooking.journeyStartedAt || 'Not started'}</p>
              <p>• Arrived at Venue: {activeBooking.arrivedAt || 'Pending'}</p>
              <p>• Ceremony Started: {activeBooking.ceremonyStartedAt || 'Pending'}</p>
              <p>• Completed At: {activeBooking.completedAt || 'Pending'}</p>
            </div>

            {/* Audit History Log */}
            {activeBooking.statusHistory && activeBooking.statusHistory.length > 0 && (
              <div className="space-y-2">
                <p className="font-bold text-stone-800 uppercase tracking-wide text-[11px]">
                  Audit History Trail ({activeBooking.statusHistory.length} recorded events):
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-stone-50 rounded-xl border border-stone-200 text-[11px]">
                  {activeBooking.statusHistory.map((h, i) => (
                    <div key={h.id || i} className="flex justify-between border-b border-stone-200/60 pb-1 last:border-b-0">
                      <div>
                        <span className="font-bold text-stone-900">{h.newStatus}</span>
                        <span className="text-stone-500 ml-1">by {h.changedByName || h.changedByRole}</span>
                        {h.reason && <p className="text-stone-600 italic mt-0.5">{h.reason}</p>}
                      </div>
                      <span className="text-stone-400 font-mono shrink-0">
                        {new Date(h.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Override Controls Form */}
            <form onSubmit={handleAdminOverride} className="pt-3 border-t border-stone-200 space-y-3">
              <span className="text-xs text-stone-900 font-bold block">
                Admin Status Override & Intervention
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Set Canonical Status
                  </label>
                  <select
                    value={overrideStatus}
                    onChange={(e) => setOverrideStatus(e.target.value as CanonicalBookingStatus)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="CONFIRMED">CONFIRMED (Booking Validated)</option>
                    <option value="PRIEST_ON_THE_WAY">PRIEST_ON_THE_WAY (En Route)</option>
                    <option value="PRIEST_ARRIVED">PRIEST_ARRIVED (At Venue)</option>
                    <option value="CEREMONY_STARTED">CEREMONY_STARTED (Rituals Underway)</option>
                    <option value="COMPLETED">COMPLETED (Finalized & Points Awarded)</option>
                    <option value="CANCELLED">CANCELLED (Cancelled by Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Override Audit Reason
                  </label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g., Verified phone call with Devotee"
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveBooking(null)}
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isOverriding}
                >
                  Apply Status Override
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Support Ticket Resolution Modal */}
      {activeSupportTicket && (
        <Modal
          isOpen={Boolean(activeSupportTicket)}
          onClose={() => setActiveSupportTicket(null)}
          title={`Concierge Resolution: ${activeSupportTicket.issueReason}`}
        >
          <div className="space-y-4 text-xs text-stone-700">
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 space-y-1">
              <p className="text-sm font-bold text-rose-950">{activeSupportTicket.issueReason}</p>
              <p className="text-xs text-rose-800">"{activeSupportTicket.description}"</p>
              <p className="text-[11px] text-stone-600 pt-1">
                Booking ID: {activeSupportTicket.bookingId} • Client: {activeSupportTicket.customerName} ({activeSupportTicket.customerPhone})
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Resolution Notes / Action Taken
              </label>
              <textarea
                rows={3}
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="e.g., Called Pandit Ramesh, he is 5 mins away at main junction. Devotee informed."
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleResolveSupport('IN_PROGRESS')}
                disabled={isResolving}
                className="px-4 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors"
              >
                Mark In Progress
              </button>
              <button
                type="button"
                onClick={() => handleResolveSupport('RESOLVED')}
                disabled={isResolving}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
              >
                Resolve & Close Ticket
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
