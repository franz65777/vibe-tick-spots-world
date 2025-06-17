
import { Heart, MessageCircle, Grid3X3, Trash2 } from 'lucide-react';
import { useState } from 'react';
import PostDetailModal from './PostDetailModal';
import { usePosts } from '@/hooks/usePosts';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Post {
  id: string;
  user_id: string;
  location_id?: string;
  caption?: string;
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  saves_count: number;
  created_at: string;
  updated_at: string;
  metadata: any;
}

interface PostsGridProps {
  userId?: string;
}

const PostsGrid = ({ userId }: PostsGridProps) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const targetUserId = userId || profile?.id;
  const { posts, loading, refetch } = usePosts(targetUserId);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  const isOwnProfile = user?.id === targetUserId;

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
  };

  const handleDeletePost = async (postId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    setDeletingPostId(postId);
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      await refetch();
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleLikeToggle = (postId: string) => {
    setLikedPosts(prev => {
      const newLiked = new Set(prev);
      if (newLiked.has(postId)) {
        newLiked.delete(postId);
      } else {
        newLiked.add(postId);
      }
      return newLiked;
    });
  };

  const handleSaveToggle = (postId: string) => {
    setSavedPosts(prev => {
      const newSaved = new Set(prev);
      if (newSaved.has(postId)) {
        newSaved.delete(postId);
      } else {
        newSaved.add(postId);
      }
      return newSaved;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Grid3X3 className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
        <p className="text-gray-600 text-sm">
          {isOwnProfile ? "Start sharing your favorite places!" : "No posts to show"}
        </p>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="grid grid-cols-2 gap-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-200"
            onClick={() => handlePostClick(post)}
          >
            <img
              src={post.media_urls[0]}
              alt={post.caption || 'Post'}
              className="w-full h-full object-cover"
            />
            
            {/* Multiple images indicator */}
            {post.media_urls.length > 1 && (
              <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
                <span className="text-xs text-white font-medium">
                  +{post.media_urls.length - 1}
                </span>
              </div>
            )}

            {/* Delete button - only show for own posts */}
            {isOwnProfile && (
              <button
                onClick={(e) => handleDeletePost(post.id, e)}
                disabled={deletingPostId === post.id}
                className="absolute top-2 left-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200"
              >
                {deletingPostId === post.id ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Trash2 className="w-4 h-4 text-white" />
                )}
              </button>
            )}
            
            {/* Overlay with stats */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-200 flex items-end">
              <div className="absolute bottom-2 right-2 opacity-0 hover:opacity-100 transition-opacity duration-200">
                <div className="flex gap-1">
                  <div className="bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                    <Heart className="w-3 h-3 text-white" />
                    <span className="text-xs text-white font-medium">{post.likes_count}</span>
                  </div>
                  <div className="bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                    <MessageCircle className="w-3 h-3 text-white" />
                    <span className="text-xs text-white font-medium">{post.comments_count}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <PostDetailModal 
        post={selectedPost ? {
          id: selectedPost.id,
          image: selectedPost.media_urls[0],
          likes: selectedPost.likes_count,
          comments: selectedPost.comments_count,
          location: 'Location',
          caption: selectedPost.caption || '',
          createdAt: selectedPost.created_at,
          totalSaves: selectedPost.saves_count,
          category: 'general'
        } : null}
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        isLiked={selectedPost ? likedPosts.has(selectedPost.id) : false}
        isSaved={selectedPost ? savedPosts.has(selectedPost.id) : false}
        onLikeToggle={() => selectedPost && handleLikeToggle(selectedPost.id)}
        onSaveToggle={() => selectedPost && handleSaveToggle(selectedPost.id)}
      />
    </div>
  );
};

export default PostsGrid;
