import { Priest, Review, PriestServiceItem, SlotAvailabilityInfo, PriestAvailabilitySchedule, PriestEventAvailability } from '../types';
import { MOCK_PRIESTS, MOCK_REVIEWS } from '../data/mockData';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, getDocs, collection } from 'firebase/firestore';
import { bookingService } from './bookingService';
import { requestService } from './requestService';
import { notificationService } from './notificationService';

const PRIESTS_STORAGE_KEY = 'purohit_seva_priests_list';
const REVIEWS_STORAGE_KEY = 'purohit_seva_reviews_list';

export const DEFAULT_MUHURTHAM_SLOTS = [
  '06:00 AM',
  '08:30 AM',
  '11:00 AM',
  '03:30 PM',
  '05:00 PM',
  '07:30 PM'
];

export interface PriestFilterOptions {
  searchQuery?: string;
  city?: string;
  eventId?: string;
  language?: string;
  tradition?: string;
  minRating?: number;
  maxPrice?: number;
  minExperience?: number;
  availableDate?: string;
  verifiedOnly?: boolean;
}

export const priestService = {
  getPriests: async (filters?: PriestFilterOptions): Promise<Priest[]> => {
    let priests: Priest[] = [];

    // Try fetching from Firestore first if available
    if (auth.currentUser) {
      try {
        const priestCol = collection(db, 'priests');
        const snap = await getDocs(priestCol);
        if (!snap.empty) {
          const list: Priest[] = [];
          snap.forEach((d) => {
            list.push({ ...d.data(), id: d.id } as Priest);
          });
          if (list.length > 0) {
            // Merge with mock priests to guarantee comprehensive catalog
            const mergedMap = new Map<string, Priest>();
            MOCK_PRIESTS.forEach(p => mergedMap.set(p.id, p));
            list.forEach(p => mergedMap.set(p.id, { ...mergedMap.get(p.id), ...p }));
            priests = Array.from(mergedMap.values());
            localStorage.setItem(PRIESTS_STORAGE_KEY, JSON.stringify(priests));
          }
        }
      } catch (err) {
        console.warn('Firestore getPriests fallback:', err);
      }
    }

    if (priests.length === 0) {
      const saved = localStorage.getItem(PRIESTS_STORAGE_KEY);
      if (saved) {
        try {
          priests = JSON.parse(saved);
        } catch {
          priests = MOCK_PRIESTS;
        }
      } else {
        priests = MOCK_PRIESTS;
      }
    }

    if (!filters) return priests;

    return priests.filter(p => {
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCity = p.city.toLowerCase().includes(q);
        const matchesTradition = p.tradition.toLowerCase().includes(q);
        const matchesServices = p.services.some(s => (s.name || s.eventName || '').toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
        if (!matchesName && !matchesCity && !matchesTradition && !matchesServices) return false;
      }

      if (filters.city && filters.city !== 'All Cities' && p.city.toLowerCase() !== filters.city.toLowerCase()) {
        return false;
      }

      if (filters.language && filters.language !== 'All Languages' && !p.languages.includes(filters.language)) {
        return false;
      }

      if (filters.tradition && filters.tradition !== 'All Traditions' && !p.tradition.toLowerCase().includes(filters.tradition.toLowerCase())) {
        return false;
      }

      if (filters.minRating && p.rating < filters.minRating) {
        return false;
      }

      if (filters.maxPrice && p.startingPrice > filters.maxPrice) {
        return false;
      }

      if (filters.minExperience && p.experienceYears < filters.minExperience) {
        return false;
      }

      if (filters.eventId) {
        const hasService = p.services.some(s => s.eventId === filters.eventId);
        if (!hasService) return false;
      }

      if (filters.availableDate) {
        const isBlocked = (p.blockedDates || []).includes(filters.availableDate);
        const isAvailable = (p.availableDates || []).length === 0 || (p.availableDates || []).includes(filters.availableDate);
        if (isBlocked || !isAvailable) {
          return false;
        }
      }

      if (filters.verifiedOnly && !p.isVerified) {
        return false;
      }

      return true;
    });
  },

  getPriestById: async (id: string): Promise<Priest | null> => {
    if (!id) return null;

    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'priests', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const priestData = { ...docSnap.data(), id: docSnap.id } as Priest;
          return priestData;
        }
      } catch (err) {
        console.warn('Firestore getPriestById fallback:', err);
      }
    }

    const priests = await priestService.getPriests();
    const cleanId = id.trim().toLowerCase();
    const found = priests.find(p => p.id.toLowerCase() === cleanId) || null;
    if (found && !found.timeSlots && found.availableTimeSlots) {
      found.timeSlots = found.availableTimeSlots;
    }
    return found;
  },

  updatePriest: async (id: string, updates: Partial<Priest>): Promise<Priest> => {
    const priests = await priestService.getPriests();
    const index = priests.findIndex(p => p.id === id);
    const existing = index !== -1 ? priests[index] : (MOCK_PRIESTS.find(p => p.id === id) || {
      id,
      name: 'Acharya',
      city: 'Bengaluru',
      title: 'Vedic Scholar',
      startingPrice: 5000,
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
      isVerified: true,
      verificationStatus: 'verified',
      experienceYears: 10,
      location: 'Bengaluru',
      languages: ['Sanskrit', 'Kannada', 'Hindi'],
      tradition: 'Smartha',
      rating: 4.9,
      reviewCount: 20,
      about: 'Vedic priest',
      services: [],
      availableDates: []
    } as Priest);

    const updatedPriest: Priest = { ...existing, ...updates };

    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'priests', id);
        await setDoc(docRef, updatedPriest, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `priests/${id}`);
      }
    }

    if (index !== -1) {
      priests[index] = updatedPriest;
    } else {
      priests.push(updatedPriest);
    }
    localStorage.setItem(PRIESTS_STORAGE_KEY, JSON.stringify(priests));
    return updatedPriest;
  },

  updatePriestProfile: async (id: string, updates: Partial<Priest>): Promise<Priest> => {
    return priestService.updatePriest(id, updates);
  },

  toggleVerification: async (id: string, isVerified: boolean): Promise<Priest> => {
    return priestService.updatePriest(id, {
      isVerified,
      verificationStatus: isVerified ? 'verified' : 'pending'
    });
  },

  updatePriestVerification: async (id: string, status: 'verified' | 'pending' | 'rejected' | 'suspended'): Promise<Priest> => {
    const updated = await priestService.updatePriest(id, {
      verificationStatus: status,
      isVerified: status === 'verified'
    });

    try {
      await notificationService.createNotification({
        userId: id,
        targetRole: 'priest',
        title: status === 'verified' ? '✅ Acharya Profile Verified' : 'Acharya Verification Status Update',
        message: status === 'verified'
          ? 'Congratulations! Your Vedic shastra credentials have been approved by the Acharya Council. You are now verified on Purohit Seva.'
          : `Your acharya verification status has been marked as ${status}. Contact admin concierge if you have questions.`,
        type: 'SYSTEM_ALERT',
        category: 'SYSTEM',
        priority: status === 'verified' ? 'high' : 'normal',
        link: '/priest/profile'
      });
    } catch {
      // ignore
    }

    return updated;
  },

  updatePriestServices: async (priestId: string, services: PriestServiceItem[]): Promise<Priest> => {
    const priest = await priestService.getPriestById(priestId);
    if (!priest) throw new Error('Priest not found');
    
    const minPrice = services.length > 0 ? Math.min(...services.map(s => s.price)) : priest.startingPrice;
    return priestService.updatePriest(priestId, { services, startingPrice: minPrice });
  },

  addService: async (priestId: string, serviceData: Omit<PriestServiceItem, 'id'>): Promise<Priest> => {
    const priest = await priestService.getPriestById(priestId);
    if (!priest) throw new Error('Priest not found');

    const newService: PriestServiceItem = {
      ...serviceData,
      id: `srv-${Date.now()}`
    };

    const updatedServices = [...priest.services, newService];
    return priestService.updatePriestServices(priestId, updatedServices);
  },

  updateService: async (priestId: string, serviceId: string, updates: Partial<PriestServiceItem>): Promise<Priest> => {
    const priest = await priestService.getPriestById(priestId);
    if (!priest) throw new Error('Priest not found');

    const updatedServices = priest.services.map(s => s.id === serviceId ? { ...s, ...updates } : s);
    return priestService.updatePriestServices(priestId, updatedServices);
  },

  deleteService: async (priestId: string, serviceId: string): Promise<Priest> => {
    const priest = await priestService.getPriestById(priestId);
    if (!priest) throw new Error('Priest not found');

    const updatedServices = priest.services.filter(s => s.id !== serviceId);
    return priestService.updatePriestServices(priestId, updatedServices);
  },

  // Save complete Priest Schedule to Firestore
  updatePriestSchedule: async (
    priestId: string,
    schedule: {
      availableDates: string[];
      blockedDates?: string[];
      timeSlots: string[];
      customDateSlots?: { [date: string]: string[] };
      eventAvailability?: { [eventId: string]: PriestEventAvailability };
    }
  ): Promise<Priest> => {
    const updates: Partial<Priest> = {
      availableDates: schedule.availableDates || [],
      blockedDates: schedule.blockedDates || [],
      timeSlots: schedule.timeSlots || DEFAULT_MUHURTHAM_SLOTS,
      availableTimeSlots: schedule.timeSlots || DEFAULT_MUHURTHAM_SLOTS,
      customDateSlots: schedule.customDateSlots || {},
      eventAvailability: schedule.eventAvailability || {}
    };

    // Save under priest doc
    const updated = await priestService.updatePriest(priestId, updates);

    // Also persist in Firestore subcollection for audit/security if authenticated
    if (auth.currentUser) {
      try {
        const scheduleDocRef = doc(db, 'priests', priestId, 'availability', 'schedule');
        await setDoc(scheduleDocRef, {
          ...updates,
          priestId,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Subcollection schedule save note:', err);
      }
    }

    return updated;
  },

  updateAvailability: async (
    priestId: string,
    availableDates: string[],
    timeSlots: string[],
    blockedDates?: string[],
    customDateSlots?: { [date: string]: string[] }
  ): Promise<Priest> => {
    return priestService.updatePriestSchedule(priestId, {
      availableDates,
      blockedDates: blockedDates || [],
      timeSlots,
      customDateSlots
    });
  },

  updatePriestAvailability: async (
    priestId: string,
    availableDates: string[],
    availableTimeSlots: string[],
    blockedDates: string[]
  ): Promise<Priest> => {
    return priestService.updatePriestSchedule(priestId, {
      availableDates,
      blockedDates,
      timeSlots: availableTimeSlots
    });
  },

  // Get real-time slot availability for a priest on a specific date (evaluates Firestore bookings & schedules)
  getPriestAvailableSlotsForDate: async (
    priestId: string,
    date: string,
    eventId?: string
  ): Promise<SlotAvailabilityInfo[]> => {
    if (!priestId || !date) return [];

    const priest = await priestService.getPriestById(priestId);
    if (!priest) return [];

    const normalizedDate = date.trim();
    const isBlocked = (priest.blockedDates || []).includes(normalizedDate);
    const isExplicitlyAvailable = (priest.availableDates || []).includes(normalizedDate);

    // Determine candidate slots for this day / event
    let candidateSlots: string[] = [];

    // 1. Check if there's event-specific slot configuration
    if (eventId && priest.eventAvailability && priest.eventAvailability[eventId]?.allowedSlots?.length) {
      candidateSlots = priest.eventAvailability[eventId].allowedSlots || [];
    }
    // 2. Check if there are date-specific custom slots
    else if (priest.customDateSlots && priest.customDateSlots[normalizedDate]?.length) {
      candidateSlots = priest.customDateSlots[normalizedDate];
    }
    // 3. Use priest's general daily slots
    else if (priest.timeSlots && priest.timeSlots.length > 0) {
      candidateSlots = priest.timeSlots;
    } else if (priest.availableTimeSlots && priest.availableTimeSlots.length > 0) {
      candidateSlots = priest.availableTimeSlots;
    } else {
      candidateSlots = DEFAULT_MUHURTHAM_SLOTS;
    }

    // If day is blocked or not in available list (when available list is explicitly set), all slots are unavailable
    if (isBlocked) {
      return candidateSlots.map(slot => ({
        slot,
        isBooked: false,
        isBlocked: true,
        isAvailable: false,
        reason: 'Priest is unavailable on this date'
      }));
    }

    // Fetch existing confirmed bookings from Firestore as single source of truth
    const [allBookings, allRequests] = await Promise.all([
      bookingService.getBookings(),
      requestService.getRequests()
    ]);

    // Active confirmed bookings
    const confirmedBookingsForDate = allBookings.filter(b => {
      const isSamePriest = b.priestId === priestId;
      const isConfirmed = b.bookingStatus === 'CONFIRMED' || b.status === 'confirmed';
      const isSameDate = (b.date || '').trim() === normalizedDate;
      return isSamePriest && isConfirmed && isSameDate;
    });

    // Active accepted requests awaiting payment
    const acceptedRequestsForDate = allRequests.filter(r => {
      const isSamePriest = r.priestId === priestId;
      const isLocked = r.status === 'ACCEPTED' || r.status === 'PAYMENT_PENDING';
      const isSameDate = (r.date || '').trim() === normalizedDate;
      return isSamePriest && isLocked && isSameDate;
    });

    const normalizeTime = (t: string) => t.trim().toLowerCase().replace(/\s+/g, '');

    return candidateSlots.map(slot => {
      const normSlot = normalizeTime(slot);

      // Check confirmed booking collision
      const matchedBooking = confirmedBookingsForDate.find(b => {
        const bTime = normalizeTime(b.time || b.timeSlot || '');
        return bTime === normSlot;
      });

      if (matchedBooking) {
        return {
          slot,
          isBooked: true,
          isBlocked: false,
          isAvailable: false,
          bookingId: matchedBooking.id,
          bookingEventName: matchedBooking.eventName,
          bookingCustomerName: matchedBooking.customerName,
          reason: 'Slot reserved for confirmed puja ceremony'
        };
      }

      // Check active accepted request collision
      const matchedRequest = acceptedRequestsForDate.find(r => {
        const rTime = normalizeTime(r.time || r.timeSlot || '');
        return rTime === normSlot;
      });

      if (matchedRequest) {
        return {
          slot,
          isBooked: true,
          isBlocked: false,
          isAvailable: false,
          bookingId: matchedRequest.id,
          bookingEventName: matchedRequest.eventName,
          bookingCustomerName: matchedRequest.customerName,
          reason: 'Awaiting devotee payment confirmation'
        };
      }

      return {
        slot,
        isBooked: false,
        isBlocked: false,
        isAvailable: true
      };
    });
  },

  // Final validation check to prevent double bookings before request submission
  checkSlotAvailability: async (
    priestId: string,
    date: string,
    timeSlot: string,
    eventId?: string
  ): Promise<{ available: boolean; reason?: string }> => {
    if (!priestId || !date || !timeSlot) {
      return { available: false, reason: 'Invalid priest, date or time slot.' };
    }

    const slots = await priestService.getPriestAvailableSlotsForDate(priestId, date, eventId);
    const normalizeTime = (t: string) => t.trim().toLowerCase().replace(/\s+/g, '');
    const normTarget = normalizeTime(timeSlot);

    const found = slots.find(s => normalizeTime(s.slot) === normTarget);
    if (!found) {
      return {
        available: false,
        reason: `The slot "${timeSlot}" is not on this priest's active schedule for ${date}.`
      };
    }

    if (found.isBlocked) {
      return {
        available: false,
        reason: `Acharya has marked ${date} as blocked/unavailable.`
      };
    }

    if (found.isBooked) {
      return {
        available: false,
        reason: `The time slot "${timeSlot}" is already booked for another ceremony. Please select a different slot.`
      };
    }

    return { available: true };
  },

  getReviewsByPriestId: async (priestId: string): Promise<Review[]> => {
    let reviews: Review[] = [];
    const saved = localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (saved) {
      try {
        reviews = JSON.parse(saved);
      } catch {
        reviews = MOCK_REVIEWS;
      }
    } else {
      reviews = MOCK_REVIEWS;
    }
    return reviews.filter(r => r.priestId === priestId);
  },

  getPriestReviews: async (priestId: string): Promise<Review[]> => {
    return priestService.getReviewsByPriestId(priestId);
  },

  addReview: async (review: Omit<Review, 'id' | 'date'>): Promise<Review> => {
    const saved = localStorage.getItem(REVIEWS_STORAGE_KEY);
    const reviews: Review[] = saved ? JSON.parse(saved) : MOCK_REVIEWS;
    
    const newReview: Review = {
      ...review,
      id: `rev-${Date.now()}`,
      date: new Date().toISOString().split('T')[0]
    };
    
    const updated = [newReview, ...reviews];
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(updated));
    return newReview;
  }
};

