
import { Heart, MessageCircle, MapPin, X, Send, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useState } from 'react';

interface Post {
  id: string;
  image: string;
  likes: number;
  comments: number;
  location: string;
  caption: string;
  createdAt: string;
  totalSaves?: number;
}

interface Comment {
  id: string;
  username: string;
  text: string;
  timestamp: string;
}

interface PostDetailModalProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  isLiked: boolean;
  isSaved: boolean;
  onLikeToggle: () => void;
  onSaveToggle: () => void;
}

const PostDetailModal = ({ 
  post, 
  isOpen, 
  onClose, 
  isLiked, 
  isSaved, 
  onLikeToggle, 
  onSaveToggle 
}: PostDetailModalProps) => {
  const [newComment, setNewComment] = useState('');
  
  // Demo comments
  const comments: Comment[] = [
    { id: '1', username: 'sarah_travels', text: 'This place looks amazing! 😍', timestamp: '2h' },
    { id: '2', username: 'foodie_mike', text: 'Best pasta I\'ve ever had!', timestamp: '4h' },
    { id: '3', username: 'city_explorer', text: 'Adding this to my list 📝', timestamp: '6h' }
  ];

  if (!isOpen || !post) return null;

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      console.log('New comment:', newComment);
      setNewComment('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header with close button */}
        <div className="relative">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white backdrop-blur-sm"
          >
            <X className="w-4 h-4" />
          </Button>
          
          {/* Image with overlay info */}
          <div className="relative">
            <img 
              src={post.image} 
              alt={post.caption}
              className="w-full aspect-square object-cover"
            />
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            
            {/* Location badge */}
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-blue-600" />
              <span className="text-xs font-medium text-gray-800">{post.location}</span>
            </div>
            
            {/* Stats overlay */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                  <Heart className="w-3 h-3 text-red-500" />
                  <span className="text-xs font-semibold text-gray-800">{post.likes + (isLiked ? 1 : 0)}</span>
                </div>
                <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                  <MessageCircle className="w-3 h-3 text-blue-500" />
                  <span className="text-xs font-semibold text-gray-800">{comments.length}</span>
                </div>
                <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                  <Bookmark className="w-3 h-3 text-purple-500" />
                  <span className="text-xs font-semibold text-gray-800">{(post.totalSaves || 15) + (isSaved ? 1 : 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content section */}
        <div className="flex-1 flex flex-col">
          {/* User info and caption */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face" />
                <AvatarFallback>YU</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">your_username</p>
                <p className="text-xs text-gray-500">{post.createdAt}</p>
              </div>
            </div>
            <p className="text-sm text-gray-800 leading-relaxed">{post.caption}</p>
          </div>

          {/* Action buttons */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={onLikeToggle}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-all duration-200 ${
                    isLiked 
                      ? 'bg-red-50 text-red-600' 
                      : 'bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  <span className="text-xs font-medium">Like</span>
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">Comment</span>
                </button>
              </div>
              <button
                onClick={onSaveToggle}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-all duration-200 ${
                  isSaved 
                    ? 'bg-purple-50 text-purple-600' 
                    : 'bg-gray-50 text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                <span className="text-xs font-medium">Save</span>
              </button>
            </div>
          </div>

          {/* Comments */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2">
                <Avatar className="w-6 h-6 flex-shrink-0">
                  <AvatarImage src={`https://images.unsplash.com/photo-147209964578${comment.id}?w=24&h=24&fit=crop&crop=face`} />
                  <AvatarFallback className="text-xs">{comment.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="bg-gray-50 rounded-2xl px-3 py-2">
                    <p className="text-xs font-semibold text-gray-900 mb-0.5">{comment.username}</p>
                    <p className="text-sm text-gray-800">{comment.text}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-3">{comment.timestamp}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Add Comment */}
          <form onSubmit={handleCommentSubmit} className="p-4 border-t border-gray-100 flex items-center gap-3">
            <Avatar className="w-7 h-7">
              <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=28&h=28&fit=crop&crop=face" />
              <AvatarFallback className="text-xs">YU</AvatarFallback>
            </Avatar>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full text-sm bg-gray-50 rounded-full px-4 py-2 pr-10 border-none outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {newComment.trim() && (
                <Button 
                  type="submit" 
                  size="sm" 
                  variant="ghost" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Send className="w-3 h-3" />
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PostDetailModal;
