import { PriestRequest, RequestStatus, RejectionReason, Booking, BookingDraft } from '../types';
import { bookingService, sanitizeInputString } from './bookingService';
import { notificationService } from './notificationService';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { authService } from './authService';
import { doc, getDoc, setDoc, updateDoc, getDocs, collection, query, where } from 'firebase/firestore';

const REQUESTS_STORAGE_KEY = 'purohit_requests';

// Helper to generate Request IDs like REQ-20260831-4821
export const generateRequestId = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `REQ-${dateStr}-${randomSuffix}`;
};

export const requestService = {
  // Get all requests aligned with least-privilege Firestore rules or localStorage fallback
  getRequests: async (userRole?: string, targetUserId?: string): Promise<PriestRequest[]> => {
    if (auth.currentUser) {
      try {
        const uid = targetUserId || auth.currentUser.uid;
        const currentAppUser = authService.getCurrentUser();
        const role = userRole || currentAppUser?.role || 'customer';

        let reqQuery;
        if (role === 'admin') {
          reqQuery = collection(db, 'requests');
        } else if (role === 'priest') {
          reqQuery = query(collection(db, 'requests'), where('priestId', '==', uid));
        } else {
          reqQuery = query(collection(db, 'requests'), where('customerId', '==', uid));
        }

        const snap = await getDocs(reqQuery);
        if (!snap.empty) {
          const list: PriestRequest[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data() as PriestRequest;
            list.push({ ...data, id: docSnap.id });
          });
          if (list.length > 0) {
            const saved = localStorage.getItem(REQUESTS_STORAGE_KEY);
            const localList: PriestRequest[] = saved ? JSON.parse(saved) : [];
            const map = new Map<string, PriestRequest>();
            localList.forEach(r => map.set(r.id, r));
            list.forEach(r => map.set(r.id, r));
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
            localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(merged));
            return merged;
          }
        }
      } catch (err) {
        console.warn('Firestore getRequests query notice (using local state):', err);
      }
    }

    const saved = localStorage.getItem(REQUESTS_STORAGE_KEY);
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
    return [];
  },

  getAllRequests: async (): Promise<PriestRequest[]> => {
    return requestService.getRequests();
  },

  getRequestById: async (id: string): Promise<PriestRequest | null> => {
    if (!id) return null;

    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'requests', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return { ...docSnap.data(), id: docSnap.id } as PriestRequest;
        }
      } catch (err) {
        console.warn('Firestore getRequestById fallback:', err);
      }
    }

    const requests = await requestService.getRequests();
    const cleanId = id.trim().toLowerCase();
    const found = requests.find(r => r.id.toLowerCase() === cleanId || r.requestId?.toLowerCase() === cleanId) || null;
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

  getCustomerRequests: async (
    customerId: string,
    filterStatus?: RequestStatus | 'ALL'
  ): Promise<PriestRequest[]> => {
    const requests = await requestService.getRequests('customer', customerId);
    const customerList = requests.filter(r => r.customerId === customerId);

    if (!filterStatus || filterStatus === 'ALL') {
      return customerList;
    }

    if (filterStatus === 'ACCEPTED' || filterStatus === 'PAYMENT_PENDING') {
      return customerList.filter(r => r.status === 'ACCEPTED' || r.status === 'PAYMENT_PENDING');
    }

    return customerList.filter(r => r.status === filterStatus);
  },

  getPriestRequests: async (
    priestId: string,
    filterStatus?: RequestStatus | 'ALL'
  ): Promise<PriestRequest[]> => {
    const requests = await requestService.getRequests('priest', priestId);
    const priestList = requests.filter(r => r.priestId === priestId);

    if (!filterStatus || filterStatus === 'ALL') {
      return priestList;
    }

    return priestList.filter(r => r.status === filterStatus);
  },

  updateRequestStatus: async (requestId: string, status: RequestStatus): Promise<PriestRequest> => {
    const requests = await requestService.getRequests();
    const index = requests.findIndex(r => r.id === requestId || r.requestId === requestId);
    if (index === -1) throw new Error('Request not found');

    const updated: PriestRequest = {
      ...requests[index],
      status,
      updatedAt: new Date().toISOString()
    };

    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'requests', updated.id);
        await updateDoc(docRef, {
          status: updated.status,
          updatedAt: updated.updatedAt
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `requests/${updated.id}`);
      }
    }

    requests[index] = updated;
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));
    return updated;
  },

  // Create a new request with status = PENDING (NO payment and NO booking created)
  createRequest: async (requestData: Partial<PriestRequest> | BookingDraft): Promise<PriestRequest> => {
    const requests = await requestService.getRequests();
    const uniqueId = generateRequestId();
    const now = new Date().toISOString();

    const formattedAddress = typeof (requestData as any).location === 'object' && (requestData as any).location !== null
      ? (requestData as any).location
      : requestData.address || {
          street: 'Ceremony Venue',
          area: 'Locality',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500001'
        };

    const rawLocationString = typeof (requestData as any).location === 'string'
      ? (requestData as any).location
      : `${formattedAddress.street}, ${formattedAddress.area}, ${formattedAddress.city} - ${formattedAddress.pincode}`;
    const locationString = sanitizeInputString(rawLocationString, 300);

    const sanitizedCustomerName = sanitizeInputString(requestData.customerName, 80) || 'Devotee';
    const sanitizedCustomerPhone = sanitizeInputString(requestData.customerPhone, 25) || '';
    const sanitizedCustomerEmail = sanitizeInputString(requestData.customerEmail, 80) || '';
    const rawNotes = requestData.notes || requestData.specialNotes || '';
    const sanitizedNotes = sanitizeInputString(rawNotes, 1000);

    const servicePrice = requestData.servicePrice || 5000;
    const platformFee = requestData.platformFee || 250;
    const totalAmount = requestData.totalAmount || (servicePrice + platformFee);

    const newRequest: PriestRequest = {
      id: uniqueId,
      requestId: uniqueId,
      customerId: requestData.customerId || auth.currentUser?.uid || '',
      customerName: sanitizedCustomerName,
      customerPhone: sanitizedCustomerPhone,
      customerEmail: sanitizedCustomerEmail,
      priestId: requestData.priestId || 'pr-101',
      priestName: requestData.priestName || 'Sri Ramesh Sharma',
      priestAvatar: requestData.priestAvatar || requestData.priestImage || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
      priestImage: requestData.priestImage || requestData.priestAvatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
      priestTitle: requestData.priestTitle || 'Vedic Acharya',
      priestRating: requestData.priestRating || 4.9,
      priestPhone: (requestData as any).priestPhone || '',
      eventId: requestData.eventId || 'evt-1',
      eventName: requestData.eventName || 'Gruhapravesham',
      serviceId: requestData.serviceId || 'srv-1',
      serviceName: requestData.serviceName || requestData.eventName || 'Vedic Puja Ceremony',
      date: requestData.date || now.split('T')[0],
      time: requestData.time || requestData.timeSlot || '10:00 AM',
      timeSlot: requestData.time || requestData.timeSlot || '10:00 AM',
      location: locationString,
      address: formattedAddress,
      notes: sanitizedNotes,
      specialNotes: sanitizedNotes,
      includeSamagri: requestData.includeSamagri ?? true,
      servicePrice,
      platformFee,
      taxes: requestData.taxes || 0,
      totalAmount,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now
    };

    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'requests', uniqueId);
        await setDoc(docRef, newRequest);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `requests/${uniqueId}`);
      }
    }

    const updated = [newRequest, ...requests];
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(updated));

    // Send notifications to Priest (New Request) and Customer (Request Submitted)
    await Promise.all([
      notificationService.createNotification({
        userId: newRequest.priestId,
        targetRole: 'priest',
        title: `New Puja Request: ${newRequest.eventName}`,
        message: `${newRequest.customerName} has requested you for ${newRequest.eventName} on ${newRequest.date} at ${newRequest.time}.`,
        type: 'PRIEST_NEW_REQUEST',
        category: 'BOOKING',
        priority: 'urgent',
        requestId: newRequest.id,
        link: '/priest/bookings'
      }),
      notificationService.createNotification({
        userId: newRequest.customerId,
        targetRole: 'customer',
        title: `Request Submitted: ${newRequest.eventName}`,
        message: `Your ceremony request has been submitted to Acharya ${newRequest.priestName}. You will be notified as soon as availability is confirmed.`,
        type: 'REQUEST_SUBMITTED',
        category: 'BOOKING',
        priority: 'normal',
        requestId: newRequest.id,
        link: '/requests'
      })
    ]);

    return newRequest;
  },

  // Priest accepts request -> checks conflict -> status becomes ACCEPTED
  acceptRequest: async (requestId: string): Promise<PriestRequest> => {
    const requests = await requestService.getRequests();
    const index = requests.findIndex(r => r.id === requestId || r.requestId === requestId);
    if (index === -1) throw new Error('Request not found');

    const req = requests[index];

    // Check if priest already has a confirmed booking for this exact date & time
    const hasConflict = await bookingService.hasBookingConflict(req.priestId, req.date, req.time);
    if (hasConflict) {
      throw new Error('This priest is already booked for this time.');
    }

    const now = new Date().toISOString();
    const updatedRequest: PriestRequest = {
      ...req,
      status: 'ACCEPTED',
      updatedAt: now,
      respondedAt: now
    };

    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'requests', updatedRequest.id);
        await updateDoc(docRef, {
          status: 'ACCEPTED',
          updatedAt: now,
          respondedAt: now
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `requests/${updatedRequest.id}`);
      }
    }

    requests[index] = updatedRequest;
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));

    // Notify customer and priest that request has been accepted
    await Promise.all([
      notificationService.createNotification({
        userId: updatedRequest.customerId,
        targetRole: 'customer',
        title: `Priest Accepted: ${updatedRequest.eventName}`,
        message: `Acharya ${updatedRequest.priestName} has accepted your request. Payment is required to confirm booking and secure the muhurtham.`,
        type: 'REQUEST_ACCEPTED',
        category: 'BOOKING',
        priority: 'high',
        requestId: updatedRequest.id,
        link: `/payment/${updatedRequest.id}`
      }),
      notificationService.createNotification({
        userId: updatedRequest.priestId,
        targetRole: 'priest',
        title: `Request Accepted: ${updatedRequest.eventName}`,
        message: `You accepted ${updatedRequest.customerName}'s request for ${updatedRequest.eventName}. Awaiting customer payment confirmation.`,
        type: 'PRIEST_REQUEST_ACCEPTED',
        category: 'BOOKING',
        priority: 'normal',
        requestId: updatedRequest.id,
        link: '/priest/bookings'
      })
    ]);

    return updatedRequest;
  },

  // Priest rejects request -> status becomes REJECTED with reason & optional notes
  rejectRequest: async (
    requestId: string,
    reason: RejectionReason | string,
    notes?: string
  ): Promise<PriestRequest> => {
    const requests = await requestService.getRequests();
    const index = requests.findIndex(r => r.id === requestId || r.requestId === requestId);
    if (index === -1) throw new Error('Request not found');

    const now = new Date().toISOString();
    const sanitizedReason = sanitizeInputString(reason, 100);
    const sanitizedNotes = notes ? sanitizeInputString(notes, 500) : undefined;

    const updatedRequest: PriestRequest = {
      ...requests[index],
      status: 'REJECTED',
      rejectionReason: sanitizedReason,
      rejectionNotes: sanitizedNotes,
      updatedAt: now,
      respondedAt: now
    };

    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'requests', updatedRequest.id);
        await updateDoc(docRef, {
          status: 'REJECTED',
          rejectionReason: sanitizedReason,
          rejectionNotes: sanitizedNotes || '',
          updatedAt: now,
          respondedAt: now
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `requests/${updatedRequest.id}`);
      }
    }

    requests[index] = updatedRequest;
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));

    // Notify customer that priest is unavailable
    await notificationService.createNotification({
      userId: updatedRequest.customerId,
      targetRole: 'customer',
      title: `Priest Unavailable: ${updatedRequest.eventName}`,
      message: `Acharya ${updatedRequest.priestName} is unavailable for ${updatedRequest.date} (${reason}). Please select another verified priest.`,
      type: 'REQUEST_REJECTED',
      category: 'BOOKING',
      priority: 'high',
      requestId: updatedRequest.id,
      link: '/priests'
    });

    return updatedRequest;
  },

  // Customer completes payment -> creates confirmed booking & updates request status
  completePaymentAndConfirm: async (
    requestId: string,
    paymentMethod: 'UPI' | 'Card' | 'NetBanking' | 'CashOnPuja' = 'UPI',
    paymentId?: string,
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
    const requests = await requestService.getRequests();
    const index = requests.findIndex(r => r.id === requestId || r.requestId === requestId);
    if (index === -1) throw new Error('Request not found');

    const req = requests[index];
    if (req.status === 'PENDING') {
      throw new Error('No payment is permitted while the request is still awaiting priest confirmation.');
    }
    if (req.status === 'REJECTED' || req.status === 'CANCELLED') {
      throw new Error('Cannot complete payment for a rejected or cancelled request.');
    }

    const appliedRewardId = rewardInfo?.appliedRewardId || req.appliedRewardId;
    const appliedRewardCode = rewardInfo?.appliedRewardCode || req.appliedRewardCode;
    const rewardDiscount = rewardInfo?.rewardDiscount || req.rewardDiscount || 0;
    const finalTotal = verifiedMeta?.serverCalculatedTotal !== undefined
      ? verifiedMeta.serverCalculatedTotal
      : Math.max(0, (req.servicePrice || 5000) + (req.platformFee || 250) - rewardDiscount);

    // 1. Create Confirmed Booking in bookingService
    const confirmedBooking = await bookingService.createConfirmedBooking({
      requestId: req.id,
      customerId: req.customerId,
      customerName: req.customerName,
      customerPhone: req.customerPhone,
      customerEmail: req.customerEmail,
      priestId: req.priestId,
      priestName: req.priestName,
      priestAvatar: req.priestAvatar,
      priestImage: req.priestImage,
      priestTitle: req.priestTitle,
      eventId: req.eventId,
      eventName: req.eventName,
      serviceId: req.serviceId,
      serviceName: req.serviceName,
      date: req.date,
      time: req.time,
      timeSlot: req.timeSlot,
      location: req.location,
      address: req.address,
      notes: req.notes,
      specialNotes: req.specialNotes,
      servicePrice: req.servicePrice,
      platformFee: req.platformFee || 250,
      rewardDiscount: rewardDiscount > 0 ? rewardDiscount : undefined,
      appliedRewardId,
      appliedRewardCode,
      totalAmount: finalTotal,
      paymentMethod,
      paymentStatus: 'completed',
      status: 'confirmed',
      bookingStatus: 'CONFIRMED',
      paymentId,
      orderId: verifiedMeta?.orderId || req.activeOrderId,
      isDemoPayment: verifiedMeta?.isDemoPayment,
      platformCommission: verifiedMeta?.platformCommission,
      priestPayableAmount: verifiedMeta?.priestPayableAmount,
      escrowStatus: (verifiedMeta?.escrowStatus as any) || 'HELD_IN_ESCROW'
    });

    // Mark reward voucher as USED
    if (appliedRewardId) {
      try {
        const { rewardService } = await import('./rewardService');
        await rewardService.markRewardAsUsed(appliedRewardId, confirmedBooking.id);
      } catch (err) {
        console.warn('Failed to mark reward as used:', err);
      }
    }

    // 2. Update Request Status to PAYMENT_COMPLETED & attach bookingId
    const now = new Date().toISOString();
    const updatedRequest: PriestRequest = {
      ...req,
      status: 'PAYMENT_COMPLETED',
      paymentStatus: 'completed',
      paymentMethod,
      appliedRewardId,
      appliedRewardCode,
      rewardDiscount: rewardDiscount > 0 ? rewardDiscount : undefined,
      totalAmount: finalTotal,
      bookingId: confirmedBooking.id,
      updatedAt: now
    };

    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'requests', updatedRequest.id);
        await updateDoc(docRef, {
          status: 'PAYMENT_COMPLETED',
          paymentStatus: 'completed',
          paymentMethod,
          bookingId: confirmedBooking.id,
          updatedAt: now
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `requests/${updatedRequest.id}`);
      }
    }

    requests[index] = updatedRequest;
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));

    // 3. Send notifications to both Customer and Priest
    await Promise.all([
      notificationService.createNotification({
        userId: req.customerId,
        targetRole: 'customer',
        title: `Payment Successful: ₹${req.totalAmount}`,
        message: `Your payment of ₹${req.totalAmount} is securely held in 100% Escrow Protection. Booking ID: ${confirmedBooking.id}.`,
        type: 'PAYMENT_SUCCESSFUL',
        category: 'PAYMENT',
        priority: 'high',
        requestId: req.id,
        bookingId: confirmedBooking.id,
        link: `/bookings/${confirmedBooking.id}`
      }),
      notificationService.createNotification({
        userId: req.customerId,
        targetRole: 'customer',
        title: `Booking Confirmed: ${req.eventName}`,
        message: `Acharya ${req.priestName} is confirmed for ${req.date} at ${req.time}. View your live ceremony dashboard and samagri list.`,
        type: 'BOOKING_CONFIRMED',
        category: 'BOOKING',
        priority: 'high',
        requestId: req.id,
        bookingId: confirmedBooking.id,
        link: `/bookings/${confirmedBooking.id}`
      }),
      notificationService.createNotification({
        userId: req.priestId,
        targetRole: 'priest',
        title: `Customer Payment Completed: ${req.eventName}`,
        message: `${req.customerName} has completed payment of ₹${req.totalAmount}. Dakshina is locked in escrow.`,
        type: 'PRIEST_PAYMENT_RECEIVED',
        category: 'PAYMENT',
        priority: 'high',
        requestId: req.id,
        bookingId: confirmedBooking.id,
        link: '/priest/bookings'
      }),
      notificationService.createNotification({
        userId: req.priestId,
        targetRole: 'priest',
        title: `Booking Confirmed: ${req.eventName}`,
        message: `Ceremony is confirmed for ${req.date} at ${req.time} with ${req.customerName}.`,
        type: 'PRIEST_BOOKING_CONFIRMED',
        category: 'BOOKING',
        priority: 'high',
        requestId: req.id,
        bookingId: confirmedBooking.id,
        link: '/priest/bookings'
      })
    ]);

    return { request: updatedRequest, booking: confirmedBooking };
  },

  cancelRequest: async (requestId: string, reason?: string): Promise<PriestRequest> => {
    const requests = await requestService.getRequests();
    const index = requests.findIndex(r => r.id === requestId || r.requestId === requestId);
    if (index === -1) throw new Error('Request not found');

    const updatedRequest: PriestRequest = {
      ...requests[index],
      status: 'CANCELLED',
      rejectionNotes: reason,
      updatedAt: new Date().toISOString()
    };

    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'requests', updatedRequest.id);
        await updateDoc(docRef, {
          status: 'CANCELLED',
          rejectionNotes: reason || '',
          updatedAt: updatedRequest.updatedAt
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `requests/${updatedRequest.id}`);
      }
    }

    requests[index] = updatedRequest;
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));

    // Notify priest that customer has cancelled request
    try {
      await Promise.all([
        notificationService.createNotification({
          userId: updatedRequest.priestId,
          targetRole: 'priest',
          title: `Customer Cancelled Request: ${updatedRequest.eventName}`,
          message: `${updatedRequest.customerName} has cancelled their request for ${updatedRequest.date}. Reason: ${reason || 'Customer rescheduled'}.`,
          type: 'PRIEST_REQUEST_CANCELLED',
          category: 'BOOKING',
          priority: 'normal',
          requestId: updatedRequest.id,
          link: '/priest/bookings'
        }),
        notificationService.createNotification({
          userId: updatedRequest.customerId,
          targetRole: 'customer',
          title: `Request Cancelled: ${updatedRequest.eventName}`,
          message: `You cancelled your booking request for ${updatedRequest.eventName} with ${updatedRequest.priestName}.`,
          type: 'BOOKING_CANCELLED',
          category: 'BOOKING',
          priority: 'normal',
          requestId: updatedRequest.id,
          link: '/requests'
        })
      ]);
    } catch {
      // ignore
    }

    return updatedRequest;
  }
};
