import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface LocationReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: {
    id: string;
    name: string;
    google_place_id?: string;
  };
}

const LocationReviewModal = ({ isOpen, onClose, location }: LocationReviewModalProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState<number | undefined>();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to review' });
      return;
    }

    if (!rating && !comment.trim()) {
      toast({ title: 'Error', description: 'Please provide a rating or comment' });
      return;
    }

    setSubmitting(true);
    try {
      // Create an interaction for the location
      await supabase.from('interactions').insert({
        user_id: user.id,
        location_id: location.id,
        action_type: 'review',
        weight: 5.0
      });

      // If there's a comment, add it to place_comments
      if (comment.trim()) {
        const placeId = location.google_place_id || location.id;
        await supabase.from('place_comments').insert({
          user_id: user.id,
          place_id: placeId,
          content: comment.trim()
        });
      }

      toast({ 
        title: 'Success!', 
        description: rating 
          ? `You rated ${location.name} ${rating}/10${comment ? ' and left a comment' : ''}` 
          : 'Your comment was posted'
      });
      
      onClose();
      setRating(undefined);
      setComment('');
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({ title: 'Error', description: 'Failed to submit review' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Review {location.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Rating (optional)</label>
            <div className="flex gap-2">
              {[...Array(10)].map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(rating === i + 1 ? undefined : i + 1)}
                  className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                    rating && rating >= i + 1
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            {rating && (
              <p className="text-xs text-muted-foreground">You rated this {rating}/10</p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Comment (optional)</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              className="min-h-[100px]"
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || (!rating && !comment.trim())}
            className="w-full"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LocationReviewModal;
