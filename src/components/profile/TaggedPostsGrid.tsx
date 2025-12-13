import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import PostDetailModal from '../explore/PostDetailModal';
import { useTranslation } from 'react-i18next';

interface TaggedPostsGridProps {
  userId?: string;
}

const TaggedPostsGrid = ({ userId }: TaggedPostsGridProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  useEffect(() => {
    if (targetUserId) {
      fetchTaggedPosts();
    }
  }, [targetUserId]);

  const fetchTaggedPosts = async () => {
    if (!targetUserId) return;

    try {
      setLoading(true);
      
      // Query posts where the user is tagged
      const { data: postsData, error } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          caption,
          media_urls,
          likes_count,
          comments_count,
          saves_count,
          shares_count,
          created_at,
          tagged_users,
          location_id
        `)
        .contains('tagged_users', [targetUserId])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(postsData || []);
    } catch (error) {
      console.error('Error fetching tagged posts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (posts.length === 0) {
    const isOwnProfile = !userId || userId === user?.id;
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <p className="text-muted-foreground">
          {isOwnProfile
            ? t('profile:noTaggedPostsSelf')
            : t('profile:noTaggedPostsOther')}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1 p-1">
        {posts.map((post) => {
          const firstMediaUrl = post.media_urls?.[0];
          const isVideo = firstMediaUrl?.includes('.mp4') || firstMediaUrl?.includes('.mov');

          return (
            <button
              key={post.id}
              onClick={() => setSelectedPostId(post.id)}
              className="relative aspect-square overflow-hidden bg-muted group"
            >
              {isVideo ? (
                <video
                  src={firstMediaUrl}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  muted
                />
              ) : (
                <img
                  src={firstMediaUrl}
                  alt="Tagged post"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              )}
            </button>
          );
        })}
      </div>

      {selectedPostId && (
        <PostDetailModal
          postId={selectedPostId}
          isOpen={true}
          onClose={() => setSelectedPostId(null)}
          source="profile"
        />
      )}
    </>
  );
};

export default TaggedPostsGrid;
