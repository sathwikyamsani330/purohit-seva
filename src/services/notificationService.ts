import { AppNotification, NotificationType, NotificationCategory, NotificationPreferences } from '../types';
import { db, auth } from '../lib/firebase';
import {
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';

const NOTIFICATIONS_STORAGE_KEY = 'purohit_notifications';
const PREFERENCES_STORAGE_KEY = 'purohit_notification_preferences';
const PROCESSED_KEYS_STORAGE = 'purohit_processed_notification_ids';

// In-memory set of recent notification deduplication keys (resets on reload, backed by localStorage)
const processedKeySet = new Set<string>();

const loadProcessedKeys = () => {
  try {
    const raw = localStorage.getItem(PROCESSED_KEYS_STORAGE);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach(k => processedKeySet.add(k));
      }
    }
  } catch {
    // ignore
  }
};
loadProcessedKeys();

const persistProcessedKey = (key: string) => {
  processedKeySet.add(key);
  try {
    const arr = Array.from(processedKeySet).slice(-200); // keep last 200 keys
    localStorage.setItem(PROCESSED_KEYS_STORAGE, JSON.stringify(arr));
  } catch {
    // ignore
  }
};

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  userId: '',
  promotional: true,
  rewards: true,
  generalUpdates: true,
  bookingUpdates: true,
  paymentAlerts: true,
  securityAndSafety: true,
  inApp: true,
  sms: true,
  whatsapp: true,
  email: true
};

const INITIAL_NOTIFICATIONS: AppNotification[] = [];

/**
 * Automatically determine category based on notification type if not explicitly provided
 */
export const resolveCategory = (type: NotificationType, provided?: NotificationCategory): NotificationCategory => {
  if (provided) return provided;
  const t = String(type).toUpperCase();
  if (t.includes('PAYMENT') || t.includes('REFUND') || t.includes('ESCROW')) return 'PAYMENT';
  if (t.includes('CEREMONY') || t.includes('ON_THE_WAY') || t.includes('ARRIVED') || t.includes('STARTED') || t.includes('UPCOMING')) return 'CEREMONY';
  if (t.includes('REVIEW')) return 'REVIEW';
  if (t.includes('POINT') || t.includes('REWARD') || t.includes('LEVEL') || t.includes('BONUS')) return 'REWARDS';
  if (t.includes('SECURITY') || t.includes('PROTECTION') || t.includes('DISPUTE') || t.includes('VIOLATION') || t.includes('SUSPICIOUS')) return 'SECURITY';
  if (t.includes('SUPPORT') || t.includes('REPORT') || t.includes('ISSUE')) return 'SUPPORT';
  if (t.includes('REQUEST') || t.includes('BOOKING') || t.includes('CANCEL')) return 'BOOKING';
  return 'SYSTEM';
};

/**
 * Automatically determine target screen link if not explicitly provided
 */
export const resolveLink = (notif: Partial<AppNotification>, role?: string): string => {
  if (notif.link) return notif.link;
  const isPriest = role === 'priest' || notif.userId?.startsWith('pr-') || notif.targetRole === 'priest';
  const isAdmin = role === 'admin' || notif.userId === 'admin' || notif.targetRole === 'admin';

  if (notif.bookingId) {
    if (isAdmin) return '/admin/bookings';
    if (isPriest) return '/priest/bookings';
    return `/bookings/${notif.bookingId}`;
  }

  if (notif.requestId) {
    if (isAdmin) return '/admin/bookings';
    if (isPriest) return '/priest/bookings';
    if (notif.type === 'REQUEST_ACCEPTED' || notif.type === 'PAYMENT_REQUIRED') {
      return `/payment/${notif.requestId}`;
    }
    return '/requests';
  }

  if (notif.reportId) {
    if (isAdmin) return '/admin/protection';
    return '/profile';
  }

  const cat = resolveCategory(notif.type as NotificationType, notif.category);
  if (cat === 'REWARDS') return isPriest ? '/priest/dashboard' : '/loyalty';
  if (cat === 'SECURITY' || cat === 'SUPPORT') return isAdmin ? '/admin/protection' : '/profile';
  if (cat === 'BOOKING' || cat === 'CEREMONY') return isPriest ? '/priest/bookings' : '/bookings';

  return isPriest ? '/priest/dashboard' : isAdmin ? '/admin/dashboard' : '/notifications';
};

export const notificationService = {
  /**
   * Get user notification preferences
   */
  getPreferences: async (userId: string = ''): Promise<NotificationPreferences> => {
    try {
      const stored = localStorage.getItem(`${PREFERENCES_STORAGE_KEY}_${userId}`);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored), userId };
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_PREFERENCES, userId };
  },

  /**
   * Save user notification preferences
   */
  savePreferences: async (prefs: NotificationPreferences): Promise<NotificationPreferences> => {
    // Enforce critical transactional preferences to ALWAYS remain true
    const sanitized: NotificationPreferences = {
      ...prefs,
      bookingUpdates: true,
      paymentAlerts: true,
      securityAndSafety: true,
      updatedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(`${PREFERENCES_STORAGE_KEY}_${sanitized.userId}`, JSON.stringify(sanitized));
      if (auth.currentUser) {
        const prefRef = doc(db, 'notificationPreferences', sanitized.userId);
        await setDoc(prefRef, sanitized, { merge: true });
      }
    } catch (err) {
      console.warn('Could not sync notification preferences to Firestore:', err);
    }

    return sanitized;
  },

  /**
   * Retrieve notifications for a user/role with offline-first localStorage fallback
   */
  getNotifications: async (userId?: string, role?: 'customer' | 'priest' | 'admin' | string): Promise<AppNotification[]> => {
    const effectiveUserId = userId || (role === 'admin' ? 'admin' : '');

    if (auth.currentUser) {
      try {
        const notifCol = collection(db, 'notifications');
        const q = effectiveUserId === 'admin'
          ? query(notifCol, where('targetRole', '==', 'admin'))
          : query(notifCol, where('userId', '==', effectiveUserId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const list: AppNotification[] = [];
          snap.forEach((d) => {
            list.push({ ...d.data(), id: d.id } as AppNotification);
          });
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          if (list.length > 0) {
            // merge with local
            const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
            const localList: AppNotification[] = saved ? JSON.parse(saved) : [];
            const mergedMap = new Map<string, AppNotification>();
            list.forEach(n => mergedMap.set(n.id, n));
            localList.forEach(n => {
              if (!mergedMap.has(n.id)) mergedMap.set(n.id, n);
            });
            const merged = Array.from(mergedMap.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(merged));
            return merged.filter(n => notificationService.matchesUser(n, effectiveUserId, role));
          }
        }
      } catch (err) {
        console.warn('Firestore getNotifications fallback:', err);
      }
    }

    const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    let list: AppNotification[] = [];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      } catch {
        // fallback
      }
    }

    

    return list
      .map(n => ({
        ...n,
        category: resolveCategory(n.type, n.category),
        link: resolveLink(n, role)
      }))
      .filter(n => notificationService.matchesUser(n, effectiveUserId, role));
  },

  /**
   * Helper to check if a notification belongs to the user/role
   */
  matchesUser: (notif: AppNotification, userId: string, role?: string): boolean => {
    if (role === 'admin' || userId === 'admin') {
      return notif.userId === 'admin' || notif.targetRole === 'admin';
    }
    if (role === 'priest' || userId.startsWith('pr-')) {
      return notif.userId === userId || notif.targetRole === 'priest';
    }
    return notif.userId === userId || !notif.userId;
  },

  /**
   * Create notification with idempotency check & duplicate prevention
   */
  createNotification: async (
    notif: Omit<AppNotification, 'id' | 'createdAt' | 'read' | 'category'> & {
      id?: string;
      read?: boolean;
      createdAt?: string;
      category?: NotificationCategory;
      idempotencyKey?: string;
    }
  ): Promise<AppNotification | null> => {
    const targetUserId = notif.userId || '';
    const category = resolveCategory(notif.type, notif.category);

    // 1. Check user preferences for non-critical categories
    try {
      const prefs = await notificationService.getPreferences(targetUserId);
      if (category === 'REWARDS' && !prefs.rewards) {
        console.info(`Notification ${notif.type} suppressed per user rewards preference.`);
        return null;
      }
      if (category === 'SYSTEM' && notif.priority === 'normal' && !prefs.generalUpdates) {
        console.info(`Notification ${notif.type} suppressed per user general updates preference.`);
        return null;
      }
    } catch {
      // ignore
    }

    // 2. Deterministic idempotency key calculation
    // Prevents duplicate notifications on double-click, reconnect, or repeated status triggers
    const dedupeKey = notif.idempotencyKey ||
      notif.id ||
      `${targetUserId}__${notif.type}__${notif.bookingId || notif.requestId || notif.reportId || ''}`;

    if (processedKeySet.has(dedupeKey)) {
      // Find existing notification to return
      const existing = await notificationService.getNotifications(targetUserId);
      const found = existing.find(n => n.id === notif.id || n.id === dedupeKey || (
        n.userId === targetUserId &&
        n.type === notif.type &&
        (n.bookingId === notif.bookingId || n.requestId === notif.requestId)
      ));
      if (found) {
        return found;
      }
    }

    const uniqueId = notif.id || (notif.idempotencyKey ? `notif-${dedupeKey}` : `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
    const now = notif.createdAt || new Date().toISOString();

    const link = resolveLink({ ...notif, category }, notif.targetRole);

    const newNotif: AppNotification = {
      id: uniqueId,
      userId: targetUserId,
      targetRole: notif.targetRole || (targetUserId === 'admin' ? 'admin' : targetUserId.startsWith('pr-') ? 'priest' : 'customer'),
      title: notif.title,
      message: notif.message,
      type: notif.type,
      category,
      priority: notif.priority || (notif.type.includes('URGENT') || notif.type.includes('REPORT') ? 'urgent' : 'normal'),
      requestId: notif.requestId,
      bookingId: notif.bookingId,
      reportId: notif.reportId,
      link,
      read: notif.read ?? false,
      createdAt: now,
      metadata: notif.metadata
    };

    // Mark as processed in local key set
    persistProcessedKey(dedupeKey);
    persistProcessedKey(uniqueId);

    // Save to Firestore if connected
    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'notifications', uniqueId);
        await setDoc(docRef, newNotif);
      } catch (err) {
        console.warn('Firestore setNotification notice (using local storage fallback):', err);
      }
    }

    // Save to LocalStorage
    const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    let list: AppNotification[] = [];
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch {
        list = [];
      }
    }

    // Prepend if not already in list
    if (!list.some(n => n.id === uniqueId)) {
      const updated = [newNotif, ...list];
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
    }

    // Dispatch custom event for real-time notification badge updates across components
    try {
      window.dispatchEvent(new CustomEvent('purohit_notification_received', { detail: newNotif }));
    } catch {
      // ignore
    }

    return newNotif;
  },

  // Alias for backward compatibility
  addNotification: async (
    notif: Omit<AppNotification, 'id' | 'createdAt' | 'read' | 'category'> & { category?: NotificationCategory }
  ): Promise<AppNotification | null> => {
    return notificationService.createNotification(notif);
  },

  /**
   * Mark a single notification as read
   */
  markNotificationRead: async (id: string): Promise<void> => {
    const readAt = new Date().toISOString();

    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'notifications', id);
        await updateDoc(docRef, { read: true, readAt });
      } catch (err) {
        console.warn('Firestore markRead error:', err);
      }
    }

    const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!saved) return;
    try {
      const list: AppNotification[] = JSON.parse(saved);
      const updated = list.map(n => (n.id === id ? { ...n, read: true, readAt } : n));
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('purohit_notification_updated', { detail: { id, read: true } }));
    } catch {
      // ignore
    }
  },

  markAsRead: async (id: string): Promise<void> => {
    return notificationService.markNotificationRead(id);
  },

  /**
   * Mark all notifications as read for a given user or role
   */
  markAllNotificationsRead: async (userId?: string, role?: string): Promise<void> => {
    const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!saved) return;
    try {
      const readAt = new Date().toISOString();
      const list: AppNotification[] = JSON.parse(saved);
      const updated = list.map(n => {
        if (!userId || notificationService.matchesUser(n, userId, role)) {
          return { ...n, read: true, readAt };
        }
        return n;
      });
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('purohit_notification_updated', { detail: { all: true, userId } }));
    } catch {
      // ignore
    }
  },

  markAllAsRead: async (userId: string): Promise<void> => {
    return notificationService.markAllNotificationsRead(userId);
  },

  /**
   * Delete a notification
   */
  deleteNotification: async (id: string): Promise<void> => {
    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'notifications', id);
        await deleteDoc(docRef);
      } catch (err) {
        console.warn('Firestore deleteDoc error:', err);
      }
    }

    const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!saved) return;
    try {
      const list: AppNotification[] = JSON.parse(saved);
      const updated = list.filter(n => n.id !== id);
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('purohit_notification_updated', { detail: { deletedId: id } }));
    } catch {
      // ignore
    }
  },

  /**
   * Get unread count
   */
  getUnreadCount: async (userId?: string, role?: 'customer' | 'priest' | 'admin' | string): Promise<number> => {
    const notifications = await notificationService.getNotifications(userId, role);
    return notifications.filter(n => !n.read).length;
  },

  /**
   * Real-time subscription to notifications via Firestore onSnapshot + EventBus
   */
  subscribeToNotifications: (
    userId: string,
    callback: (notifications: AppNotification[]) => void,
    role?: 'customer' | 'priest' | 'admin' | string
  ): (() => void) => {
    let unsubscribeFirestore: Unsubscribe | null = null;

    // Load initial list immediately
    notificationService.getNotifications(userId, role).then(callback);

    // Setup Firestore listener if signed in
    if (auth.currentUser) {
      try {
        const notifCol = collection(db, 'notifications');
        const q = role === 'admin'
          ? query(notifCol, where('targetRole', '==', 'admin'))
          : query(notifCol, where('userId', '==', userId));

        unsubscribeFirestore = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const list: AppNotification[] = [];
            snapshot.forEach(d => list.push({ ...d.data(), id: d.id } as AppNotification));
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            callback(list);
          }
        }, (err) => {
          console.warn('Firestore onSnapshot listener error:', err);
        });
      } catch (err) {
        console.warn('Could not establish Firestore real-time listener:', err);
      }
    }

    // Event bus handlers for instant local state sync
    const handleEvent = () => {
      notificationService.getNotifications(userId, role).then(callback);
    };

    window.addEventListener('purohit_notification_received', handleEvent);
    window.addEventListener('purohit_notification_updated', handleEvent);
    window.addEventListener('storage', handleEvent);

    return () => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
      window.removeEventListener('purohit_notification_received', handleEvent);
      window.removeEventListener('purohit_notification_updated', handleEvent);
      window.removeEventListener('storage', handleEvent);
    };
  }
};
