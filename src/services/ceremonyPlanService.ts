import { CeremonyPlan, CeremonyPlannerInput, AIClarificationResponse, SamagriItem } from '../types';
import { db } from '../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { notificationService } from './notificationService';

const PLANS_STORAGE_KEY = 'purohit_seva_ceremony_plans_v1';

// In-memory / localStorage cache
const getLocalPlans = (): CeremonyPlan[] => {
  try {
    const raw = localStorage.getItem(PLANS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalPlans = (plans: CeremonyPlan[]) => {
  try {
    localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans));
  } catch (e) {
    console.warn('Failed to save plans to localStorage', e);
  }
};

export const ceremonyPlanService = {
  /**
   * Calculate dynamic readiness percentage based on checklist and booking status
   */
  calculateReadiness: (plan: Partial<CeremonyPlan>): number => {
    let score = 0;

    // 1. Date selected (+15%)
    if (plan.date && plan.date.trim().length > 0 && !plan.date.toLowerCase().includes('undecided')) {
      score += 15;
    }

    // 2. Location selected (+15%)
    if (plan.location && plan.location.trim().length > 0) {
      score += 15;
    }

    // 3. Rituals & Priest requirements confirmed (+10%)
    if (plan.priestRequirements && plan.priestRequirements.priestCount > 0) {
      score += 10;
    }

    // 4. Samagri checklist completion (up to 40%)
    const requiredItems = plan.samagri?.requiredItems || [];
    if (requiredItems.length > 0) {
      const checkedCount = requiredItems.filter(it => it.checked).length;
      const samagriScore = Math.round((checkedCount / requiredItems.length) * 40);
      score += samagriScore;
    } else {
      score += 20;
    }

    // 5. Priest booking status (up to 20%)
    if (plan.status === 'confirmed' || plan.status === 'completed') {
      score += 20;
    } else if (plan.status === 'priest_requested' || plan.bookingId) {
      score += 10;
    }

    return Math.min(100, Math.max(10, score));
  },

  /**
   * Call AI to clarify ambiguous ceremony requests
   */
  askAIClarification: async (queryText: string): Promise<AIClarificationResponse> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('/api/ai/clarify-ceremony', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Clarification API responded with status ${res.status}`);
      }

      const data: AIClarificationResponse = await res.json();
      return data;
    } catch (err) {
      console.info('Using smart Vedic rule-based clarification fallback');
      const isHousewarming = queryText.toLowerCase().includes('house') || queryText.toLowerCase().includes('home');
      return {
        isAmbiguous: true,
        suggestedCeremonyType: isHousewarming ? 'Gruhapravesam / Housewarming' : 'Vedic Puja & Homa',
        greeting: 'Namaste! Welcome to Purohit Seva.',
        clarificationQuestion: isHousewarming
          ? 'Would you like help planning a Gruhapravesam (housewarming) with Vastu Shanti and Navagraha Homa?'
          : 'Which auspicious ceremony are you planning to perform for your family?',
        quickOptions: [
          'Gruhapravesam / Housewarming',
          'Satyanarayana Swamy Vrata',
          'Ganesh Puja',
          'Navagraha Shanti Homa'
        ],
        detectedInfo: { rawQuery: queryText }
      };
    }
  },

  /**
   * Call AI to generate a complete personalized ceremony plan
   */
  generateAIPlan: async (input: CeremonyPlannerInput, userId: string = 'cust-1'): Promise<CeremonyPlan> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 14000);
      const res = await fetch('/api/ai/plan-ceremony', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Plan API error with status ${res.status}`);
      }

      const rawPlan = await res.json();
      const planId = `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const newPlan: CeremonyPlan = {
        id: planId,
        userId: userId || 'cust-1',
        title: rawPlan.title || `${rawPlan.ceremonyType || 'Vedic'} Ceremony Plan`,
        ceremonyType: rawPlan.ceremonyType || 'Vedic Puja',
        eventDetails: {
          rawQuery: input.rawQuery || '',
          purpose: rawPlan.eventDetails?.purpose || 'Sacred Vedic ritual invocation and blessings.',
          description: rawPlan.eventDetails?.description || '',
          significance: rawPlan.eventDetails?.significance || ''
        },
        location: rawPlan.location || input.location || 'Bengaluru',
        date: rawPlan.date || input.date || 'Preferred Date',
        guestCount: rawPlan.guestCount || input.guestCount || '15-25 guests',
        language: rawPlan.language || input.language || 'Sanskrit / Hindi',
        tradition: rawPlan.tradition || input.tradition || 'Smartha / General Vedic',
        rituals: rawPlan.rituals || {
          mainRituals: ['Ganapati Puja', 'Punyahavachanam', 'Maha Mangala Harati'],
          optionalRituals: [],
          sequence: []
        },
        samagri: rawPlan.samagri || { requiredItems: [], optionalItems: [] },
        preparationSteps: rawPlan.preparationSteps || {
          sevenDaysBefore: [],
          oneOrTwoDaysBefore: [],
          ceremonyDay: []
        },
        priestRequirements: rawPlan.priestRequirements || {
          priestCount: 1,
          suggestedExpertise: ['Vedic Vidhana'],
          languagePreference: input.language || 'Sanskrit',
          notes: ''
        },
        estimatedDuration: rawPlan.estimatedDuration || '2.5 to 3.5 hours',
        estimatedBudget: rawPlan.estimatedBudget || {
          min: 4500,
          max: 8500,
          currency: 'INR',
          isApproximate: true,
          note: 'Approximate guidance for priest dakshina and offerings.'
        },
        readinessPercentage: 40,
        status: 'planning',
        disclaimer: rawPlan.disclaimer || 'Ritual practices can vary by family tradition, region, and sampradaya. Please confirm the final ritual sequence and samagri with your selected priest.',
        createdAt: now,
        updatedAt: now
      };

      newPlan.readinessPercentage = ceremonyPlanService.calculateReadiness(newPlan);

      return newPlan;
    } catch (err) {
      console.warn('AI Plan generation failed, building authentic local Vedic plan:', err);
      // Fallback local plan
      const planId = `plan-${Date.now()}`;
      const now = new Date().toISOString();
      const isHouse = (input.rawQuery || input.eventType || '').toLowerCase().includes('house');

      const fallbackPlan: CeremonyPlan = {
        id: planId,
        userId: userId || 'cust-1',
        title: isHouse ? 'Gruhapravesam (Vedic Housewarming Ceremony)' : 'Sri Satyanarayana Swamy Vrata',
        ceremonyType: isHouse ? 'Gruhapravesam / Housewarming' : 'Satyanarayana Puja',
        eventDetails: {
          rawQuery: input.rawQuery || '',
          purpose: isHouse
            ? 'Auspicious entry into a new home to invite Vastu Purusha and Maha Lakshmi blessings.'
            : 'Devotional vrata to invoke Lord Vishnu for family prosperity and obstacle removal.',
          description: isHouse
            ? 'Includes threshold puja, holy milk boiling, Vastu Shanti, and Navagraha Homa.'
            : 'Traditional 5-chapter katha parayana and Sapatha prasadam offering.',
          significance: 'Vedic rituals harmonize positive cosmic vibrations in your living sanctuary.'
        },
        location: input.location || 'Bengaluru',
        date: input.date || 'Upcoming auspicious tithi',
        guestCount: input.guestCount || '20-30 guests',
        language: input.language || 'Sanskrit / Hindi',
        tradition: input.tradition || 'Smartha / General Vedic',
        rituals: {
          mainRituals: isHouse
            ? ['Dwara & Toranam Puja', 'Gau Puja', 'Ganapati Puja', 'Ksheera Tharpanam', 'Vastu Homa', 'Maha Harati']
            : ['Sankalpam', 'Kalasha Sthapana', 'Shodashopachara Archana', 'Satyanarayana Katha', 'Harati & Prasadam'],
          optionalRituals: isHouse ? ['Satyanarayana Swamy Vrata'] : ['Vishnu Sahasranama Stotram'],
          sequence: isHouse ? [
            { step: 1, name: 'Dwara Puja', description: 'Blessing the threshold entrance with turmeric and kumkum.', durationMinutes: 20 },
            { step: 2, name: 'Gau & Vatsa Puja', description: 'Welcoming the sacred cow to shower auspicious Kamadhenu vibrations.', durationMinutes: 25 },
            { step: 3, name: 'Ganapati Puja & Kalasha Sthapana', description: 'Invoking the Remover of Obstacles and sanctifying holy waters.', durationMinutes: 30 },
            { step: 4, name: 'Ksheera Tharpanam', description: 'Boiling milk in a new vessel until it overflows toward the northeast.', durationMinutes: 20 },
            { step: 5, name: 'Vastu & Navagraha Homa', description: 'Sacred fire offerings to appease directional and planetary deities.', durationMinutes: 50 },
            { step: 6, name: 'Purnahuti & Teertha Prasadam', description: 'Final ghee offering and blessing of all family members.', durationMinutes: 30 }
          ] : [
            { step: 1, name: 'Sankalpam & Ganapati Puja', description: 'Taking formal spiritual vow with Gotra and family names.', durationMinutes: 20 },
            { step: 2, name: 'Kalasha Sthapana', description: 'Establishing Varuna Kalasha and invoking sacred rivers.', durationMinutes: 25 },
            { step: 3, name: 'Shodashopachara Archana', description: 'Offering 16 divine services including Tulasi archana.', durationMinutes: 35 },
            { step: 4, name: 'Sri Satyanarayana Katha', description: 'Reciting the 5 sacred chapters of divine grace.', durationMinutes: 50 },
            { step: 5, name: 'Maha Mangala Harati', description: 'Distributing consecrated Sheera prasadam.', durationMinutes: 20 }
          ]
        },
        samagri: {
          requiredItems: [
            { id: 'req-1', name: 'Turmeric powder (Pasupu)', quantity: '250 g', category: 'Puja Essentials', checked: false },
            { id: 'req-2', name: 'Kumkum (Sindoor)', quantity: '100 g', category: 'Puja Essentials', checked: false },
            { id: 'req-3', name: 'Incense sticks (Agarbatti) & Camphor', quantity: '2 packs + 100g', category: 'Puja Essentials', checked: false },
            { id: 'req-4', name: 'Raw Rice (Akshata)', quantity: '2 kg', category: 'Puja Essentials', checked: false },
            { id: 'req-5', name: 'Betel leaves & Supari', quantity: '25 pairs', category: 'Puja Essentials', checked: false },
            { id: 'req-6', name: 'Fresh coconuts with fiber', quantity: '4 nos', category: 'Fruits & Offerings', checked: false },
            { id: 'req-7', name: 'Mango leaves bunches', quantity: '4 bunches', category: 'Flowers & Leaves', checked: false },
            { id: 'req-8', name: 'Assorted seasonal flowers & garlands', quantity: '1.5 kg + 2 garlands', category: 'Flowers & Leaves', checked: false },
            { id: 'req-9', name: 'Assorted 5 seasonal fruits', quantity: '2 kg', category: 'Fruits & Offerings', checked: false },
            { id: 'req-10', name: 'Pure cow ghee for deepam / homa', quantity: '1 kg', category: 'Homa & Hawan Samagri', checked: false },
            { id: 'req-11', name: 'Brass/Copper Kalasha pot', quantity: '1 no', category: 'Vessels & Setup', checked: false }
          ],
          optionalItems: [
            { id: 'opt-1', name: 'Navadhanya 9-grains packet', quantity: '1 set', category: 'Other Items', checked: false },
            { id: 'opt-2', name: 'New bronze/clay milk boiling pot', quantity: '1 no', category: 'Other Items', checked: false }
          ]
        },
        preparationSteps: {
          sevenDaysBefore: [
            'Confirm auspicious muhurtham timing with the family priest.',
            'Arrange ceremonial seating, clean floor peeta, and ensure ventilation.'
          ],
          oneOrTwoDaysBefore: [
            'Draw traditional Kolam/Rangoli at the threshold entrance.',
            'Procure fresh flowers, fruits, coconuts, and review the samagri checklist.',
            'Polish brass lamps, puja bell, and copper vessels.'
          ],
          ceremonyDay: [
            'Take holy bath before sunrise and wear clean traditional attire.',
            'Keep cotton wicks, matchbox, camphor, and milk boiling items handy.'
          ]
        },
        priestRequirements: {
          priestCount: isHouse ? 2 : 1,
          suggestedExpertise: ['Veda Parayana', 'Vastu Shastra', 'Homa Vidhana'],
          languagePreference: input.language || 'Sanskrit / Hindi',
          notes: 'An experienced acharya ensures authentic chanting and guides all ritual steps.'
        },
        estimatedDuration: isHouse ? '3.5 to 4.5 hours' : '2.0 to 2.5 hours',
        estimatedBudget: {
          min: isHouse ? 7000 : 3500,
          max: isHouse ? 13500 : 6500,
          currency: 'INR',
          isApproximate: true,
          note: 'Approximate guidance for priest dakshina and essential items.'
        },
        readinessPercentage: 45,
        status: 'planning',
        disclaimer: 'Ritual practices can vary by family tradition, region, and sampradaya. Please confirm the final ritual sequence and samagri with your selected priest.',
        createdAt: now,
        updatedAt: now
      };

      fallbackPlan.readinessPercentage = ceremonyPlanService.calculateReadiness(fallbackPlan);
      return fallbackPlan;
    }
  },

  /**
   * Save a ceremony plan to Firestore and localStorage
   */
  savePlan: async (plan: CeremonyPlan): Promise<CeremonyPlan> => {
    const updatedPlan: CeremonyPlan = {
      ...plan,
      readinessPercentage: ceremonyPlanService.calculateReadiness(plan),
      updatedAt: new Date().toISOString()
    };

    // 1. Update localStorage
    const local = getLocalPlans();
    const existingIdx = local.findIndex(p => p.id === updatedPlan.id);
    if (existingIdx >= 0) {
      local[existingIdx] = updatedPlan;
    } else {
      local.unshift(updatedPlan);
    }
    saveLocalPlans(local);

    // 2. Persist to Firestore if online & user authenticated
    try {
      const planRef = doc(db, 'ceremonyPlans', updatedPlan.id);
      await setDoc(planRef, {
        ...updatedPlan,
        _serverUpdated: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('Could not save ceremony plan to Firestore, saved locally:', err);
    }

    // 3. Trigger smart notification on new plan save
    try {
      if (existingIdx < 0) {
        await notificationService.createNotification({
          userId: updatedPlan.userId || 'cust-1',
          targetRole: 'customer',
          type: 'CEREMONY_REMINDER',
          category: 'CEREMONY',
          title: 'Ceremony Plan Ready',
          message: `Your ceremony plan for ${updatedPlan.title} is ready. Review your rituals, samagri checklist, and timeline.`,
          link: `/ceremony-planner?planId=${updatedPlan.id}`,
          priority: 'normal',
          idempotencyKey: `notif-plan-ready-${updatedPlan.id}`
        });
      }
    } catch (notifErr) {
      console.warn('Notification trigger failed (non-blocking):', notifErr);
    }

    return updatedPlan;
  },

  /**
   * Get all plans for a user
   */
  getPlans: async (userId: string): Promise<CeremonyPlan[]> => {
    const targetUserId = userId || 'cust-1';
    let plans: CeremonyPlan[] = [];

    // Try Firestore first
    try {
      const q = query(
        collection(db, 'ceremonyPlans'),
        where('userId', '==', targetUserId)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(docSnap => {
        plans.push(docSnap.data() as CeremonyPlan);
      });
    } catch (err) {
      console.warn('Firestore load ceremonyPlans failed, falling back to local storage:', err);
    }

    // If Firestore returned items, merge with local
    const local = getLocalPlans().filter(p => p.userId === targetUserId || targetUserId === 'cust-1');
    const map = new Map<string, CeremonyPlan>();

    // Local items
    local.forEach(p => map.set(p.id, p));
    // Overwrite with Firestore items if newer
    plans.forEach(p => map.set(p.id, p));

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );

    saveLocalPlans(merged);
    return merged;
  },

  /**
   * Get single plan by ID
   */
  getPlanById: async (planId: string): Promise<CeremonyPlan | null> => {
    // 1. Try local cache
    const local = getLocalPlans();
    const foundLocal = local.find(p => p.id === planId);

    // 2. Try Firestore
    try {
      const planRef = doc(db, 'ceremonyPlans', planId);
      const snap = await getDoc(planRef);
      if (snap.exists()) {
        const firestorePlan = snap.data() as CeremonyPlan;
        return firestorePlan;
      }
    } catch (err) {
      console.warn('Firestore getPlanById failed, using cached version:', err);
    }

    return foundLocal || null;
  },

  /**
   * Delete a plan
   */
  deletePlan: async (planId: string): Promise<void> => {
    // Delete local
    const local = getLocalPlans().filter(p => p.id !== planId);
    saveLocalPlans(local);

    // Delete Firestore
    try {
      await deleteDoc(doc(db, 'ceremonyPlans', planId));
    } catch (err) {
      console.warn('Firestore delete plan failed:', err);
    }
  },

  /**
   * Toggle a samagri item's check status and recalculate readiness
   */
  toggleSamagriItem: async (planId: string, itemId: string, checked: boolean): Promise<CeremonyPlan | null> => {
    const plan = await ceremonyPlanService.getPlanById(planId);
    if (!plan) return null;

    let updated = false;
    const requiredItems = plan.samagri.requiredItems.map(it => {
      if (it.id === itemId) {
        updated = true;
        return { ...it, checked };
      }
      return it;
    });

    const optionalItems = (plan.samagri.optionalItems || []).map(it => {
      if (it.id === itemId) {
        updated = true;
        return { ...it, checked };
      }
      return it;
    });

    if (!updated) return plan;

    plan.samagri = { requiredItems, optionalItems };
    const newReadiness = ceremonyPlanService.calculateReadiness(plan);
    const prevReadiness = plan.readinessPercentage;
    plan.readinessPercentage = newReadiness;

    const saved = await ceremonyPlanService.savePlan(plan);

    // Milestone notifications (e.g. 80% or 100% complete)
    if (prevReadiness < 80 && newReadiness >= 80) {
      try {
        await notificationService.createNotification({
          userId: plan.userId || 'cust-1',
          targetRole: 'customer',
          type: 'CEREMONY_REMINDER',
          category: 'CEREMONY',
          title: 'Samagri Checklist 80% Complete',
          message: `Great progress! Your samagri checklist for ${plan.title} is now 80% complete.`,
          link: `/ceremony-planner?planId=${plan.id}`,
          priority: 'normal',
          idempotencyKey: `notif-milestone-80-${plan.id}`
        });
      } catch (e) {
        // ignore
      }
    }

    return saved;
  },

  /**
   * Mark all samagri items complete or incomplete
   */
  markAllSamagri: async (planId: string, checked: boolean): Promise<CeremonyPlan | null> => {
    const plan = await ceremonyPlanService.getPlanById(planId);
    if (!plan) return null;

    plan.samagri.requiredItems = plan.samagri.requiredItems.map(it => ({ ...it, checked }));
    if (plan.samagri.optionalItems) {
      plan.samagri.optionalItems = plan.samagri.optionalItems.map(it => ({ ...it, checked }));
    }

    plan.readinessPercentage = ceremonyPlanService.calculateReadiness(plan);
    return await ceremonyPlanService.savePlan(plan);
  },

  /**
   * Add custom item to samagri checklist
   */
  addCustomSamagriItem: async (
    planId: string,
    name: string,
    quantity: string = '1 unit',
    category: any = 'Puja Essentials'
  ): Promise<CeremonyPlan | null> => {
    const plan = await ceremonyPlanService.getPlanById(planId);
    if (!plan) return null;

    const newItem: SamagriItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: name.trim(),
      quantity: quantity.trim(),
      category: category || 'Puja Essentials',
      checked: false,
      isCustom: true
    };

    plan.samagri.requiredItems.push(newItem);
    plan.readinessPercentage = ceremonyPlanService.calculateReadiness(plan);
    return await ceremonyPlanService.savePlan(plan);
  },

  /**
   * Remove item from samagri checklist
   */
  removeSamagriItem: async (planId: string, itemId: string): Promise<CeremonyPlan | null> => {
    const plan = await ceremonyPlanService.getPlanById(planId);
    if (!plan) return null;

    plan.samagri.requiredItems = plan.samagri.requiredItems.filter(it => it.id !== itemId);
    if (plan.samagri.optionalItems) {
      plan.samagri.optionalItems = plan.samagri.optionalItems.filter(it => it.id !== itemId);
    }

    plan.readinessPercentage = ceremonyPlanService.calculateReadiness(plan);
    return await ceremonyPlanService.savePlan(plan);
  },

  /**
   * Rename or update plan title
   */
  renamePlan: async (planId: string, newTitle: string): Promise<CeremonyPlan | null> => {
    const plan = await ceremonyPlanService.getPlanById(planId);
    if (!plan) return null;
    plan.title = newTitle.trim();
    return await ceremonyPlanService.savePlan(plan);
  },

  /**
   * Link an existing or new booking to this plan
   */
  linkBookingToPlan: async (planId: string, bookingId: string, priestId?: string): Promise<CeremonyPlan | null> => {
    const plan = await ceremonyPlanService.getPlanById(planId);
    if (!plan) return null;

    plan.bookingId = bookingId;
    if (priestId) plan.matchedPriestId = priestId;
    plan.status = 'priest_requested';
    plan.readinessPercentage = ceremonyPlanService.calculateReadiness(plan);
    return await ceremonyPlanService.savePlan(plan);
  }
};
