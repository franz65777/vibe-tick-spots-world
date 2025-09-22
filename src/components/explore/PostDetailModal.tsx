
import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle, Bookmark, Share2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { usePostEngagement } from '@/hooks/usePostEngagement';
import { useNavigate } from 'react-router-dom';

interface PostDetailModalProps {
  post: {
    id: string;
    user_id: string;
    caption?: string;
    media_urls: string[];
    created_at: string;
    likes_count: number;
    comments_count: number;
    saves_count: number;
    profiles?: {
      username?: string;
      avatar_url?: string;
    };
  };
  isOpen: boolean;
  onClose: () => void;
}

const PostDetailModal = ({ post, isOpen, onClose }: PostDetailModalProps) => {
  const { isLiked, isSaved, toggleLike, toggleSave } = usePostEngagement();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleUserClick = () => {
    onClose();
    navigate(`/profile/${post.user_id}`);
  };

  const handleLike = async () => {
    await toggleLike(post.id);
  };

  const handleSave = async () => {
    await toggleSave(post.id);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Check out this post by ${post.profiles?.username}`,
        text: post.caption || 'Amazing post!',
        url: window.location.href
      });
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === post.media_urls.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? post.media_urls.length - 1 : prev - 1
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0 bg-white">
        <div className="flex h-full max-h-[90vh]">
          {/* Media Section */}
          <div className="flex-1 bg-black flex items-center justify-center relative">
            {post.media_urls && post.media_urls.length > 0 && (
              <>
                <img
                  src={post.media_urls[currentImageIndex]}
                  alt="Post content"
                  className="max-w-full max-h-full object-contain"
                />
                
                {/* Navigation arrows for multiple images */}
                {post.media_urls.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                    >
                      ←
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                    >
                      →
                    </button>
                    
                    {/* Image indicators */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {post.media_urls.map((_, index) => (
                        <div
                          key={index}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Section */}
          <div className="w-96 flex flex-col bg-white">
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <button onClick={handleUserClick} className="flex items-center gap-3 hover:opacity-75 transition-opacity">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={post.profiles?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                      {(post.profiles?.username || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {post.profiles?.username || 'Anonymous'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Caption */}
            <div className="flex-1 p-4">
              {post.caption && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={post.profiles?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-xs">
                        {(post.profiles?.username || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-semibold text-gray-900 mr-2">
                        {post.profiles?.username || 'Anonymous'}
                      </span>
                      <span className="text-gray-800">{post.caption}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleLike}
                    className={`transition-colors ${
                      isLiked(post.id) ? 'text-red-500' : 'text-gray-700 hover:text-red-500'
                    }`}
                  >
                    <Heart className={`w-6 h-6 ${isLiked(post.id) ? 'fill-current' : ''}`} />
                  </button>
                  <button className="text-gray-700 hover:text-blue-500 transition-colors">
                    <MessageCircle className="w-6 h-6" />
                  </button>
                  <button onClick={handleShare} className="text-gray-700 hover:text-green-500 transition-colors">
                    <Share2 className="w-6 h-6" />
                  </button>
                </div>
                <button
                  onClick={handleSave}
                  className={`transition-colors ${
                    isSaved(post.id) ? 'text-blue-500' : 'text-gray-700 hover:text-blue-500'
                  }`}
                >
                  <Bookmark className={`w-6 h-6 ${isSaved(post.id) ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Engagement stats */}
              <div className="space-y-1 text-sm">
                <div className="font-semibold text-gray-900">
                  {post.likes_count} {post.likes_count === 1 ? 'like' : 'likes'}
                </div>
                {post.comments_count > 0 && (
                  <div className="text-gray-500">
                    View all {post.comments_count} comments
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostDetailModal;
