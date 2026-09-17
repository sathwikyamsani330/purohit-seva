import {
  Booking,
  BookingDraft,
  BookingStatus,
  PaymentStatus,
  BookingStatusHistoryEntry,
  BookingSupportRequest,
  SupportIssueReason
} from '../types';
import { notificationService } from './notificationService';
import { rewardService } from './rewardService';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { authService } from './authService';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  collection,
  query,
  where
} from 'firebase/firestore';
import {
  normalizeBookingStatus,
  isValidPriestTransition,
  CanonicalBookingStatus
} from '../utils/bookingStatus';

const BOOKINGS_STORAGE_KEY = 'purohit_bookings';
const BOOKING_DRAFT_KEY = 'purohit_booking_draft';
const SUPPORT_REQUESTS_KEY = 'purohit_support_requests';

// Input sanitization utility for security and robust payloads
export const sanitizeInputString = (val?: string | null, maxLen = 500): string => {
  if (!val) return '';
  return String(val)
    .replace(/<[^>]*>/g, '') // remove HTML tags
    .replace(/javascript:/gi, '')
    .trim()
    .slice(0, maxLen);
};

// Helper to generate IDs like PS-20260831-4821
export const generateBookingId = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `PS-${dateStr}-${randomSuffix}`;
};

export const bookingService = {
  // Get all bookings from Firestore (aligned with least-privilege rules) or localStorage fallback
  getBookings: async (userRole?: string, targetUserId?: string): Promise<Booking[]> => {
    // If authenticated, try loading from Firestore using rule-compliant queries
    if (auth.currentUser) {
      try {
        const uid = targetUserId || auth.currentUser.uid;
        const currentAppUser = authService.getCurrentUser();
        const role = userRole || currentAppUser?.role || 'customer';

        let bookingsQuery;
        if (role === 'admin') {
          bookingsQuery = collection(db, 'bookings');
        } else if (role === 'priest') {
          bookingsQuery = query(collection(db, 'bookings'), where('priestId', '==', uid));
        } else {
          bookingsQuery = query(collection(db, 'bookings'), where('customerId', '==', uid));
        }

        const snap = await getDocs(bookingsQuery);
        if (!snap.empty) {
          const list: Booking[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data() as Booking;
            list.push({ ...data, id: docSnap.id });
          });
          const sorted = list.sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
          try {
            sessionStorage.setItem(`purohit_bookings_${uid}`, JSON.stringify(sorted));
          } catch {
            // ignore
          }
          return sorted;
        }
        return [];
      } catch (err) {
        // Fallback to local session storage if offline or permissions pending
        console.warn('Firestore getBookings query notice (using local state):', err);
      }
    }

    const currentAppUser = authService.getCurrentUser();
    if (currentAppUser?.id) {
      try {
        const userSaved = sessionStorage.getItem(`purohit_bookings_${currentAppUser.id}`);
        if (userSaved) {
          const parsed = JSON.parse(userSaved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // fallback
      }
    }

    const saved = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    // Seed localStorage with mock bookings if empty
    return [];
  },

  getAllBookings: async (): Promise<Booking[]> => {
    return bookingService.getBookings();
  },

  getBookingById: async (id: string): Promise<Booking | null> => {
    if (!id) return null;

    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'bookings', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return { ...docSnap.data(), id: docSnap.id } as Booking;
        }
      } catch (err) {
        console.warn('Firestore getBookingById fallback:', err);
      }
    }

    const bookings = await bookingService.getBookings();
    const cleanId = id.trim().toLowerCase();
    const found = bookings.find(b => b.id.toLowerCase() === cleanId || b.bookingId?.toLowerCase() === cleanId) || null;
    if (!found) return null;

    if (auth.currentUser) {
      const currentAppUser = authService.getCurrentUser();
      const isAdmin = currentAppUser?.role === 'admin';
      if (!isAdmin) {
        const uid = auth.currentUser.uid;
        const isAuthorized = found.customerId === uid || found.priestId === uid;
        if (!isAuthorized) {
          return null;
        }
      }
    }

    return found;
  },

  // Privacy-preserving conflict check: Uses authoritative server endpoint
  // without reading or exposing other devotees' private booking records.
  hasBookingConflict: async (priestId: string, date: string, time: string, excludeBookingId?: string): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const response = await fetch('/api/availability/check-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priestId, date, time, excludeBookingId }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const result = await response.json();
        return !!result.hasConflict;
      }
    } catch (err) {
      console.warn('Server availability check notice, falling back to priest-scoped query:', err);
    }

    // Priest-scoped fallback: When the authenticated user is the priest checking their OWN schedule,
    // they can verify their own bookings directly from Firestore in compliance with security rules.
    if (auth.currentUser && (auth.currentUser.uid === priestId || authService.getCurrentUser()?.role === 'priest')) {
      try {
        const q = query(
          collection(db, 'bookings'),
          where('priestId', '==', priestId)
        );
        const snap = await getDocs(q);
        const normalizedTime = time.trim().toLowerCase();
        const normalizedDate = date.trim();
        let conflict = false;

        snap.forEach((docSnap) => {
          const b = docSnap.data() as Booking;
          if (excludeBookingId && (docSnap.id === excludeBookingId || b.bookingId === excludeBookingId)) {
            return;
          }
          const isActiveBooking =
            b.bookingStatus === 'CONFIRMED' ||
            b.bookingStatus === 'PRIEST_ON_THE_WAY' ||
            b.bookingStatus === 'PRIEST_ARRIVED' ||
            b.bookingStatus === 'CEREMONY_STARTED' ||
            b.status === 'confirmed' ||
            b.status === 'in_progress';
          const isSameDate = b.date.trim() === normalizedDate;
          const isSameTime = (b.time || b.timeSlot || '').trim().toLowerCase() === normalizedTime;

          if (isActiveBooking && isSameDate && isSameTime) {
            conflict = true;
          }
        });

        return conflict;
      } catch (err) {
        console.warn('Priest schedule check query notice:', err);
      }
    }

    return false;
  },

  getCustomerBookings: async (customerId: string, statusTab?: 'upcoming' | 'completed' | 'cancelled'): Promise<Booking[]> => {
    const bookings = await bookingService.getBookings('customer', customerId);
    const customerList = bookings.filter(b => b.customerId === customerId);
    
    if (!statusTab) return customerList;

    if (statusTab === 'upcoming') {
      return customerList.filter(b => b.bookingStatus === 'CONFIRMED' || b.status === 'confirmed' || b.status === 'in_progress');
    }
    if (statusTab === 'completed') {
      return customerList.filter(b => b.bookingStatus === 'COMPLETED' || b.status === 'completed');
    }
    if (statusTab === 'cancelled') {
      return customerList.filter(b => b.bookingStatus === 'CANCELLED' || b.status === 'cancelled' || b.status === 'rejected');
    }
    return customerList;
  },

  getPriestBookings: async (priestId: string, statusTab?: 'upcoming' | 'completed' | 'cancelled' | 'pending'): Promise<Booking[]> => {
    const bookings = await bookingService.getBookings('priest', priestId);
    const priestList = bookings.filter(b => b.priestId === priestId);

    if (!statusTab) return priestList;

    if (statusTab === 'pending') {
      return priestList.filter(b => b.status === 'pending');
    }
    if (statusTab === 'upcoming') {
      return priestList.filter(b => b.bookingStatus === 'CONFIRMED' || b.status === 'confirmed' || b.status === 'in_progress');
    }
    if (statusTab === 'completed') {
      return priestList.filter(b => b.bookingStatus === 'COMPLETED' || b.status === 'completed');
    }
    if (statusTab === 'cancelled') {
      return priestList.filter(b => b.bookingStatus === 'CANCELLED' || b.status === 'cancelled' || b.status === 'rejected');
    }
    return priestList;
  },

  createConfirmedBooking: async (bookingData: Partial<Booking> | BookingDraft): Promise<Booking> => {
    const bookings = await bookingService.getBookings();
    const uniqueId = generateBookingId();
    const now = new Date().toISOString();

    const targetPriestId = bookingData.priestId || 'pr-101';
    const targetDate = (bookingData.date || now.split('T')[0]).trim();
    const targetTime = ((bookingData as any).time || (bookingData as any).timeSlot || '10:00 AM').trim();

    // Check for duplicate or conflicting booking for the same priest and time slot
    const conflictExists = await bookingService.hasBookingConflict(targetPriestId, targetDate, targetTime);
    if (conflictExists) {
      throw new Error(`The selected Acharya already has an active booking on ${targetDate} at ${targetTime}. Please choose another auspicious time slot.`);
    }

    const formattedAddress = typeof (bookingData as any).location === 'object' && (bookingData as any).location !== null
      ? (bookingData as any).location
      : bookingData.address || {
          street: 'Ceremony Venue',
          area: 'Locality',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500001'
        };

    const rawLocationString = typeof (bookingData as any).location === 'string'
      ? (bookingData as any).location
      : `${formattedAddress.street}, ${formattedAddress.area}, ${formattedAddress.city} - ${formattedAddress.pincode}`;
    const locationString = sanitizeInputString(rawLocationString, 300);

    const sanitizedCustomerName = sanitizeInputString(bookingData.customerName, 80) || 'Devotee';
    const sanitizedCustomerPhone = sanitizeInputString(bookingData.customerPhone, 25) || '';
    const sanitizedCustomerEmail = sanitizeInputString(bookingData.customerEmail, 80) || '';
    const rawNotes = (bookingData as any).notes || (bookingData as any).specialNotes || '';
    const sanitizedNotes = sanitizeInputString(rawNotes, 1000);

    const servicePrice = (bookingData as any).serviceCharge || (bookingData as any).servicePrice || 5000;
    const platformFee = (bookingData as any).platformFee || 250;
    const rewardDiscount = (bookingData as any).rewardDiscount || 0;
    const totalAmount = bookingData.totalAmount || Math.max(0, servicePrice + platformFee - rewardDiscount);

    const initialHistoryEntry: BookingStatusHistoryEntry = {
      id: `hist-${Date.now()}-init`,
      bookingId: uniqueId,
      oldStatus: 'PAYMENT_PENDING',
      newStatus: 'CONFIRMED',
      changedBy: bookingData.customerId || auth.currentUser?.uid || '',
      changedByRole: 'CUSTOMER',
      changedByName: sanitizedCustomerName,
      reason: 'Dakshina advance payment verified & booking confirmed',
      timestamp: now
    };

    const newBooking: Booking = {
      id: uniqueId,
      bookingId: uniqueId,
      requestId: bookingData.requestId,
      customerId: bookingData.customerId || auth.currentUser?.uid || '',
      customerName: sanitizedCustomerName,
      customerPhone: sanitizedCustomerPhone,
      customerEmail: sanitizedCustomerEmail,
      priestId: targetPriestId,
      priestName: bookingData.priestName || 'Sri Ramesh Sharma',
      priestAvatar: (bookingData as any).priestImage || bookingData.priestAvatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
      priestImage: (bookingData as any).priestImage || bookingData.priestAvatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
      priestTitle: (bookingData as any).priestTitle || 'Vedic Acharya',
      priestRating: (bookingData as any).priestRating || 4.9,
      priestPhone: (bookingData as any).priestPhone || '',
      eventId: bookingData.eventId || 'evt-1',
      eventName: bookingData.eventName || 'Gruhapravesham',
      serviceId: (bookingData as any).serviceId || 'srv-1',
      serviceName: (bookingData as any).serviceName || bookingData.eventName || 'Gruhapravesham Puja',
      date: targetDate,
      time: targetTime,
      timeSlot: targetTime,
      location: locationString,
      address: formattedAddress,
      notes: sanitizedNotes,
      specialNotes: sanitizedNotes,
      servicePrice,
      serviceCharge: servicePrice,
      platformFee,
      subtotal: servicePrice,
      taxes: (bookingData as any).taxes || 0,
      rewardDiscount: rewardDiscount > 0 ? rewardDiscount : undefined,
      appliedRewardId: (bookingData as any).appliedRewardId,
      appliedRewardCode: (bookingData as any).appliedRewardCode,
      totalAmount,
      status: 'confirmed',
      bookingStatus: 'CONFIRMED',
      paymentStatus: (bookingData.paymentStatus as PaymentStatus) || 'completed',
      paymentMethod: (bookingData.paymentMethod as any) || 'UPI',
      paymentId: (bookingData as any).paymentId,
      orderId: (bookingData as any).orderId,
      isDemoPayment: (bookingData as any).isDemoPayment,
      platformCommission: (bookingData as any).platformCommission,
      priestPayableAmount: (bookingData as any).priestPayableAmount,
      escrowStatus: (bookingData as any).escrowStatus || 'HELD_IN_ESCROW',
      createdAt: now,
      updatedAt: now,
      acceptedAt: (bookingData as any).acceptedAt || now,
      paidAt: (bookingData as any).paidAt || now,
      confirmedAt: now,
      statusHistory: [initialHistoryEntry]
    };

    // Save to Firestore
    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'bookings', uniqueId);
        await setDoc(docRef, newBooking);
        // Save initial statusHistory subcollection doc
        const histDocRef = doc(db, 'bookings', uniqueId, 'statusHistory', initialHistoryEntry.id);
        await setDoc(histDocRef, initialHistoryEntry);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `bookings/${uniqueId}`);
      }
    }

    // Authoritatively reserve slot on availability server
    try {
      await fetch('/api/availability/reserve-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priestId: newBooking.priestId,
          date: newBooking.date,
          time: newBooking.time || (newBooking as any).timeSlot || '10:00 AM',
          bookingId: newBooking.id,
          status: 'CONFIRMED'
        })
      });
    } catch {
      // ignore
    }

    const updated = [newBooking, ...bookings];
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(updated));

    // Send customer notification
    try {
      await notificationService.createNotification({
        userId: newBooking.customerId,
        title: '💳 Payment successful. Your booking is confirmed.',
        message: `Booking ${newBooking.id} for ${newBooking.eventName} with ${newBooking.priestName} is locked. You can now coordinate directly.`,
        type: 'BOOKING_CONFIRMED',
        bookingId: newBooking.id
      });
    } catch {
      // ignore
    }

    return newBooking;
  },

  createBooking: async (draft: BookingDraft): Promise<Booking> => {
    return bookingService.createConfirmedBooking(draft);
  },

  updateBookingStatus: async (
    id: string,
    status: BookingStatus,
    reason?: string,
    changedBy?: string,
    changedByRole: 'CUSTOMER' | 'PRIEST' | 'ADMIN' = 'PRIEST',
    changedByName?: string
  ): Promise<Booking> => {
    const bookings = await bookingService.getBookings();
    const cleanId = id.trim().toLowerCase();
    const index = bookings.findIndex(b => b.id.toLowerCase() === cleanId || b.bookingId?.toLowerCase() === cleanId);
    if (index === -1) throw new Error('Booking not found');

    const currentBooking = bookings[index];
    const canonicalOldStatus = normalizeBookingStatus(currentBooking.bookingStatus || currentBooking.status);
    const canonicalNewStatus = normalizeBookingStatus(status);

    if (canonicalOldStatus === canonicalNewStatus) {
      return currentBooking;
    }

    // TERMINAL STATUS VALIDATION:
    if (canonicalOldStatus === 'COMPLETED' && (canonicalNewStatus === 'CANCELLED' || canonicalNewStatus === 'REJECTED')) {
      throw new Error('A sacred ceremony marked as completed cannot be cancelled.');
    }

    if (canonicalOldStatus === 'CANCELLED' && (canonicalNewStatus === 'CANCELLED' || canonicalNewStatus === 'REJECTED')) {
      throw new Error('This booking is already cancelled.');
    }

    // SECURITY TRANSITION CHECK:
    // If a priest is updating, enforce strict sequence
    if (changedByRole === 'PRIEST') {
      const isAllowed = isValidPriestTransition(canonicalOldStatus, canonicalNewStatus);
      if (!isAllowed) {
        throw new Error(
          `Unauthorized status transition from ${canonicalOldStatus} to ${canonicalNewStatus} for priest.`
        );
      }
    }

    const sanitizedReason = reason ? sanitizeInputString(reason, 500) : undefined;
    const now = new Date().toISOString();
    const isCompleted = canonicalNewStatus === 'COMPLETED';

    // Update timestamps dynamically based on state
    const journeyStartedAt = canonicalNewStatus === 'PRIEST_ON_THE_WAY'
      ? (currentBooking.journeyStartedAt || now)
      : currentBooking.journeyStartedAt;

    const arrivedAt = canonicalNewStatus === 'PRIEST_ARRIVED'
      ? (currentBooking.arrivedAt || now)
      : currentBooking.arrivedAt;

    const ceremonyStartedAt = canonicalNewStatus === 'CEREMONY_STARTED'
      ? (currentBooking.ceremonyStartedAt || now)
      : currentBooking.ceremonyStartedAt;

    const completedAt = isCompleted
      ? (currentBooking.completedAt || now)
      : currentBooking.completedAt;

    const completedBy = isCompleted
      ? (currentBooking.completedBy || changedByName || currentBooking.priestName)
      : currentBooking.completedBy;

    // Create status history entry
    const historyEntryId = `hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const historyEntry: BookingStatusHistoryEntry = {
      id: historyEntryId,
      bookingId: currentBooking.id,
      oldStatus: canonicalOldStatus,
      newStatus: canonicalNewStatus,
      changedBy: changedBy || auth.currentUser?.uid || (changedByRole === 'PRIEST' ? currentBooking.priestId : 'system'),
      changedByRole,
      changedByName: changedByName || (changedByRole === 'PRIEST' ? currentBooking.priestName : changedByRole === 'ADMIN' ? 'Admin Officer' : currentBooking.customerName),
      reason: sanitizedReason,
      timestamp: now
    };

    const existingHistory = Array.isArray(currentBooking.statusHistory) ? currentBooking.statusHistory : [];
    const updatedHistory = [...existingHistory, historyEntry];

    // Map lowercase status for backward compatibility
    let legacyStatus: Booking['status'] = 'confirmed';
    if (canonicalNewStatus === 'COMPLETED') legacyStatus = 'completed';
    else if (canonicalNewStatus === 'CANCELLED') legacyStatus = 'cancelled';
    else if (canonicalNewStatus === 'REJECTED') legacyStatus = 'rejected';
    else if (canonicalNewStatus === 'CEREMONY_STARTED') legacyStatus = 'in_progress';
    else legacyStatus = 'confirmed';

    const updated: Booking = {
      ...currentBooking,
      status: legacyStatus,
      bookingStatus: canonicalNewStatus,
      cancellationReason: sanitizedReason || currentBooking.cancellationReason,
      journeyStartedAt,
      arrivedAt,
      ceremonyStartedAt,
      completedAt,
      completedBy,
      statusHistory: updatedHistory,
      updatedAt: now
    };

    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'bookings', updated.id);
        await updateDoc(docRef, {
          status: updated.status,
          bookingStatus: updated.bookingStatus,
          cancellationReason: updated.cancellationReason || '',
          journeyStartedAt: updated.journeyStartedAt || null,
          arrivedAt: updated.arrivedAt || null,
          ceremonyStartedAt: updated.ceremonyStartedAt || null,
          completedAt: updated.completedAt || null,
          completedBy: updated.completedBy || null,
          statusHistory: updated.statusHistory,
          updatedAt: updated.updatedAt
        });

        // Add to subcollection bookings/{bookingId}/statusHistory/{historyId}
        const histDocRef = doc(db, 'bookings', updated.id, 'statusHistory', historyEntryId);
        await setDoc(histDocRef, historyEntry);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `bookings/${updated.id}`);
      }
    }

    bookings[index] = updated;
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));

    // Send notifications according to user requirements
    try {
      if (canonicalNewStatus === 'PRIEST_ON_THE_WAY') {
        await Promise.all([
          notificationService.createNotification({
            userId: updated.customerId,
            targetRole: 'customer',
            title: '🚗 Priest is on the way',
            message: `Acharya ${updated.priestName} has started their journey for your ${updated.eventName}. Live muhurtham tracking active.`,
            type: 'PRIEST_ON_THE_WAY',
            category: 'CEREMONY',
            priority: 'high',
            bookingId: updated.id,
            link: `/bookings/${updated.id}`
          }),
          notificationService.createNotification({
            userId: updated.priestId,
            targetRole: 'priest',
            title: `Journey Started: ${updated.eventName}`,
            message: `You are marked en-route to ${updated.customerName}'s ceremony venue. Navigation is live.`,
            type: 'PRIEST_STATUS_CHANGE',
            category: 'CEREMONY',
            priority: 'normal',
            bookingId: updated.id,
            link: '/priest/bookings'
          })
        ]);
      } else if (canonicalNewStatus === 'PRIEST_ARRIVED') {
        await Promise.all([
          notificationService.createNotification({
            userId: updated.customerId,
            targetRole: 'customer',
            title: '📍 Priest has arrived',
            message: `🙏 Acharya ${updated.priestName} has arrived at the venue for ${updated.eventName}. Mandap and samagri setup in progress.`,
            type: 'PRIEST_ARRIVED',
            category: 'CEREMONY',
            priority: 'high',
            bookingId: updated.id,
            link: `/bookings/${updated.id}`
          }),
          notificationService.createNotification({
            userId: updated.priestId,
            targetRole: 'priest',
            title: `Arrival Confirmed: ${updated.eventName}`,
            message: `Arrival logged for ${updated.customerName}. Verify the puja samagri before starting the sankalpam.`,
            type: 'PRIEST_STATUS_CHANGE',
            category: 'CEREMONY',
            priority: 'normal',
            bookingId: updated.id,
            link: '/priest/bookings'
          })
        ]);
      } else if (canonicalNewStatus === 'CEREMONY_STARTED') {
        await Promise.all([
          notificationService.createNotification({
            userId: updated.customerId,
            targetRole: 'customer',
            title: '🪔 Ceremony has started',
            message: `Sacred rituals and Sankalpam for ${updated.eventName} have commenced. May blessings shower upon your family.`,
            type: 'CEREMONY_STARTED',
            category: 'CEREMONY',
            priority: 'high',
            bookingId: updated.id,
            link: `/bookings/${updated.id}`
          }),
          notificationService.createNotification({
            userId: updated.priestId,
            targetRole: 'priest',
            title: `Rituals In Progress: ${updated.eventName}`,
            message: `Sankalpam commenced for ${updated.customerName}. Follow Vedic shastras.`,
            type: 'PRIEST_STATUS_CHANGE',
            category: 'CEREMONY',
            priority: 'normal',
            bookingId: updated.id,
            link: '/priest/bookings'
          })
        ]);
      } else if (canonicalNewStatus === 'COMPLETED') {
        await Promise.all([
          notificationService.createNotification({
            userId: updated.customerId,
            targetRole: 'customer',
            title: '🙏 Ceremony Completed',
            message: `Your sacred ceremony ${updated.eventName} has concluded with divine blessings. Dakshina released from escrow.`,
            type: 'CEREMONY_COMPLETED',
            category: 'CEREMONY',
            priority: 'high',
            bookingId: updated.id,
            link: `/bookings/${updated.id}`
          }),
          notificationService.createNotification({
            userId: updated.customerId,
            targetRole: 'customer',
            title: `⭐ Share your blessings & review`,
            message: `How was your spiritual experience with Acharya ${updated.priestName}? Leave a review to help other devotees.`,
            type: 'REVIEW_AVAILABLE',
            category: 'REVIEW',
            priority: 'normal',
            bookingId: updated.id,
            link: `/bookings/${updated.id}`
          }),
          notificationService.createNotification({
            userId: updated.priestId,
            targetRole: 'priest',
            title: `Ceremony Marked Completed: ${updated.eventName}`,
            message: `Congratulations! ${updated.eventName} for ${updated.customerName} is completed. Dakshina will be settled to your account.`,
            type: 'PRIEST_STATUS_CHANGE',
            category: 'CEREMONY',
            priority: 'high',
            bookingId: updated.id,
            link: '/priest/bookings'
          })
        ]);
      } else if (canonicalNewStatus === 'CANCELLED') {
        try {
          await fetch('/api/availability/release-slot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              priestId: updated.priestId,
              bookingId: updated.id,
              date: updated.date,
              time: updated.time || (updated as any).timeSlot
            })
          });
        } catch {
          // ignore
        }

        await Promise.all([
          notificationService.createNotification({
            userId: updated.customerId,
            targetRole: 'customer',
            title: 'Puja Booking Cancelled',
            message: `Reservation ${updated.id} (${updated.eventName}) has been cancelled. Reason: ${reason || 'Per client request'}.`,
            type: 'BOOKING_CANCELLED',
            category: 'BOOKING',
            priority: 'high',
            bookingId: updated.id,
            link: `/bookings/${updated.id}`
          }),
          notificationService.createNotification({
            userId: updated.customerId,
            targetRole: 'customer',
            title: 'Escrow Refund Initiated',
            message: `Refund of ₹${updated.totalAmount} has been initiated to your source account under 100% Escrow Protection guarantee.`,
            type: 'REFUND_UPDATED',
            category: 'PAYMENT',
            priority: 'high',
            bookingId: updated.id,
            link: `/bookings/${updated.id}`
          }),
          notificationService.createNotification({
            userId: updated.priestId,
            targetRole: 'priest',
            title: `Booking Cancelled: ${updated.eventName}`,
            message: `Reservation ${updated.id} for ${updated.customerName} on ${updated.date} has been cancelled.`,
            type: 'PRIEST_REQUEST_CANCELLED',
            category: 'BOOKING',
            priority: 'high',
            bookingId: updated.id,
            link: '/priest/bookings'
          }),
          notificationService.createNotification({
            userId: 'admin',
            targetRole: 'admin',
            title: `Booking Cancelled: ${updated.id}`,
            message: `Booking ${updated.id} (${updated.eventName}) between ${updated.customerName} and ${updated.priestName} was cancelled.`,
            type: 'ADMIN_BOOKING_ISSUE',
            category: 'SYSTEM',
            priority: 'normal',
            bookingId: updated.id,
            link: '/admin/bookings'
          })
        ]);
      }
    } catch (err) {
      console.warn('Failed to send status change notification:', err);
    }

    // Automatically award loyalty points if marked completed (idempotent)
    if (isCompleted) {
      try {
        await rewardService.awardPointsForCompletedBooking(updated.id);
      } catch (err) {
        console.warn('Auto points awarding error:', err);
      }
    }

    // Dispatch global event for reactive UI updates
    try {
      window.dispatchEvent(new CustomEvent('purohit_booking_updated', { detail: updated }));
      window.dispatchEvent(new CustomEvent('purohit_data_updated'));
    } catch {
      // ignore
    }

    return updated;
  },

  // Priest specific lifecycle triggers
  startJourney: async (id: string, priestId?: string, priestName?: string): Promise<Booking> => {
    return bookingService.updateBookingStatus(id, 'PRIEST_ON_THE_WAY', undefined, priestId, 'PRIEST', priestName);
  },

  markArrived: async (id: string, priestId?: string, priestName?: string): Promise<Booking> => {
    return bookingService.updateBookingStatus(id, 'PRIEST_ARRIVED', undefined, priestId, 'PRIEST', priestName);
  },

  startCeremony: async (id: string, priestId?: string, priestName?: string): Promise<Booking> => {
    return bookingService.updateBookingStatus(id, 'CEREMONY_STARTED', undefined, priestId, 'PRIEST', priestName);
  },

  completeCeremony: async (id: string, priestId?: string, priestName?: string): Promise<Booking> => {
    return bookingService.updateBookingStatus(id, 'COMPLETED', undefined, priestId, 'PRIEST', priestName);
  },

  completeBooking: async (id: string): Promise<Booking> => {
    return bookingService.updateBookingStatus(id, 'COMPLETED');
  },

  cancelBooking: async (id: string, reason: string): Promise<Booking> => {
    return bookingService.updateBookingStatus(id, 'CANCELLED', reason, undefined, 'CUSTOMER');
  },

  // Admin status override with audit logging
  adminOverrideStatus: async (
    id: string,
    newStatus: BookingStatus,
    adminId: string = 'admin-1',
    adminName: string = 'Administrator',
    reason: string = 'Administrative override'
  ): Promise<Booking> => {
    return bookingService.updateBookingStatus(id, newStatus, reason, adminId, 'ADMIN', adminName);
  },

  // Get status history for a booking
  getStatusHistory: async (bookingId: string): Promise<BookingStatusHistoryEntry[]> => {
    const booking = await bookingService.getBookingById(bookingId);
    if (booking?.statusHistory && booking.statusHistory.length > 0) {
      return [...booking.statusHistory].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    }

    // Try subcollection
    if (auth.currentUser) {
      try {
        const histCol = collection(db, 'bookings', bookingId, 'statusHistory');
        const snap = await getDocs(histCol);
        if (!snap.empty) {
          const list: BookingStatusHistoryEntry[] = [];
          snap.forEach(docSnap => list.push({ ...docSnap.data(), id: docSnap.id } as BookingStatusHistoryEntry));
          return list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        }
      } catch {
        // ignore
      }
    }

    return [];
  },

  // Need Help / Emergency Support System (Section 21)
  createSupportRequest: async (
    data: Omit<BookingSupportRequest, 'id' | 'createdAt' | 'status'>
  ): Promise<BookingSupportRequest> => {
    const uniqueId = `sup-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    const newRequest: BookingSupportRequest = {
      ...data,
      id: uniqueId,
      customerName: sanitizeInputString(data.customerName, 80) || data.customerName,
      customerPhone: sanitizeInputString(data.customerPhone, 25) || data.customerPhone,
      description: sanitizeInputString(data.description, 1000),
      issueReason: sanitizeInputString(data.issueReason, 100) || data.issueReason,
      status: 'OPEN',
      createdAt: now
    };

    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'supportRequests', uniqueId);
        await setDoc(docRef, newRequest);
      } catch (err) {
        console.warn('Firestore createSupportRequest fallback:', err);
      }
    }

    const saved = localStorage.getItem(SUPPORT_REQUESTS_KEY);
    let list: BookingSupportRequest[] = [];
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch {
        list = [];
      }
    }

    const updated = [newRequest, ...list];
    localStorage.setItem(SUPPORT_REQUESTS_KEY, JSON.stringify(updated));

    // Notify Devotee & Admin
    try {
      await notificationService.createNotification({
        userId: newRequest.customerId,
        title: 'Support Ticket Registered',
        message: `Your emergency request for booking ${newRequest.bookingId} (${newRequest.issueReason}) has been escalated to Purohit Seva concierge.`,
        type: 'BOOKING_CONFIRMED',
        bookingId: newRequest.bookingId
      });
    } catch {
      // ignore
    }

    return newRequest;
  },

  getSupportRequests: async (bookingId?: string): Promise<BookingSupportRequest[]> => {
    if (auth.currentUser) {
      try {
        const supCol = collection(db, 'supportRequests');
        const currentAppUser = authService.getCurrentUser();
        const q = currentAppUser?.role === 'admin'
          ? supCol
          : currentAppUser?.role === 'priest'
            ? query(supCol, where('priestId', '==', auth.currentUser.uid))
            : query(supCol, where('customerId', '==', auth.currentUser.uid));

        const snap = await getDocs(q);
        if (!snap.empty) {
          const list: BookingSupportRequest[] = [];
          snap.forEach(d => list.push({ ...d.data(), id: d.id } as BookingSupportRequest));
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          if (bookingId) return list.filter(r => r.bookingId === bookingId);
          return list;
        }
      } catch (err) {
        console.warn('Firestore getSupportRequests query notice:', err);
      }
    }

    const saved = localStorage.getItem(SUPPORT_REQUESTS_KEY);
    let list: BookingSupportRequest[] = [];
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch {
        list = [];
      }
    }

    if (bookingId) return list.filter(r => r.bookingId === bookingId);
    return list;
  },

  updateSupportRequestStatus: async (
    requestId: string,
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED',
    resolvedNotes?: string
  ): Promise<BookingSupportRequest> => {
    const saved = localStorage.getItem(SUPPORT_REQUESTS_KEY);
    let list: BookingSupportRequest[] = [];
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch {
        list = [];
      }
    }

    const idx = list.findIndex(r => r.id === requestId);
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        status,
        resolvedAt: status === 'RESOLVED' ? new Date().toISOString() : undefined,
        resolvedNotes: resolvedNotes || list[idx].resolvedNotes
      };
      localStorage.setItem(SUPPORT_REQUESTS_KEY, JSON.stringify(list));
    }

    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'supportRequests', requestId);
        await updateDoc(docRef, {
          status,
          resolvedAt: status === 'RESOLVED' ? new Date().toISOString() : null,
          resolvedNotes: resolvedNotes || ''
        });
      } catch (err) {
        console.warn('Firestore updateSupportRequestStatus error:', err);
      }
    }

    return list[idx] || ({ id: requestId, status } as BookingSupportRequest);
  },

  submitReview: async (
    bookingId: string,
    rating: number,
    comment: string
  ): Promise<Booking> => {
    const bookings = await bookingService.getBookings();
    const cleanId = bookingId.trim().toLowerCase();
    const index = bookings.findIndex(b => b.id.toLowerCase() === cleanId || b.bookingId?.toLowerCase() === cleanId);
    if (index === -1) throw new Error('Booking not found');

    const sanitizedComment = sanitizeInputString(comment, 1000);
    const clampedRating = Math.max(1, Math.min(5, Math.round(rating) || 5));

    const updated: Booking = {
      ...bookings[index],
      ratingGiven: clampedRating,
      reviewGiven: sanitizedComment,
      customerReview: {
        rating: clampedRating,
        comment: sanitizedComment,
        createdAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    };

    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'bookings', updated.id);
        await updateDoc(docRef, {
          ratingGiven: clampedRating,
          reviewGiven: sanitizedComment,
          customerReview: updated.customerReview,
          updatedAt: updated.updatedAt
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `bookings/${updated.id}`);
      }
    }

    bookings[index] = updated;
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));
    return updated;
  },

  saveDraft: (draft: BookingDraft): void => {
    localStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft));
  },

  getDraft: (): BookingDraft | null => {
    const saved = localStorage.getItem(BOOKING_DRAFT_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  },

  clearDraft: (): void => {
    localStorage.removeItem(BOOKING_DRAFT_KEY);
  },

  // Backward compatibility aliases
  getBookingDraft: (): BookingDraft | null => {
    return bookingService.getDraft();
  },

  saveBookingDraft: (draft: BookingDraft): void => {
    bookingService.saveDraft(draft);
  },

  clearBookingDraft: (): void => {
    bookingService.clearDraft();
  },

  rateBooking: async (id: string, rating: number, comment: string): Promise<Booking> => {
    return bookingService.submitReview(id, rating, comment);
  }
};
