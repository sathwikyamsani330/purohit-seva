import {
  UserRewardsProfile,
  RewardTransaction,
  CustomerReward,
  RewardTier,
  RewardsConfig,
  LoyaltyLevel,
  LoyaltyLevelInfo,
  Booking
} from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { notificationService } from './notificationService';

const REWARDS_PROFILES_KEY = 'purohit_rewards_profiles';
const REWARD_TRANSACTIONS_KEY = 'purohit_reward_transactions';
const CUSTOMER_REWARDS_KEY = 'purohit_customer_rewards';
const REWARDS_CONFIG_KEY = 'purohit_rewards_config';

export const INITIAL_REWARD_TIERS: RewardTier[] = [
  {
    id: 'tier-1',
    pointsRequired: 1000,
    discountAmount: 500,
    title: '₹500 OFF Sacred Ceremony',
    description: 'Save ₹500 on your next puja or homam booking.',
    validityDays: 90,
    minBookingAmount: 2000,
    isActive: true,
    iconName: 'Flame'
  },
  {
    id: 'tier-2',
    pointsRequired: 2500,
    discountAmount: 1500,
    title: '₹1,500 OFF Sacred Ceremony',
    description: 'Save ₹1,500 on auspicious occasions and homams.',
    validityDays: 90,
    minBookingAmount: 4000,
    isActive: true,
    iconName: 'Sparkles'
  },
  {
    id: 'tier-3',
    pointsRequired: 5000,
    discountAmount: 3500,
    title: '₹3,500 OFF Sacred Ceremony',
    description: 'Save ₹3,500 on major family ceremonies or Grihapravesham.',
    validityDays: 90,
    minBookingAmount: 7000,
    isActive: true,
    iconName: 'Award'
  },
  {
    id: 'tier-4',
    pointsRequired: 10000,
    discountAmount: 8000,
    title: '₹8,000 OFF Grand Vedic Homa',
    description: 'Exclusive grand discount on Maha Yagnas and major ceremonies.',
    validityDays: 120,
    minBookingAmount: 12000,
    isActive: true,
    iconName: 'Crown'
  }
];

export const INITIAL_REWARDS_CONFIG: RewardsConfig = {
  earningRateRupeesPerPoint: 10, // ₹10 spent = 1 Purohit Point
  referralPointsReferrer: 250, // 250 points for referrer
  referralDiscountReferee: 250, // ₹250 OFF for friend
  rewardExpiryDays: 90,
  tiers: INITIAL_REWARD_TIERS
};

export const LOYALTY_LEVELS: Record<LoyaltyLevel, LoyaltyLevelInfo> = {
  DEVOTEE: {
    level: 'DEVOTEE',
    name: 'Devotee',
    minPoints: 0,
    maxPoints: 999,
    icon: '🌱',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200 ring-emerald-500/20',
    tagline: 'Starting your auspicious journey with Purohit Seva',
    benefits: [
      'Earn 1 Purohit Point per ₹10 spent on completed ceremonies',
      'Verified Vedic Acharyas with transparent Dakshina',
      'Digital receipts, Sankalpam logs & ceremony booking history',
      'Auspicious Muhurtham notifications & festival calendars'
    ]
  },
  SEVA_MEMBER: {
    level: 'SEVA_MEMBER',
    name: 'Seva Member',
    minPoints: 1000,
    maxPoints: 2499,
    icon: '🪔',
    badgeColor: 'bg-amber-50 text-amber-900 border-amber-300 ring-amber-500/20',
    tagline: 'Devoted household with unlocked rewards & discounts',
    benefits: [
      'All Devotee tier benefits',
      'Redeem Purohit Points for up to ₹1,500 OFF ceremonies',
      'Dedicated customer care hotline & Muhurtham guidance',
      'Priority reschedule flexibility for auspicious slots'
    ]
  },
  SEVA_PLUS: {
    level: 'SEVA_PLUS',
    name: 'Seva Plus',
    minPoints: 2500,
    maxPoints: 4999,
    icon: '✨',
    badgeColor: 'bg-[#fdf2f4] text-[#701a28] border-[#f5ccd2] ring-[#701a28]/20',
    tagline: 'Esteemed family patron with VIP priest matching',
    benefits: [
      'All Seva Member tier benefits',
      'Priority Priest matching during peak festival muhurtham rush',
      '₹500 bonus reward voucher after 3 completed ceremonies',
      'Complimentary Gotra, Nakshatra & Sankalpam verification',
      'Redeem higher tier rewards up to ₹3,500 OFF'
    ]
  },
  PUROHIT_SEVA_ELITE: {
    level: 'PUROHIT_SEVA_ELITE',
    name: 'Purohit Seva Elite',
    minPoints: 5000,
    maxPoints: Infinity,
    icon: '👑',
    badgeColor: 'bg-purple-50 text-purple-900 border-purple-300 ring-purple-500/20',
    tagline: 'Premier patron with executive Acharya & festival access',
    benefits: [
      'All Seva Plus tier benefits',
      'Direct access to Senior Acharyas (20+ yrs experience)',
      'Free complete samagri checklist customization by Head Priest',
      '24/7 dedicated family liaison for multi-day ceremonies',
      'Highest redemption tier up to ₹8,000 OFF grand homas'
    ]
  }
};

export const MILESTONE_BENEFITS = {
  threeBookings: {
    title: '3 Completed Ceremonies Unlocked',
    icon: '🎯',
    items: [
      'Priority Priest Matching for peak muhurthams',
      '₹500 Bonus Reward credited to wallet',
      'Free Vedic Priest Phone Consultation',
      'Priority Customer Support'
    ]
  },
  fiveBookings: {
    title: '5 Completed Ceremonies Unlocked',
    icon: '⭐',
    items: [
      'Priority Guaranteed Booking on Auspicious Dates',
      'Exclusive Special Festival Discounts',
      'VIP Priest Allocation across South & North traditions',
      'Complimentary Annual Pitru/Shraddha Date reminder service'
    ]
  }
};

export const calculateLoyaltyLevel = (lifetimePoints: number): LoyaltyLevel => {
  if (lifetimePoints >= 5000) return 'PUROHIT_SEVA_ELITE';
  if (lifetimePoints >= 2500) return 'SEVA_PLUS';
  if (lifetimePoints >= 1000) return 'SEVA_MEMBER';
  return 'DEVOTEE';
};

const generateRewardCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomCode = '';
  for (let i = 0; i < 6; i++) {
    randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PSR-${randomCode}`;
};

export const rewardService = {
  // 1. Get rewards config (rate, tiers, expiry)
  getRewardsConfig: async (): Promise<RewardsConfig> => {
    try {
      const cfgDoc = await getDoc(doc(db, 'system', 'rewardsConfig'));
      if (cfgDoc.exists()) {
        const data = cfgDoc.data() as RewardsConfig;
        localStorage.setItem(REWARDS_CONFIG_KEY, JSON.stringify(data));
        return data;
      }
    } catch {
      // ignore
    }

    const saved = localStorage.getItem(REWARDS_CONFIG_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }

    localStorage.setItem(REWARDS_CONFIG_KEY, JSON.stringify(INITIAL_REWARDS_CONFIG));
    return INITIAL_REWARDS_CONFIG;
  },

  // 2. Get customer rewards profile
  getRewardsProfile: async (userId: string = ''): Promise<UserRewardsProfile> => {
    const cleanUserId = userId || '';

    // Try Firestore
    if (auth.currentUser && auth.currentUser.uid === cleanUserId) {
      try {
        const userDoc = await getDoc(doc(db, 'users', cleanUserId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.rewards) {
            const profile: UserRewardsProfile = {
              userId: cleanUserId,
              pointsBalance: data.rewards.pointsBalance ?? 0,
              lifetimePoints: data.rewards.lifetimePoints ?? 0,
              completedBookings: data.rewards.completedBookings ?? 0,
              loyaltyLevel: data.rewards.loyaltyLevel || calculateLoyaltyLevel(data.rewards.lifetimePoints || 0),
              referralCode: data.rewards.referralCode || `PS-${cleanUserId.slice(0, 4).toUpperCase()}`,
              referredBy: data.rewards.referredBy,
              totalReferrals: data.rewards.totalReferrals ?? 0,
              updatedAt: data.rewards.updatedAt || new Date().toISOString()
            };
            return profile;
          }
        }
      } catch (err) {
        console.warn('Firestore getRewardsProfile fallback:', err);
      }
    }

    // LocalStorage fallback
    const saved = localStorage.getItem(REWARDS_PROFILES_KEY);
    let profiles: Record<string, UserRewardsProfile> = {};
    if (saved) {
      try {
        profiles = JSON.parse(saved);
      } catch {
        profiles = {};
      }
    }

    if (profiles[cleanUserId]) {
      return profiles[cleanUserId];
    }

    // Default initial profile
    const defaultProfile: UserRewardsProfile = {
      userId: cleanUserId,
      pointsBalance: 0,
      lifetimePoints: 0,
      completedBookings: 0,
      loyaltyLevel: 'DEVOTEE',
      referralCode: `PS-${cleanUserId.slice(0, 5).toUpperCase()}`,
      totalReferrals: 0,
      updatedAt: new Date().toISOString()
    };

    profiles[cleanUserId] = defaultProfile;
    localStorage.setItem(REWARDS_PROFILES_KEY, JSON.stringify(profiles));
    return defaultProfile;
  },

  // 3. Save or update customer rewards profile
  saveRewardsProfile: async (profile: UserRewardsProfile): Promise<UserRewardsProfile> => {
    const updatedProfile: UserRewardsProfile = {
      ...profile,
      loyaltyLevel: calculateLoyaltyLevel(profile.lifetimePoints),
      updatedAt: new Date().toISOString()
    };

    if (auth.currentUser && auth.currentUser.uid === profile.userId) {
      try {
        const userRef = doc(db, 'users', profile.userId);
        await updateDoc(userRef, {
          rewards: {
            pointsBalance: updatedProfile.pointsBalance,
            lifetimePoints: updatedProfile.lifetimePoints,
            completedBookings: updatedProfile.completedBookings,
            loyaltyLevel: updatedProfile.loyaltyLevel,
            referralCode: updatedProfile.referralCode,
            totalReferrals: updatedProfile.totalReferrals || 0,
            updatedAt: updatedProfile.updatedAt
          }
        });
      } catch (err) {
        console.warn('Firestore saveRewardsProfile fallback:', err);
      }
    }

    const saved = localStorage.getItem(REWARDS_PROFILES_KEY);
    let profiles: Record<string, UserRewardsProfile> = {};
    if (saved) {
      try {
        profiles = JSON.parse(saved);
      } catch {
        profiles = {};
      }
    }

    profiles[profile.userId] = updatedProfile;
    localStorage.setItem(REWARDS_PROFILES_KEY, JSON.stringify(profiles));

    // Dispatch event
    try {
      window.dispatchEvent(new CustomEvent('purohit_rewards_updated', { detail: updatedProfile }));
    } catch {
      // ignore
    }

    return updatedProfile;
  },

  // 4. Get customer points transaction history
  getRewardTransactions: async (userId: string = ''): Promise<RewardTransaction[]> => {
    const cleanUserId = userId || '';

    // Firestore attempt
    if (auth.currentUser) {
      try {
        const txCol = collection(db, 'users', cleanUserId, 'rewardTransactions');
        const snap = await getDocs(txCol);
        if (!snap.empty) {
          const list: RewardTransaction[] = [];
          snap.forEach((docSnap) => {
            list.push({ ...docSnap.data(), id: docSnap.id } as RewardTransaction);
          });
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          return list;
        }
      } catch {
        // fallback
      }
    }

    const saved = localStorage.getItem(REWARD_TRANSACTIONS_KEY);
    let allTx: RewardTransaction[] = [];
    if (saved) {
      try {
        allTx = JSON.parse(saved);
      } catch {
        allTx = [];
      }
    }

    

    if (!cleanUserId || cleanUserId === 'all' || cleanUserId === 'admin') {
      return allTx.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return allTx
      .filter((t) => t.userId === cleanUserId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  // 5. Get customer redeemed reward vouchers (My Rewards)
  getCustomerRewards: async (userId: string = ''): Promise<CustomerReward[]> => {
    const cleanUserId = userId || '';

    // Check expiry dynamically
    const nowIso = new Date().toISOString();

    if (auth.currentUser) {
      try {
        const rewCol = collection(db, 'users', cleanUserId, 'rewards');
        const snap = await getDocs(rewCol);
        if (!snap.empty) {
          const list: CustomerReward[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data() as CustomerReward;
            // Check expiry
            let status = data.status;
            if (status === 'AVAILABLE' && new Date(data.expiresAt).getTime() < Date.now()) {
              status = 'EXPIRED';
            }
            list.push({ ...data, id: docSnap.id, status });
          });
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          return list;
        }
      } catch {
        // fallback
      }
    }

    const saved = localStorage.getItem(CUSTOMER_REWARDS_KEY);
    let allRewards: CustomerReward[] = [];
    if (saved) {
      try {
        allRewards = JSON.parse(saved);
      } catch {
        allRewards = [];
      }
    }

    

    const userRewards = (cleanUserId === 'all' || cleanUserId === 'admin')
      ? allRewards
      : allRewards.filter((r) => r.userId === cleanUserId);

    // Update statuses for expired items
    const updated = userRewards.map((r) => {
      if (r.status === 'AVAILABLE' && new Date(r.expiresAt).getTime() < Date.now()) {
        return { ...r, status: 'EXPIRED' as const };
      }
      return r;
    });

    return updated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  // 6. Redeem Reward Tier (Points -> Voucher Coupon)
  redeemReward: async (userId: string = '', tierId: string): Promise<CustomerReward> => {
    const config = await rewardService.getRewardsConfig();
    const tier = config.tiers.find((t) => t.id === tierId && t.isActive);
    if (!tier) {
      throw new Error('Reward tier is not active or could not be found.');
    }

    const profile = await rewardService.getRewardsProfile(userId);
    if (profile.pointsBalance < tier.pointsRequired) {
      throw new Error(
        `Insufficient points. You have ${profile.pointsBalance} points, but ${tier.pointsRequired} points are required.`
      );
    }

    const now = new Date();
    const expiryDate = new Date(now.getTime() + (tier.validityDays || 90) * 86400000);
    const uniqueRewardId = `PSR-VOUCHER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const rewardCode = generateRewardCode();

    const newReward: CustomerReward = {
      id: uniqueRewardId,
      userId,
      rewardType: 'DISCOUNT',
      tierId: tier.id,
      title: tier.title,
      pointsCost: tier.pointsRequired,
      discountAmount: tier.discountAmount,
      minBookingAmount: tier.minBookingAmount,
      status: 'AVAILABLE',
      rewardCode,
      createdAt: now.toISOString(),
      expiresAt: expiryDate.toISOString(),
      usedAt: null,
      bookingId: null
    };

    // Deduct points from profile
    const updatedProfile: UserRewardsProfile = {
      ...profile,
      pointsBalance: profile.pointsBalance - tier.pointsRequired,
      updatedAt: now.toISOString()
    };
    await rewardService.saveRewardsProfile(updatedProfile);

    // Create negative REDEEM transaction
    const txId = `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newTx: RewardTransaction = {
      id: txId,
      userId,
      type: 'REDEEM',
      points: -tier.pointsRequired,
      rewardId: uniqueRewardId,
      description: `Redeemed ${tier.title} voucher (${rewardCode})`,
      createdAt: now.toISOString()
    };

    // Save transaction
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', userId, 'rewards', uniqueRewardId), newReward);
        await setDoc(doc(db, 'users', userId, 'rewardTransactions', txId), newTx);
      } catch (err) {
        console.warn('Firestore redeemReward error:', err);
      }
    }

    // Save to local storage
    const existingRewards = await rewardService.getCustomerRewards('all');
    localStorage.setItem(CUSTOMER_REWARDS_KEY, JSON.stringify([newReward, ...existingRewards]));

    const existingTx = await rewardService.getRewardTransactions('all');
    localStorage.setItem(REWARD_TRANSACTIONS_KEY, JSON.stringify([newTx, ...existingTx]));

    // Send in-app notification
    await notificationService.createNotification({
      userId,
      title: `🎉 Reward Voucher Unlocked!`,
      message: `You successfully redeemed ${tier.pointsRequired} points for ₹${tier.discountAmount} OFF! Use code ${rewardCode} on your next booking.`,
      type: 'REWARD_UNLOCKED'
    });

    try {
      window.dispatchEvent(new CustomEvent('purohit_reward_redeemed', { detail: newReward }));
    } catch {
      // ignore
    }

    return newReward;
  },

  // 7. Award Points For Completed Booking
  awardPointsForCompletedBooking: async (
    bookingId: string
  ): Promise<{ pointsEarned: number; newBalance: number } | null> => {
    const config = await rewardService.getRewardsConfig();

    // 1. Fetch the booking from localStorage or Firestore
    const bookingsStr = localStorage.getItem('purohit_bookings') || '[]';
    let allBookings: Booking[] = [];
    try {
      allBookings = JSON.parse(bookingsStr);
    } catch {
      allBookings = [];
    }

    const cleanId = bookingId.trim().toLowerCase();
    const index = allBookings.findIndex(
      (b) => b.id.toLowerCase() === cleanId || b.bookingId?.toLowerCase() === cleanId
    );

    let booking: Booking | null = index !== -1 ? allBookings[index] : null;

    if (!booking && auth.currentUser) {
      try {
        const bDoc = await getDoc(doc(db, 'bookings', bookingId));
        if (bDoc.exists()) {
          booking = { ...bDoc.data(), id: bDoc.id } as Booking;
        }
      } catch {
        // ignore
      }
    }

    if (!booking) {
      console.warn(`Award points skipped: Booking ${bookingId} not found.`);
      return null;
    }

    // ANTI-ABUSE: Check if points have already been awarded
    if (booking.pointsAwarded) {
      console.warn(`Award points skipped: Points already awarded for booking ${booking.id}.`);
      return null;
    }

    // Check transaction history for duplicate reference
    const allTx = await rewardService.getRewardTransactions('all');
    const existingAwardTx = allTx.find(
      (t) => t.type === 'EARN' && t.bookingId && (t.bookingId === booking?.id || t.bookingId === booking?.bookingId)
    );
    if (existingAwardTx) {
      console.warn(`Award points skipped: Transaction already exists for booking ${booking.id}.`);
      return null;
    }

    // Calculate Points (₹10 spent = 1 Point)
    // Use total paid amount or service charge
    const spentAmount = booking.totalAmount || booking.servicePrice || 0;
    const pointsEarned = Math.max(1, Math.floor(spentAmount / config.earningRateRupeesPerPoint));

    const userId = booking.customerId || '';
    const profile = await rewardService.getRewardsProfile(userId);

    const oldLevel = profile.loyaltyLevel;
    const newLifetime = profile.lifetimePoints + pointsEarned;
    const newBalance = profile.pointsBalance + pointsEarned;
    const newCompletedCount = profile.completedBookings + 1;
    const newLevel = calculateLoyaltyLevel(newLifetime);

    const updatedProfile: UserRewardsProfile = {
      ...profile,
      pointsBalance: newBalance,
      lifetimePoints: newLifetime,
      completedBookings: newCompletedCount,
      loyaltyLevel: newLevel,
      updatedAt: new Date().toISOString()
    };

    await rewardService.saveRewardsProfile(updatedProfile);

    // Create EARN transaction
    const now = new Date().toISOString();
    const txId = `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newTx: RewardTransaction = {
      id: txId,
      userId,
      type: 'EARN',
      points: pointsEarned,
      bookingId: booking.id,
      description: `Completed ${booking.eventName || 'sacred ceremony'} booking`,
      createdAt: now
    };

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', userId, 'rewardTransactions', txId), newTx);
      } catch {
        // ignore
      }
    }

    const updatedTxList = [newTx, ...allTx];
    localStorage.setItem(REWARD_TRANSACTIONS_KEY, JSON.stringify(updatedTxList));

    // Update booking object with pointsAwarded = true
    booking.pointsAwarded = true;
    booking.pointsEarned = pointsEarned;
    if (index !== -1) {
      allBookings[index] = booking;
      localStorage.setItem('purohit_bookings', JSON.stringify(allBookings));
    }

    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, 'bookings', booking.id), {
          pointsAwarded: true,
          pointsEarned
        });
      } catch {
        // ignore
      }
    }

    // 1. Send points earned notification
    await notificationService.createNotification({
      userId,
      title: `🪔 Ceremony Completed! +${pointsEarned} Purohit Points`,
      message: `🙏 Thank you for choosing Purohit Seva for ${booking.eventName}. You earned +${pointsEarned} Purohit Points! Balance: ${newBalance} pts.`,
      type: 'POINTS_EARNED',
      bookingId: booking.id
    });

    // 2. Check for level upgrade
    if (newLevel !== oldLevel) {
      const levelInfo = LOYALTY_LEVELS[newLevel];
      await notificationService.createNotification({
        userId,
        title: `✨ Level Upgraded: ${levelInfo.name}!`,
        message: `Congratulations! Your devotion has elevated your status to ${levelInfo.name} (${levelInfo.icon}). Enjoy priority benefits and enhanced discounts.`,
        type: 'LEVEL_UPGRADE'
      });
    }

    // 3. Check for 3-ceremony milestone bonus
    if (newCompletedCount === 3) {
      await notificationService.createNotification({
        userId,
        title: `🎯 3 Ceremonies Completed Milestone!`,
        message: `You have unlocked Priority Priest Matching, free phone consultations, and exclusive customer priority.`,
        type: 'REWARD_UNLOCKED'
      });
    }

    return { pointsEarned, newBalance };
  },

  // 8. Validate and apply reward coupon to a booking
  validateAndApplyReward: async (
    userId: string,
    rewardCodeOrId: string,
    bookingAmount: number
  ): Promise<{
    isValid: boolean;
    discountAmount: number;
    reward: CustomerReward | null;
    error?: string;
  }> => {
    if (!rewardCodeOrId || !rewardCodeOrId.trim()) {
      return { isValid: false, discountAmount: 0, reward: null, error: 'Please enter a valid reward code.' };
    }

    const clean = rewardCodeOrId.trim().toUpperCase();
    const userRewards = await rewardService.getCustomerRewards(userId);

    const reward = userRewards.find(
      (r) => r.rewardCode.toUpperCase() === clean || r.id === rewardCodeOrId
    );

    if (!reward) {
      return {
        isValid: false,
        discountAmount: 0,
        reward: null,
        error: 'Reward voucher not found or does not belong to your account.'
      };
    }

    if (reward.status === 'USED') {
      return {
        isValid: false,
        discountAmount: 0,
        reward: null,
        error: 'This reward voucher has already been used on a previous booking.'
      };
    }

    if (reward.status === 'EXPIRED' || new Date(reward.expiresAt).getTime() < Date.now()) {
      return {
        isValid: false,
        discountAmount: 0,
        reward: null,
        error: 'This reward voucher has expired and can no longer be applied.'
      };
    }

    if (reward.status !== 'AVAILABLE' && reward.status !== 'APPLIED') {
      return {
        isValid: false,
        discountAmount: 0,
        reward: null,
        error: `Reward voucher cannot be used (Status: ${reward.status}).`
      };
    }

    if (reward.minBookingAmount && bookingAmount < reward.minBookingAmount) {
      return {
        isValid: false,
        discountAmount: 0,
        reward: null,
        error: `Minimum ceremony amount of ₹${reward.minBookingAmount} required to use this reward.`
      };
    }

    // Cap discount to bookingAmount - 1
    const actualDiscount = Math.min(reward.discountAmount, Math.max(0, bookingAmount - 100));

    return {
      isValid: true,
      discountAmount: actualDiscount,
      reward
    };
  },

  // 9. Mark Reward as USED on payment completion
  markRewardAsUsed: async (rewardId: string, bookingId: string): Promise<void> => {
    const allRewards = await rewardService.getCustomerRewards('all');
    const index = allRewards.findIndex((r) => r.id === rewardId || r.rewardCode === rewardId);
    if (index === -1) return;

    const now = new Date().toISOString();
    const updated: CustomerReward = {
      ...allRewards[index],
      status: 'USED',
      usedAt: now,
      bookingId
    };

    allRewards[index] = updated;
    localStorage.setItem(CUSTOMER_REWARDS_KEY, JSON.stringify(allRewards));

    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, 'users', updated.userId, 'rewards', updated.id), {
          status: 'USED',
          usedAt: now,
          bookingId
        });
      } catch {
        // ignore
      }
    }
  },

  // 10. Admin: Adjust Points with Mandatory Reason
  adminAdjustPoints: async (
    userId: string,
    pointsDelta: number,
    reason: string,
    adminId: string = 'admin'
  ): Promise<RewardTransaction> => {
    if (!reason || !reason.trim()) {
      throw new Error('A mandatory justification reason is required for administrative points adjustment.');
    }
    if (pointsDelta === 0) {
      throw new Error('Points adjustment delta cannot be zero.');
    }

    const profile = await rewardService.getRewardsProfile(userId);
    const newBalance = Math.max(0, profile.pointsBalance + pointsDelta);
    const newLifetime = pointsDelta > 0 ? profile.lifetimePoints + pointsDelta : profile.lifetimePoints;

    const updatedProfile: UserRewardsProfile = {
      ...profile,
      pointsBalance: newBalance,
      lifetimePoints: newLifetime,
      loyaltyLevel: calculateLoyaltyLevel(newLifetime),
      updatedAt: new Date().toISOString()
    };

    await rewardService.saveRewardsProfile(updatedProfile);

    const now = new Date().toISOString();
    const txId = `tx-adj-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const tx: RewardTransaction = {
      id: txId,
      userId,
      type: 'ADJUSTMENT',
      points: pointsDelta,
      description: `Admin manual adjustment: ${reason}`,
      adminId,
      reason,
      createdAt: now
    };

    const allTx = await rewardService.getRewardTransactions('all');
    localStorage.setItem(REWARD_TRANSACTIONS_KEY, JSON.stringify([tx, ...allTx]));

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', userId, 'rewardTransactions', txId), tx);
      } catch {
        // ignore
      }
    }

    await notificationService.createNotification({
      userId,
      title: pointsDelta > 0 ? `🪔 Points Credited` : `Points Adjusted`,
      message: `Your Purohit Points have been adjusted (${pointsDelta > 0 ? '+' : ''}${pointsDelta} pts). Reason: ${reason}.`,
      type: 'POINTS_EARNED'
    });

    return tx;
  },

  // 11. Admin: Update Rewards Config
  adminUpdateRewardsConfig: async (partialConfig: Partial<RewardsConfig>): Promise<RewardsConfig> => {
    const current = await rewardService.getRewardsConfig();
    const updated: RewardsConfig = {
      ...current,
      ...partialConfig
    };

    localStorage.setItem(REWARDS_CONFIG_KEY, JSON.stringify(updated));

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'system', 'rewardsConfig'), updated);
      } catch {
        // ignore
      }
    }

    return updated;
  },

  // 12. Referral code verification
  applyReferralCode: async (
    newUserId: string,
    referralCode: string
  ): Promise<{ success: boolean; message: string; discountAmount?: number }> => {
    if (!referralCode || !referralCode.trim()) {
      return { success: false, message: 'Invalid referral code.' };
    }

    const cleanCode = referralCode.trim().toUpperCase();
    const savedProfiles = localStorage.getItem(REWARDS_PROFILES_KEY);
    let profiles: Record<string, UserRewardsProfile> = {};
    if (savedProfiles) {
      try {
        profiles = JSON.parse(savedProfiles);
      } catch {
        profiles = {};
      }
    }

    // Find referrer
    const referrerProfile = Object.values(profiles).find(
      (p) => p.referralCode?.toUpperCase() === cleanCode
    );

    if (!referrerProfile) {
      return { success: false, message: 'Referral code not recognized.' };
    }

    if (referrerProfile.userId === newUserId) {
      return { success: false, message: 'Self-referrals are not permitted.' };
    }

    const targetProfile = await rewardService.getRewardsProfile(newUserId);
    if (targetProfile.referredBy) {
      return { success: false, message: 'A referral has already been linked to this account.' };
    }

    targetProfile.referredBy = referrerProfile.userId;
    await rewardService.saveRewardsProfile(targetProfile);

    // Update referrer total referrals count
    referrerProfile.totalReferrals = (referrerProfile.totalReferrals || 0) + 1;
    await rewardService.saveRewardsProfile(referrerProfile);

    return {
      success: true,
      message: `Referral code applied! You get ₹250 OFF on your first booking, and ${referrerProfile.referralCode} will receive 250 Purohit Points upon ceremony completion.`,
      discountAmount: 250
    };
  },

  // 13. Admin: Grant Custom Promotional Reward Voucher
  adminGrantReward: async (
    userId: string,
    discountAmount: number,
    title: string,
    validityDays: number = 60,
    minBookingAmount?: number
  ): Promise<CustomerReward> => {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + validityDays * 86400000);
    const uniqueRewardId = `PSR-ADMIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const rewardCode = generateRewardCode();

    const newReward: CustomerReward = {
      id: uniqueRewardId,
      userId,
      rewardType: 'DISCOUNT',
      tierId: 'admin-promo',
      title,
      pointsCost: 0,
      discountAmount,
      minBookingAmount: minBookingAmount || discountAmount * 2,
      status: 'AVAILABLE',
      rewardCode,
      createdAt: now.toISOString(),
      expiresAt: expiryDate.toISOString(),
      usedAt: null,
      bookingId: null
    };

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', userId, 'rewards', uniqueRewardId), newReward);
      } catch (err) {
        console.warn('Firestore adminGrantReward error:', err);
      }
    }

    const existingRewards = await rewardService.getCustomerRewards('all');
    localStorage.setItem(CUSTOMER_REWARDS_KEY, JSON.stringify([newReward, ...existingRewards]));

    await notificationService.createNotification({
      userId,
      title: `🎁 Special Gift from Purohit Seva!`,
      message: `You have received a ${title} worth ₹${discountAmount} OFF! Use code ${rewardCode} at checkout.`,
      type: 'REWARD_UNLOCKED'
    });

    return newReward;
  },

  // Compatibility aliases
  getUserRewardsProfile: async (userId?: string): Promise<UserRewardsProfile> => {
    return rewardService.getRewardsProfile(userId);
  },

  getTransactions: async (userId?: string): Promise<RewardTransaction[]> => {
    return rewardService.getRewardTransactions(userId);
  },

  getTiers: async (): Promise<RewardTier[]> => {
    const config = await rewardService.getRewardsConfig();
    return config.tiers;
  },

  redeemPointsForReward: async (
    userId: string,
    pointsCost: number,
    discountAmount: number,
    title: string
  ): Promise<CustomerReward> => {
    const config = await rewardService.getRewardsConfig();
    let matchingTier = config.tiers.find((t) => t.pointsRequired === pointsCost);
    if (matchingTier) {
      return rewardService.redeemReward(userId, matchingTier.id);
    }
    // Fallback: create temporary tier or use nearest
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 90 * 86400000);
    const profile = await rewardService.getRewardsProfile(userId);
    if (profile.pointsBalance < pointsCost) {
      throw new Error(`Insufficient points balance (${profile.pointsBalance} < ${pointsCost}).`);
    }

    const uniqueRewardId = `PSR-VOUCHER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const rewardCode = generateRewardCode();
    const newReward: CustomerReward = {
      id: uniqueRewardId,
      userId,
      rewardType: 'DISCOUNT',
      tierId: 'custom-tier',
      title,
      pointsCost,
      discountAmount,
      minBookingAmount: discountAmount * 2,
      status: 'AVAILABLE',
      rewardCode,
      createdAt: now.toISOString(),
      expiresAt: expiryDate.toISOString(),
      usedAt: null,
      bookingId: null
    };

    const updatedProfile: UserRewardsProfile = {
      ...profile,
      pointsBalance: profile.pointsBalance - pointsCost,
      updatedAt: now.toISOString()
    };
    await rewardService.saveRewardsProfile(updatedProfile);

    const txId = `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newTx: RewardTransaction = {
      id: txId,
      userId,
      type: 'REDEEM',
      points: -pointsCost,
      rewardId: uniqueRewardId,
      description: `Redeemed ${title} (${rewardCode})`,
      createdAt: now.toISOString()
    };

    const existingRewards = await rewardService.getCustomerRewards('all');
    localStorage.setItem(CUSTOMER_REWARDS_KEY, JSON.stringify([newReward, ...existingRewards]));
    const existingTx = await rewardService.getRewardTransactions('all');
    localStorage.setItem(REWARD_TRANSACTIONS_KEY, JSON.stringify([newTx, ...existingTx]));

    return newReward;
  }
};
