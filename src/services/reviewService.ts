import { supabase } from '@/integrations/supabase/client';

export interface PostReview {
  id: string;
  post_id: string;
  user_id: string;
  location_id: string | null;
  comment: string;
  rating: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
  locations?: {
    id: string;
    name: string;
    category: string;
    city: string;
  };
}

/**
 * Get reviews for a specific post
 */
export async function getPostReviews(postId: string): Promise<PostReview[]> {
  try {
    const { data: reviewsData, error } = await supabase
      .from('post_reviews')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!reviewsData) return [];

    // Fetch user profiles separately
    const userIds = reviewsData.map(r => r.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', userIds);

    // Fetch locations separately
    const locationIds = reviewsData.map(r => r.location_id).filter(Boolean);
    const { data: locations } = locationIds.length > 0 
      ? await supabase
          .from('locations')
          .select('id, name, category, city')
          .in('id', locationIds)
      : { data: [] };

    // Combine data
    const reviews: PostReview[] = reviewsData.map(review => {
      const profile = profiles?.find(p => p.id === review.user_id);
      const location = locations?.find(l => l.id === review.location_id);
      
      return {
        ...review,
        profiles: profile ? {
          username: profile.username,
          avatar_url: profile.avatar_url,
        } : undefined,
        locations: location,
      };
    });

    return reviews;
  } catch (error) {
    console.error('Error fetching post reviews:', error);
    return [];
  }
}

/**
 * Create a new review for a post
 */
export async function createPostReview(
  postId: string,
  userId: string,
  locationId: string | null,
  comment: string,
  rating: number
): Promise<PostReview | null> {
  try {
    const { data: reviewData, error } = await supabase
      .from('post_reviews')
      .insert({
        post_id: postId,
        user_id: userId,
        location_id: locationId,
        comment,
        rating,
      })
      .select('*')
      .single();

    if (error) throw error;
    if (!reviewData) return null;

    // Fetch profile separately
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    // Fetch location if provided
    let location = null;
    if (locationId) {
      const { data: locationData } = await supabase
        .from('locations')
        .select('id, name, category, city')
        .eq('id', locationId)
        .maybeSingle();
      location = locationData;
    }

    return {
      ...reviewData,
      profiles: profile || undefined,
      locations: location || undefined,
    } as PostReview;
  } catch (error) {
    console.error('Error creating review:', error);
    return null;
  }
}

/**
 * Update an existing review
 */
export async function updatePostReview(
  reviewId: string,
  comment: string,
  rating: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('post_reviews')
      .update({ comment, rating, updated_at: new Date().toISOString() })
      .eq('id', reviewId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating review:', error);
    return false;
  }
}

/**
 * Delete a review
 */
export async function deletePostReview(reviewId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('post_reviews')
      .delete()
      .eq('id', reviewId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting review:', error);
    return false;
  }
}

/**
 * Check if user has already reviewed a post
 */
export async function hasUserReviewedPost(
  postId: string,
  userId: string
): Promise<PostReview | null> {
  try {
    const { data, error } = await supabase
      .from('post_reviews')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data as PostReview | null;
  } catch (error) {
    console.error('Error checking user review:', error);
    return null;
  }
}
