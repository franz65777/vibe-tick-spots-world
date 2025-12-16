import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

const reviewSchema = z.object({
  comment: z.string().trim().max(500, 'Comment must be 500 characters or less'),
  rating: z.number().min(1).max(10).optional()
});

// Get gradient background based on rating value (smooth transition red→orange→green)
const getRatingGradient = (rating: number): string => {
  // Interpolate colors based on rating 1-10
  const getColor = (value: number): { r: number; g: number; b: number } => {
    if (value <= 3) {
      // Red: rgb(239, 68, 68) to Orange transition
      const t = (value - 1) / 2;
      return {
        r: Math.round(239 + (249 - 239) * t),
        g: Math.round(68 + (115 - 68) * t),
        b: Math.round(68 + (22 - 68) * t)
      };
    } else if (value <= 6) {
      // Orange: rgb(249, 115, 22) area
      const t = (value - 3) / 3;
      return {
        r: Math.round(249 - (249 - 234) * t),
        g: Math.round(115 + (179 - 115) * t),
        b: Math.round(22 + (8 - 22) * t)
      };
    } else {
      // Green: rgb(34, 197, 94)
      const t = (value - 6) / 4;
      return {
        r: Math.round(234 - (234 - 34) * t),
        g: Math.round(179 + (197 - 179) * t),
        b: Math.round(8 + (94 - 8) * t)
      };
    }
  };
  
  const color = getColor(rating);
  const lighterColor = {
    r: Math.min(255, color.r + 30),
    g: Math.min(255, color.g + 30),
    b: Math.min(255, color.b + 30)
  };
  
  return `linear-gradient(135deg, rgb(${lighterColor.r}, ${lighterColor.g}, ${lighterColor.b}), rgb(${color.r}, ${color.g}, ${color.b}))`;
};

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
  const { t } = useTranslation();
  const [rating, setRating] = useState<number | undefined>();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error(t('mustBeLoggedIn', { ns: 'explore', defaultValue: 'You must be logged in to review' }));
      return;
    }

    if (!rating && !comment.trim()) {
      toast.error(t('provideRatingOrComment', { ns: 'explore', defaultValue: 'Please provide a rating or comment' }));
      return;
    }

    // Validate input with zod
    const validation = reviewSchema.safeParse({ 
      comment: comment.trim(), 
      rating 
    });
    
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(', ');
      toast.error(errors);
      return;
    }

    setSubmitting(true);
    try {
      // Ensure location exists in locations table
      let internalLocationId = location.id;

      // If we have a google_place_id, make sure we have an internal location record
      if (location.google_place_id) {
        const { data: existingLocation } = await supabase
          .from('locations')
          .select('id')
          .eq('google_place_id', location.google_place_id)
          .maybeSingle();

        if (existingLocation) {
          internalLocationId = existingLocation.id;
        } else {
          // Create a basic location record if it doesn't exist
          const { data: newLocation, error: locationError } = await supabase
            .from('locations')
            .insert({
              name: location.name,
              google_place_id: location.google_place_id,
              category: 'place'
            })
            .select('id')
            .single();

          if (newLocation && !locationError) {
            internalLocationId = newLocation.id;
          }
        }
      }

      // Create a post with the rating and optional caption
      if (rating) {
        const { error: postError } = await supabase.from('posts').insert({
          user_id: user.id,
          location_id: internalLocationId,
          rating: rating,
          caption: validation.data.comment || null,
          media_urls: []
        });

        if (postError) {
          console.error('Error creating post:', postError);
          throw postError;
        }

        // Also create an interaction for analytics
        await supabase.from('interactions').insert({
          user_id: user.id,
          location_id: internalLocationId,
          action_type: 'review',
          weight: rating
        });
      }

      // Show success message
      if (rating && comment.trim()) {
        toast.success(
          t('ratedAndSharedExperience', { 
            ns: 'explore', 
            location: location.name, 
            rating: rating,
            defaultValue: `You rated ${location.name} ${rating}/10 and shared your experience!`
          }),
          { duration: 3000 }
        );
      } else if (rating) {
        toast.success(
          t('youRatedLocation', { 
            ns: 'explore', 
            location: location.name, 
            rating: rating,
            defaultValue: `You rated ${location.name} ${rating}/10`
          }),
          { duration: 3000 }
        );
      } else {
        toast.success(
          t('reviewPostedSuccess', { 
            ns: 'explore', 
            defaultValue: 'Your review has been posted successfully'
          }),
          { duration: 3000 }
        );
      }
      
      onClose();
      setRating(undefined);
      setComment('');
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(t('failedToSubmitReview', { ns: 'explore', defaultValue: 'Failed to submit review' }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background max-w-md rounded-t-3xl rounded-b-none sm:rounded-t-3xl sm:rounded-b-none z-[20000] !top-auto !bottom-0 !translate-y-0 pb-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">
            {t('reviewLocation', { ns: 'explore', location: location.name, defaultValue: `Review ${location.name}` })}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 pb-6">
          {/* Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('ratingOptional', { ns: 'explore', defaultValue: 'Rating (optional)' })}
            </label>
            <div className="flex gap-2 flex-wrap justify-center">
              {[...Array(10)].map((_, i) => {
                const value = i + 1;
                const isSelected = rating && rating >= value;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRating(rating === value ? undefined : value)}
                    className={`w-12 h-12 rounded-2xl font-semibold transition-all ${
                      isSelected
                        ? 'text-white shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                    style={isSelected && rating ? {
                      background: getRatingGradient(rating)
                    } : undefined}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
            {rating && (
              <p className="text-xs text-muted-foreground text-center">
                {t('youRatedThis', { ns: 'explore', rating, defaultValue: `You rated this ${rating}/10` })}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('commentOptional', { ns: 'explore', defaultValue: 'Comment (optional)' })}
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('shareYourExperience', { ns: 'explore', defaultValue: 'Share your experience...' })}
              className="min-h-[100px] rounded-2xl resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {t('charactersCount', { ns: 'explore', count: comment.length, defaultValue: `${comment.length}/500 characters` })}
            </p>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || (!rating && !comment.trim())}
            className="w-full h-12 rounded-2xl font-semibold"
          >
            {submitting 
              ? t('submitting', { ns: 'explore', defaultValue: 'Submitting...' })
              : t('submitReview', { ns: 'explore', defaultValue: 'Submit Review' })
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LocationReviewModal;
