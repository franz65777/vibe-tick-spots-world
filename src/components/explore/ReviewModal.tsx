import React, { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { createPostReview, updatePostReview, hasUserReviewedPost, type PostReview } from '@/services/reviewService';
import { toast } from 'sonner';

interface ReviewModalProps {
  postId: string;
  locationId: string | null;
  locationName?: string;
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted?: () => void;
}

export const ReviewModal = ({
  postId,
  locationId,
  locationName,
  isOpen,
  onClose,
  onReviewSubmitted,
}: ReviewModalProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState<PostReview | null>(null);

  useEffect(() => {
    if (isOpen && user?.id) {
      checkExistingReview();
    }
  }, [isOpen, postId, user?.id]);

  const checkExistingReview = async () => {
    if (!user?.id) return;
    
    const review = await hasUserReviewedPost(postId, user.id);
    if (review) {
      setExistingReview(review);
      setRating(review.rating);
      setComment(review.comment);
    } else {
      setExistingReview(null);
      setRating(0);
      setComment('');
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('Please sign in to leave a review');
      return;
    }

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (comment.trim().length === 0) {
      toast.error('Please write a comment');
      return;
    }

    setSubmitting(true);

    try {
      if (existingReview) {
        // Update existing review
        const success = await updatePostReview(existingReview.id, comment.trim(), rating);
        if (success) {
          toast.success('Review updated successfully!');
          onReviewSubmitted?.();
          onClose();
        } else {
          toast.error('Failed to update review');
        }
      } else {
        // Create new review
        const review = await createPostReview(postId, user.id, locationId, comment.trim(), rating);
        if (review) {
          toast.success('Review submitted successfully!');
          onReviewSubmitted?.();
          onClose();
        } else {
          toast.error('Failed to submit review');
        }
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {existingReview ? 'Edit Review' : 'Write a Review'}
            </h2>
            {locationName && (
              <p className="text-sm text-gray-500 mt-0.5">{locationName}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Rating Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Rate your experience (1-10)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setRating(num)}
                  onMouseEnter={() => setHoverRating(num)}
                  onMouseLeave={() => setHoverRating(0)}
                  className={`flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-all font-semibold text-sm ${
                    (hoverRating >= num || rating >= num)
                      ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                      : 'border-gray-200 bg-white text-gray-400 hover:border-yellow-300'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            {rating > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex">
                  {[...Array(Math.ceil(rating / 2))].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {rating}/10 - {rating >= 8 ? 'Excellent' : rating >= 6 ? 'Good' : rating >= 4 ? 'Average' : 'Poor'}
                </span>
              </div>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Your review
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience at this location..."
              className="min-h-[120px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1 text-right">
              {comment.length}/500
            </p>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || rating === 0 || comment.trim().length === 0}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-xl"
          >
            {submitting ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
          </Button>
        </div>
      </div>
    </div>
  );
};
