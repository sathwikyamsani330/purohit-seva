import React, { useState } from 'react';
import { Star, X, CheckCircle2 } from 'lucide-react';
import { reviewService } from '../services/reviewService';
import { useBooking } from '../context/BookingContext';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  priestId: string;
  priestName: string;
  eventName: string;
  customerId?: string;
  customerName?: string;
  onReviewSubmitted?: (rating: number, comment: string) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  priestId,
  priestName,
  eventName,
  customerId = '',
  customerName = 'Suresh Nair',
  onReviewSubmitted
}) => {
  const { rateBooking } = useBooking();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const ratingDescriptions: Record<number, string> = {
    1: 'Needs Improvement - Ritual was incomplete',
    2: 'Fair - Basic requirements met',
    3: 'Good - Satisfactory Vedic performance',
    4: 'Very Good - Punctual and devout chanting',
    5: 'Divine & Exceptional - Flawless Vedic ceremony & authentic samagri'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setIsSubmitting(true);
    try {
      await reviewService.submitReview({
        bookingId,
        priestId,
        priestName,
        customerId,
        customerName,
        eventName,
        rating,
        comment: comment.trim() || 'Wonderful ceremony conducted with utmost devotion.',
        location: 'Bengaluru'
      });

      await rateBooking(bookingId, rating, comment.trim());

      setIsSuccess(true);
      if (onReviewSubmitted) {
        onReviewSubmitted(rating, comment.trim());
      }
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1500);
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 backdrop-blur-sm p-4">
      <div
        id="review-modal"
        className="w-full max-w-md rounded-2xl bg-white border border-stone-200 shadow-2xl p-6 relative overflow-hidden"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 transition-colors p-1"
          aria-label="Close review dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="py-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-stone-900">Review Submitted!</h3>
            <p className="text-sm text-stone-600 mt-1">
              Thank you for sharing your divine feedback for {priestName}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/60 mb-2">
                Completed Ceremony
              </span>
              <h3 className="text-xl font-serif font-bold text-stone-900">Rate Your Experience</h3>
              <p className="text-sm text-stone-600 mt-0.5">
                {eventName} with <span className="font-semibold text-stone-800">{priestName}</span>
              </p>
            </div>

            {/* Star Rating Picker */}
            <div className="py-4 flex flex-col items-center bg-stone-50 rounded-xl border border-stone-200/70 mb-4">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    id={`star-btn-${star}`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-stone-300 hover:scale-110 transition-transform focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        (hoverRating || rating) >= star
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-stone-200 text-stone-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-medium text-stone-600 mt-2">
                {ratingDescriptions[hoverRating || rating]}
              </p>
            </div>

            {/* Review Comment Text */}
            <div className="mb-5">
              <label htmlFor="review-comment" className="block text-sm font-semibold text-stone-800 mb-1.5">
                How was your experience with the priest? <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <textarea
                id="review-comment"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience about Vedic chanting clarity, punctuality, and samagri..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#eadfd9] focus:ring-2 focus:ring-[#701a28] focus:border-[#701a28] text-sm text-stone-800 placeholder-stone-400"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="submit-review-btn"
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#701a28] hover:bg-[#59131e] text-white text-sm font-semibold shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
