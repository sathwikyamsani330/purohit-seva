import { Review } from '../types';
import { MOCK_REVIEWS } from '../data/mockData';
import { priestService } from './priestService';
import { notificationService } from './notificationService';

const REVIEWS_STORAGE_KEY = 'purohit_reviews';

export const reviewService = {
  getReviews: async (): Promise<Review[]> => {
    const saved = localStorage.getItem(REVIEWS_STORAGE_KEY);
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
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(MOCK_REVIEWS));
    return MOCK_REVIEWS;
  },

  getPriestReviews: async (priestId: string): Promise<Review[]> => {
    const reviews = await reviewService.getReviews();
    return reviews.filter(
      r => r.priestId === priestId || priestId === 'pr-101' || r.priestId.toLowerCase() === priestId.toLowerCase()
    );
  },

  submitReview: async (reviewData: {
    bookingId?: string;
    priestId: string;
    priestName?: string;
    customerId: string;
    customerName: string;
    customerAvatar?: string;
    eventName: string;
    rating: number;
    comment: string;
    location?: string;
  }): Promise<Review> => {
    const reviews = await reviewService.getReviews();
    const now = new Date().toISOString().split('T')[0];

    const newReview: Review = {
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      priestId: reviewData.priestId,
      priestName: reviewData.priestName || 'Vedic Priest',
      customerId: reviewData.customerId,
      customerName: reviewData.customerName,
      customerAvatar: reviewData.customerAvatar,
      bookingId: reviewData.bookingId,
      eventName: reviewData.eventName,
      rating: Math.max(1, Math.min(5, reviewData.rating)),
      comment: reviewData.comment.trim(),
      date: now,
      location: reviewData.location || 'India'
    };

    const updated = [newReview, ...reviews];
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(updated));

    // Update priest rating and review count in priest store
    try {
      const priestReviews = updated.filter(r => r.priestId === reviewData.priestId);
      const totalStars = priestReviews.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = Number((totalStars / priestReviews.length).toFixed(1));
      
      await priestService.updatePriest(reviewData.priestId, {
        rating: averageRating,
        reviewCount: priestReviews.length
      });
    } catch {
      // ignore
    }

    // Notify priest that a devotee submitted a review
    try {
      await notificationService.createNotification({
        userId: reviewData.priestId,
        targetRole: 'priest',
        title: `⭐ ${reviewData.rating}-Star Review Received`,
        message: `${reviewData.customerName} submitted a ${reviewData.rating}-star review for ${reviewData.eventName}: "${reviewData.comment.slice(0, 75)}..."`,
        type: 'PRIEST_REVIEW_RECEIVED',
        category: 'REVIEW',
        priority: 'normal',
        link: '/priest/profile',
        metadata: {
          rating: reviewData.rating,
          bookingId: reviewData.bookingId
        }
      });
    } catch {
      // ignore
    }

    return newReview;
  }
};
