import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Calendar,
  Flame,
  CreditCard,
  Star,
  Gift,
  ShieldAlert,
  AlertCircle,
  ExternalLink,
  Settings,
  X
} from 'lucide-react';
import { AppNotification, NotificationCategory } from '../types';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';

interface NotificationBellProps {
  role?: 'customer' | 'priest' | 'admin';
  className?: string;
  onOpenPreferences?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  role = 'customer',
  className = '',
  onOpenPreferences
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'BOOKING' | 'SECURITY'>('ALL');
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const effectiveUserId = role === 'admin' ? 'admin' : (currentUser?.id || '');

  useEffect(() => {
    // Subscribe to real-time notification updates (Firestore onSnapshot + window events)
    const unsubscribe = notificationService.subscribeToNotifications(
      effectiveUserId,
      (updatedList) => {
        setNotifications(updatedList);
      },
      role
    );

    return () => {
      unsubscribe();
    };
  }, [effectiveUserId, role]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await notificationService.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
    );
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    await notificationService.markAllNotificationsRead(effectiveUserId, role);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
    );
    setLoading(false);
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.read) {
      await notificationService.markNotificationRead(notif.id);
    }
    setIsOpen(false);

    if (notif.link) {
      navigate(notif.link);
    } else if (notif.bookingId) {
      navigate(role === 'priest' ? '/priest/bookings' : role === 'admin' ? '/admin/bookings' : `/bookings/${notif.bookingId}`);
    } else if (notif.requestId) {
      navigate(role === 'priest' ? '/priest/bookings' : '/requests');
    } else {
      navigate(role === 'priest' ? '/priest/notifications' : role === 'admin' ? '/admin/notifications' : '/notifications');
    }
  };

  const getFullPageLink = () => {
    if (role === 'admin') return '/admin/notifications';
    if (role === 'priest') return '/priest/notifications';
    return '/notifications';
  };

  const getCategoryIcon = (cat: NotificationCategory) => {
    switch (cat) {
      case 'BOOKING':
        return <Calendar className="w-4 h-4 text-amber-700" />;
      case 'PAYMENT':
        return <CreditCard className="w-4 h-4 text-emerald-700" />;
      case 'CEREMONY':
        return <Flame className="w-4 h-4 text-orange-700" />;
      case 'REVIEW':
        return <Star className="w-4 h-4 text-amber-600 fill-amber-500" />;
      case 'REWARDS':
        return <Gift className="w-4 h-4 text-purple-700" />;
      case 'SECURITY':
        return <ShieldAlert className="w-4 h-4 text-red-700" />;
      case 'SUPPORT':
        return <AlertCircle className="w-4 h-4 text-blue-700" />;
      default:
        return <Bell className="w-4 h-4 text-stone-700" />;
    }
  };

  const getCategoryBadgeClass = (cat: NotificationCategory) => {
    switch (cat) {
      case 'BOOKING':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'PAYMENT':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'CEREMONY':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'REVIEW':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'REWARDS':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'SECURITY':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'SUPPORT':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  const formatRelativeTime = (iso: string) => {
    try {
      const diffMs = Date.now() - new Date(iso).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.read;
    if (filter === 'BOOKING') return n.category === 'BOOKING' || n.category === 'CEREMONY';
    if (filter === 'SECURITY') return n.category === 'SECURITY' || n.category === 'SUPPORT';
    return true;
  });

  const previewList = filteredNotifications.slice(0, 6);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        id={`${role}-notification-bell-btn`}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-stone-700 hover:text-[#701a28] hover:bg-[#fdf2f4] transition-colors cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#701a28]/20"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-[#701a28] rounded-full ring-2 ring-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id={`${role}-notification-dropdown`}
          className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-xl border border-stone-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Popover Header */}
          <div className="px-4 py-3 bg-[#faf8f5] border-b border-stone-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-stone-900 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#fdf2f4] text-[#701a28] border border-[#f5ccd2]">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  className="text-[11px] font-semibold text-[#701a28] hover:text-[#52131d] px-2 py-1 rounded-md hover:bg-stone-200/50 transition cursor-pointer flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              {onOpenPreferences && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenPreferences();
                  }}
                  className="p-1 rounded-md text-stone-500 hover:text-stone-800 hover:bg-stone-200/50 transition cursor-pointer"
                  title="Notification Preferences"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition cursor-pointer sm:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div className="px-3 py-2 border-b border-stone-100 flex items-center gap-1.5 overflow-x-auto text-[11px] bg-white scrollbar-none">
            {(['ALL', 'UNREAD', 'BOOKING', 'SECURITY'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
                  filter === f
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {f === 'ALL' && 'All'}
                {f === 'UNREAD' && `Unread (${unreadCount})`}
                {f === 'BOOKING' && 'Bookings'}
                {f === 'SECURITY' && 'Safety & Alerts'}
              </button>
            ))}
          </div>

          {/* Notifications Scrollable List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-stone-100">
            {previewList.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-2.5">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-stone-800 mb-0.5">All caught up!</p>
                <p className="text-[11px] text-stone-500 max-w-[220px] mx-auto">
                  {filter === 'UNREAD'
                    ? 'No unread notifications at the moment.'
                    : 'Important ceremony updates and alerts will appear here in real-time.'}
                </p>
              </div>
            ) : (
              previewList.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 transition flex items-start gap-3 cursor-pointer group ${
                    notif.read ? 'bg-white hover:bg-[#faf8f5]' : 'bg-[#fef9f9] hover:bg-[#fdf2f4]/60'
                  }`}
                >
                  {/* Category icon container */}
                  <div
                    className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border shadow-2xs ${getCategoryBadgeClass(
                      notif.category
                    )}`}
                  >
                    {getCategoryIcon(notif.category)}
                  </div>

                  {/* Body text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-bold text-stone-900 truncate group-hover:text-[#701a28] transition-colors">
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-stone-400 shrink-0">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-600 leading-relaxed line-clamp-2 mb-1.5">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getCategoryBadgeClass(
                            notif.category
                          )}`}
                        >
                          {notif.category}
                        </span>
                        {notif.priority === 'urgent' && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                            Urgent
                          </span>
                        )}
                      </div>

                      {!notif.read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(e, notif.id)}
                          className="text-[10px] text-stone-400 hover:text-stone-700 flex items-center gap-0.5 p-1 rounded hover:bg-stone-100"
                          title="Mark read"
                        >
                          <Check className="w-3 h-3" />
                          <span>Read</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Unread indicator dot */}
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-[#701a28] shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Popover Footer */}
          <div className="p-2.5 bg-[#faf8f5] border-t border-stone-200/80 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate(getFullPageLink());
              }}
              className="w-full py-1.5 px-3 text-xs font-bold text-center text-[#701a28] hover:bg-[#fdf2f4] rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>View All in Notification Center</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
