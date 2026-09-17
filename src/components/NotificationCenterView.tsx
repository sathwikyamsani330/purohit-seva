import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Search,
  Filter,
  Calendar,
  CreditCard,
  Flame,
  Star,
  Gift,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  Settings,
  Trash2,
  RefreshCw,
  SlidersHorizontal,
  Info,
  ExternalLink
} from 'lucide-react';
import { AppNotification, NotificationCategory } from '../types';
import { notificationService } from '../services/notificationService';
import { NotificationPreferencesModal } from './NotificationPreferencesModal';
import { useAuth } from '../context/AuthContext';

interface NotificationCenterViewProps {
  role: 'customer' | 'priest' | 'admin';
  title?: string;
  subtitle?: string;
}

export const NotificationCenterView: React.FC<NotificationCenterViewProps> = ({
  role,
  title,
  subtitle
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | 'ALL'>('ALL');
  const [readFilter, setReadFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'urgent' | 'high' | 'normal'>('ALL');
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const effectiveUserId = role === 'admin' ? 'admin' : (currentUser?.id || '');

  useEffect(() => {
    // Real-time subscription across Firestore and local storage event bus
    const unsubscribe = notificationService.subscribeToNotifications(
      effectiveUserId,
      (list) => {
        setNotifications(list);
      },
      role
    );

    return () => {
      unsubscribe();
    };
  }, [effectiveUserId, role]);

  // Statistics calculation
  const totalCount = notifications.length;
  const unreadCount = notifications.filter((n) => !n.read).length;
  const urgentCount = notifications.filter((n) => n.priority === 'urgent' || n.priority === 'high').length;
  const bookingCount = notifications.filter(
    (n) => n.category === 'BOOKING' || n.category === 'CEREMONY'
  ).length;

  // Filtered list memo
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Read filter
      if (readFilter === 'UNREAD' && n.read) return false;
      if (readFilter === 'READ' && !n.read) return false;

      // Category filter
      if (selectedCategory !== 'ALL' && n.category !== selectedCategory) return false;

      // Priority filter
      if (priorityFilter !== 'ALL' && n.priority !== priorityFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = n.title.toLowerCase().includes(query);
        const matchMessage = n.message.toLowerCase().includes(query);
        const matchBooking = n.bookingId?.toLowerCase().includes(query);
        const matchRequest = n.requestId?.toLowerCase().includes(query);
        const matchReport = n.reportId?.toLowerCase().includes(query);
        if (!matchTitle && !matchMessage && !matchBooking && !matchRequest && !matchReport) {
          return false;
        }
      }

      return true;
    });
  }, [notifications, readFilter, selectedCategory, priorityFilter, searchQuery]);

  const handleMarkAsRead = async (id: string) => {
    await notificationService.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
    );
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    await notificationService.markAllNotificationsRead(effectiveUserId, role);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
    );
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await notificationService.deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleNotificationAction = async (notif: AppNotification) => {
    if (!notif.read) {
      await notificationService.markNotificationRead(notif.id);
    }

    if (notif.link) {
      navigate(notif.link);
    } else if (notif.bookingId) {
      if (role === 'priest') navigate('/priest/bookings');
      else if (role === 'admin') navigate('/admin/bookings');
      else navigate(`/bookings/${notif.bookingId}`);
    } else if (notif.requestId) {
      if (role === 'priest') navigate('/priest/bookings');
      else navigate('/requests');
    } else if (notif.reportId) {
      if (role === 'admin') navigate('/admin/protection');
      else navigate('/profile');
    }
  };

  const getCategoryIcon = (cat: NotificationCategory) => {
    switch (cat) {
      case 'BOOKING':
        return <Calendar className="w-4 h-4 text-amber-800" />;
      case 'PAYMENT':
        return <CreditCard className="w-4 h-4 text-emerald-800" />;
      case 'CEREMONY':
        return <Flame className="w-4 h-4 text-orange-800" />;
      case 'REVIEW':
        return <Star className="w-4 h-4 text-amber-600 fill-amber-500" />;
      case 'REWARDS':
        return <Gift className="w-4 h-4 text-purple-800" />;
      case 'SECURITY':
        return <ShieldAlert className="w-4 h-4 text-red-800" />;
      case 'SUPPORT':
        return <AlertCircle className="w-4 h-4 text-blue-800" />;
      default:
        return <Bell className="w-4 h-4 text-stone-800" />;
    }
  };

  const getCategoryBadgeClass = (cat: NotificationCategory) => {
    switch (cat) {
      case 'BOOKING':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'PAYMENT':
        return 'bg-emerald-50 text-emerald-900 border-emerald-200';
      case 'CEREMONY':
        return 'bg-orange-50 text-orange-900 border-orange-200';
      case 'REVIEW':
        return 'bg-yellow-50 text-yellow-900 border-yellow-200';
      case 'REWARDS':
        return 'bg-purple-50 text-purple-900 border-purple-200';
      case 'SECURITY':
        return 'bg-red-50 text-red-900 border-red-200';
      case 'SUPPORT':
        return 'bg-blue-50 text-blue-900 border-blue-200';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  const getPriorityBadge = (priority?: string) => {
    if (priority === 'urgent') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-red-100 text-red-800 border border-red-300 animate-pulse">
          Urgent
        </span>
      );
    }
    if (priority === 'high') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-300">
          High Priority
        </span>
      );
    }
    return null;
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hr ago`;
      if (diffHours < 48) return 'Yesterday';
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#fdf2f4]/80 to-amber-50/50 rounded-full blur-3xl -z-10 transform translate-x-20 -translate-y-20 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-8 h-8 rounded-xl bg-[#fdf2f4] text-[#701a28] flex items-center justify-center border border-[#f5ccd2]">
                <Bell className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#701a28]">
                {role === 'customer'
                  ? 'Devotee Updates & Alerts'
                  : role === 'priest'
                  ? 'Acharya Operations Feed'
                  : 'Master System Telemetry'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-stone-900">
              {title || 'Smart Notification Center'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl">
              {subtitle ||
                'Real-time ceremony tracking, priest journey alerts, escrow payment receipts, and security updates with zero refresh required.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={loading}
                className="px-3.5 py-2 text-xs font-bold text-[#701a28] bg-[#fdf2f4] hover:bg-[#fae4e7] border border-[#f5ccd2] rounded-xl transition cursor-pointer flex items-center gap-1.5"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Mark All Read</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setPreferencesModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 rounded-xl transition cursor-pointer flex items-center gap-1.5 border border-stone-200"
              title="Notification Settings"
            >
              <Settings className="w-4 h-4" />
              <span>Preferences</span>
            </button>
          </div>
        </div>

        {/* Real-time Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-stone-100">
          <div className="p-3.5 rounded-2xl bg-[#faf8f5] border border-stone-200/70">
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
              Total Alerts
            </span>
            <span className="text-xl font-heading font-bold text-stone-900 mt-0.5 block">
              {totalCount}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#fdf2f4] border border-[#f5ccd2]/80">
            <span className="text-[11px] font-semibold text-[#701a28] uppercase tracking-wider block">
              Unread Updates
            </span>
            <span className="text-xl font-heading font-bold text-[#701a28] mt-0.5 block">
              {unreadCount}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80">
            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
              Ceremonies & Bookings
            </span>
            <span className="text-xl font-heading font-bold text-amber-900 mt-0.5 block">
              {bookingCount}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-red-50/80 border border-red-200/80">
            <span className="text-[11px] font-semibold text-red-800 uppercase tracking-wider block">
              High Priority & Safety
            </span>
            <span className="text-xl font-heading font-bold text-red-900 mt-0.5 block">
              {urgentCount}
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications by puja name, priest, booking ID, report..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#701a28]/20 focus:bg-white text-stone-900 placeholder:text-stone-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700"
              >
                Clear
              </button>
            )}
          </div>

          {/* Read / Unread toggle */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl shrink-0">
            {(['ALL', 'UNREAD', 'READ'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setReadFilter(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  readFilter === tab
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {tab === 'ALL' && 'All'}
                {tab === 'UNREAD' && `Unread (${unreadCount})`}
                {tab === 'READ' && 'Read'}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <span className="text-stone-400 text-xs font-semibold mr-1 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            Categories:
          </span>

          {(
            [
              'ALL',
              'BOOKING',
              'PAYMENT',
              'CEREMONY',
              'REVIEW',
              'REWARDS',
              'SECURITY',
              'SUPPORT',
              'SYSTEM'
            ] as const
          ).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#701a28] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
              }`}
            >
              {cat === 'ALL'
                ? 'All Categories'
                : cat === 'BOOKING'
                ? 'Bookings'
                : cat === 'PAYMENT'
                ? 'Dakshina & Escrow'
                : cat === 'CEREMONY'
                ? 'Ceremony Live'
                : cat === 'REVIEW'
                ? 'Reviews'
                : cat === 'REWARDS'
                ? 'Punya Points'
                : cat === 'SECURITY'
                ? 'Escrow Protection'
                : cat === 'SUPPORT'
                ? 'Reports & Issues'
                : 'System'}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200/90 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-[#faf8f5] border border-stone-200 text-stone-400 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-7 h-7" />
            </div>
            <h3 className="font-heading font-bold text-lg text-stone-900 mb-1">
              No notifications found
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto mb-4">
              {searchQuery
                ? `No notifications matched your search term "${searchQuery}".`
                : readFilter === 'UNREAD'
                ? 'You have read all pending notifications. Great job!'
                : 'Your notification center is clear. Live updates for ceremonies, requests, and dakshina will arrive here automatically.'}
            </p>
            {(searchQuery || selectedCategory !== 'ALL' || readFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setReadFilter('ALL');
                }}
                className="px-4 py-2 text-xs font-bold text-[#701a28] bg-[#fdf2f4] hover:bg-[#fae4e7] border border-[#f5ccd2] rounded-xl transition cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-150 shadow-xs hover:shadow-md flex flex-col sm:flex-row items-start gap-4 ${
                notif.read ? 'border-stone-200/80 bg-white' : 'border-[#f5ccd2] bg-[#fffafb]'
              }`}
            >
              {/* Category Icon */}
              <div
                className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border shadow-2xs ${getCategoryBadgeClass(
                  notif.category
                )}`}
              >
                {getCategoryIcon(notif.category)}
              </div>

              {/* Notification Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getCategoryBadgeClass(
                      notif.category
                    )}`}
                  >
                    {notif.category}
                  </span>

                  {getPriorityBadge(notif.priority)}

                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-[#701a28] inline-block" />
                  )}

                  <span className="text-[11px] text-stone-400 ml-auto flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(notif.createdAt)}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-stone-900 mb-1 leading-snug">
                  {notif.title}
                </h4>

                <p className="text-xs text-stone-600 leading-relaxed mb-3">
                  {notif.message}
                </p>

                {/* Metadata tags if applicable */}
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  {notif.bookingId && (
                    <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200 font-mono text-[10px]">
                      Booking: #{notif.bookingId.slice(-6).toUpperCase()}
                    </span>
                  )}
                  {notif.requestId && (
                    <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200 font-mono text-[10px]">
                      Request: #{notif.requestId.slice(-6).toUpperCase()}
                    </span>
                  )}
                  {notif.reportId && (
                    <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-mono text-[10px]">
                      Report: #{notif.reportId.slice(-6).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex sm:flex-col items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                {/* Primary Destination Action */}
                <button
                  type="button"
                  onClick={() => handleNotificationAction(notif)}
                  className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#701a28] hover:bg-[#52131d] shadow-2xs transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  {!notif.read && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDelete(notif.id)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
                    title="Dismiss notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Preferences Modal */}
      <NotificationPreferencesModal
        userId={effectiveUserId}
        isOpen={preferencesModalOpen}
        onClose={() => setPreferencesModalOpen(false)}
        role={role}
      />
    </div>
  );
};
