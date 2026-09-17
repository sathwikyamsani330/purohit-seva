import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Booking, BookingDraft, PriestRequest, RejectionReason, BookingStatus } from '../types';
import { bookingService } from '../services/bookingService';
import { requestService } from '../services/requestService';
import { db, auth } from '../lib/firebase';
import { authService } from '../services/authService';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

interface BookingContextType {
  draft: BookingDraft | null;
  setDraft: (draft: BookingDraft | null) => void;
  updateDraft: (partial: Partial<BookingDraft>) => void;
  clearDraft: () => void;
  requests: PriestRequest[];
  bookings: Booking[];
  refreshRequests: () => Promise<PriestRequest[]>;
  refreshBookings: () => Promise<Booking[]>;
  sendRequestFromDraft: () => Promise<PriestRequest>;
  acceptRequest: (requestId: string) => Promise<PriestRequest>;
  rejectRequest: (requestId: string, reason: RejectionReason | string, notes?: string) => Promise<PriestRequest>;
  payAndConfirmRequest: (
    requestId: string,
    paymentMethod?: 'UPI' | 'Card' | 'NetBanking' | 'CashOnPuja',
    rewardInfo?: { appliedRewardId?: string; appliedRewardCode?: string; rewardDiscount?: number },
    verifiedMeta?: {
      orderId?: string;
      isDemoPayment?: boolean;
      platformCommission?: number;
      priestPayableAmount?: number;
      escrowStatus?: string;
      serverCalculatedTotal?: number;
    }
  ) => Promise<{ request: PriestRequest; booking: Booking }>;
  completeBooking: (bookingId: string) => Promise<Booking>;
  startJourney: (bookingId: string, priestId?: string, priestName?: string) => Promise<Booking>;
  markArrived: (bookingId: string, priestId?: string, priestName?: string) => Promise<Booking>;
  startCeremony: (bookingId: string, priestId?: string, priestName?: string) => Promise<Booking>;
  completeCeremony: (bookingId: string, priestId?: string, priestName?: string) => Promise<Booking>;
  cancelBooking: (bookingId: string, reason: string) => Promise<Booking>;
  adminOverrideStatus: (bookingId: string, newStatus: BookingStatus, adminId?: string, adminName?: string, reason?: string) => Promise<Booking>;
  rateBooking: (bookingId: string, rating: number, review: string) => Promise<Booking>;
  getRequestById: (id: string) => Promise<PriestRequest | null>;
  getBookingById: (id: string) => Promise<Booking | null>;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [draft, setDraftState] = useState<BookingDraft | null>(() => {
    return bookingService.getBookingDraft();
  });
  const [requests, setRequests] = useState<PriestRequest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const refreshRequests = useCallback(async (): Promise<PriestRequest[]> => {
    const list = await requestService.getRequests();
    setRequests(list);
    return list;
  }, []);

  const refreshBookings = useCallback(async (): Promise<Booking[]> => {
    const list = await bookingService.getBookings();
    setBookings(list);
    return list;
  }, []);

  // Initial load
  useEffect(() => {
    refreshRequests();
    refreshBookings();
  }, [refreshRequests, refreshBookings]);

  // Real-time Firestore snapshot listeners & cross-tab sync aligned with least-privilege security rules
  useEffect(() => {
    let unsubscribeRequests: (() => void) | null = null;
    let unsubscribeBookings: (() => void) | null = null;

    const setupFirestoreListeners = () => {
      // Clean up previous listeners
      if (unsubscribeRequests) {
        unsubscribeRequests();
        unsubscribeRequests = null;
      }
      if (unsubscribeBookings) {
        unsubscribeBookings();
        unsubscribeBookings = null;
      }

      if (!auth.currentUser) {
        return;
      }

      try {
        const uid = auth.currentUser.uid;
        const currentAppUser = authService.getCurrentUser();
        const role = currentAppUser?.role || 'customer';

        // 1. Listen for Firestore real-time requests updates matching ownership rule
        let reqQuery;
        if (role === 'admin') {
          reqQuery = collection(db, 'requests');
        } else if (role === 'priest') {
          reqQuery = query(collection(db, 'requests'), where('priestId', '==', uid));
        } else {
          reqQuery = query(collection(db, 'requests'), where('customerId', '==', uid));
        }

        unsubscribeRequests = onSnapshot(
          reqQuery,
          (snapshot) => {
            if (!snapshot.empty) {
              const remoteRequests: PriestRequest[] = [];
              snapshot.forEach((docSnap) => {
                remoteRequests.push({ ...docSnap.data(), id: docSnap.id } as PriestRequest);
              });
              remoteRequests.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
              setRequests(remoteRequests);
              localStorage.setItem('purohit_requests', JSON.stringify(remoteRequests));
            }
          },
          (error) => {
            console.warn('Firestore requests onSnapshot notice:', error.message);
          }
        );

        // 2. Listen for Firestore real-time bookings updates matching ownership rule
        let bookingsQuery;
        if (role === 'admin') {
          bookingsQuery = collection(db, 'bookings');
        } else if (role === 'priest') {
          bookingsQuery = query(collection(db, 'bookings'), where('priestId', '==', uid));
        } else {
          bookingsQuery = query(collection(db, 'bookings'), where('customerId', '==', uid));
        }

        unsubscribeBookings = onSnapshot(
          bookingsQuery,
          (snapshot) => {
            if (!snapshot.empty) {
              const remoteBookings: Booking[] = [];
              snapshot.forEach((docSnap) => {
                remoteBookings.push({ ...docSnap.data(), id: docSnap.id } as Booking);
              });
              remoteBookings.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
              setBookings(remoteBookings);
              localStorage.setItem('purohit_bookings', JSON.stringify(remoteBookings));
            }
          },
          (error) => {
            console.warn('Firestore bookings onSnapshot notice:', error.message);
          }
        );
      } catch (err) {
        console.warn('Unable to attach Firestore listeners:', err);
      }
    };

    setupFirestoreListeners();

    // Re-bind when Firebase Auth state changes
    const unsubAuth = onAuthStateChanged(auth, () => {
      setupFirestoreListeners();
      refreshRequests();
      refreshBookings();
    });

    // 3. Listen for window storage and custom update events
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'purohit_requests' || e.key === 'purohit_bookings') {
        refreshRequests();
        refreshBookings();
      }
    };

    const handleCustomEvent = () => {
      refreshRequests();
      refreshBookings();
    };

    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('purohit_data_updated', handleCustomEvent);

    return () => {
      unsubAuth();
      if (unsubscribeRequests) unsubscribeRequests();
      if (unsubscribeBookings) unsubscribeBookings();
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('purohit_data_updated', handleCustomEvent);
    };
  }, [refreshRequests, refreshBookings]);

  const notifyChange = () => {
    try {
      window.dispatchEvent(new CustomEvent('purohit_data_updated'));
    } catch {
      // ignore
    }
  };

  const setDraft = (newDraft: BookingDraft | null) => {
    setDraftState(newDraft);
    if (newDraft) {
      bookingService.saveBookingDraft(newDraft);
    } else {
      bookingService.clearBookingDraft();
    }
  };

  const updateDraft = (partial: Partial<BookingDraft>) => {
    setDraftState((prev) => {
      const updated = prev ? { ...prev, ...partial } : (partial as BookingDraft);
      bookingService.saveBookingDraft(updated);
      return updated;
    });
  };

  const clearDraft = () => {
    setDraftState(null);
    bookingService.clearBookingDraft();
  };

  const sendRequestFromDraft = async (): Promise<PriestRequest> => {
    const currentDraft = draft || bookingService.getBookingDraft();
    if (!currentDraft) {
      throw new Error('No active ceremony configuration to submit.');
    }

    const createdRequest = await requestService.createRequest(currentDraft);
    clearDraft();
    await refreshRequests();
    notifyChange();
    return createdRequest;
  };

  const acceptRequest = async (requestId: string): Promise<PriestRequest> => {
    const updated = await requestService.acceptRequest(requestId);
    await refreshRequests();
    notifyChange();
    return updated;
  };

  const rejectRequest = async (
    requestId: string,
    reason: RejectionReason | string,
    notes?: string
  ): Promise<PriestRequest> => {
    const updated = await requestService.rejectRequest(requestId, reason, notes);
    await refreshRequests();
    notifyChange();
    return updated;
  };

  const payAndConfirmRequest = async (
    requestId: string,
    paymentMethod: 'UPI' | 'Card' | 'NetBanking' | 'CashOnPuja' = 'UPI',
    rewardInfo?: { appliedRewardId?: string; appliedRewardCode?: string; rewardDiscount?: number },
    verifiedMeta?: {
      orderId?: string;
      isDemoPayment?: boolean;
      platformCommission?: number;
      priestPayableAmount?: number;
      escrowStatus?: string;
      serverCalculatedTotal?: number;
    }
  ): Promise<{ request: PriestRequest; booking: Booking }> => {
    const result = await requestService.completePaymentAndConfirm(
      requestId,
      paymentMethod,
      undefined,
      rewardInfo,
      verifiedMeta
    );
    await Promise.all([refreshRequests(), refreshBookings()]);
    notifyChange();
    return result;
  };

  const completeBooking = async (bookingId: string): Promise<Booking> => {
    const updated = await bookingService.completeBooking(bookingId);
    await refreshBookings();
    notifyChange();
    return updated;
  };

  const startJourney = async (bookingId: string, priestId?: string, priestName?: string): Promise<Booking> => {
    const updated = await bookingService.startJourney(bookingId, priestId, priestName);
    await refreshBookings();
    notifyChange();
    return updated;
  };

  const markArrived = async (bookingId: string, priestId?: string, priestName?: string): Promise<Booking> => {
    const updated = await bookingService.markArrived(bookingId, priestId, priestName);
    await refreshBookings();
    notifyChange();
    return updated;
  };

  const startCeremony = async (bookingId: string, priestId?: string, priestName?: string): Promise<Booking> => {
    const updated = await bookingService.startCeremony(bookingId, priestId, priestName);
    await refreshBookings();
    notifyChange();
    return updated;
  };

  const completeCeremony = async (bookingId: string, priestId?: string, priestName?: string): Promise<Booking> => {
    const updated = await bookingService.completeCeremony(bookingId, priestId, priestName);
    await refreshBookings();
    notifyChange();
    return updated;
  };

  const cancelBooking = async (bookingId: string, reason: string): Promise<Booking> => {
    const updated = await bookingService.cancelBooking(bookingId, reason);
    await refreshBookings();
    notifyChange();
    return updated;
  };

  const adminOverrideStatus = async (
    bookingId: string,
    newStatus: BookingStatus,
    adminId?: string,
    adminName?: string,
    reason?: string
  ): Promise<Booking> => {
    const updated = await bookingService.adminOverrideStatus(bookingId, newStatus, adminId, adminName, reason);
    await refreshBookings();
    notifyChange();
    return updated;
  };

  const rateBooking = async (bookingId: string, rating: number, review: string): Promise<Booking> => {
    const updated = await bookingService.rateBooking(bookingId, rating, review);
    await refreshBookings();
    notifyChange();
    return updated;
  };

  const getRequestById = async (id: string): Promise<PriestRequest | null> => {
    return requestService.getRequestById(id);
  };

  const getBookingById = async (id: string): Promise<Booking | null> => {
    return bookingService.getBookingById(id);
  };

  return (
    <BookingContext.Provider
      value={{
        draft,
        setDraft,
        updateDraft,
        clearDraft,
        requests,
        bookings,
        refreshRequests,
        refreshBookings,
        sendRequestFromDraft,
        acceptRequest,
        rejectRequest,
        payAndConfirmRequest,
        completeBooking,
        startJourney,
        markArrived,
        startCeremony,
        completeCeremony,
        cancelBooking,
        adminOverrideStatus,
        rateBooking,
        getRequestById,
        getBookingById
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = (): BookingContextType => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};
