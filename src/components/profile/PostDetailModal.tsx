
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
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header with close button */}
        <div className="relative">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/20 hover:bg-black/30 text-white backdrop-blur-md shadow-lg"
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
            
            {/* Location badge */}
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-sm font-semibold text-gray-800">{post.location}</span>
            </div>
            
            {/* Stats overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/95 backdrop-blur-md rounded-full px-3 py-2 flex items-center gap-2 shadow-lg">
                  <Heart className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-sm font-bold text-gray-800">{post.likes + (isLiked ? 1 : 0)}</span>
                </div>
                <div className="bg-white/95 backdrop-blur-md rounded-full px-3 py-2 flex items-center gap-2 shadow-lg">
                  <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-sm font-bold text-gray-800">{comments.length}</span>
                </div>
                <div className="bg-white/95 backdrop-blur-md rounded-full px-3 py-2 flex items-center gap-2 shadow-lg">
                  <Bookmark className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-sm font-bold text-gray-800">{(post.totalSaves || 15) + (isSaved ? 1 : 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content section */}
        <div className="flex-1 flex flex-col">
          {/* User info and caption */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="w-11 h-11 ring-2 ring-blue-100">
                <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=44&h=44&fit=crop&crop=face" />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">YU</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-sm">your_username</p>
                <p className="text-xs text-gray-500">{post.createdAt}</p>
              </div>
            </div>
            <p className="text-sm text-gray-800 leading-relaxed">{post.caption}</p>
          </div>

          {/* Action buttons */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={onLikeToggle}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 ${
                    isLiked 
                      ? 'bg-red-50 text-red-600 scale-105' 
                      : 'bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:scale-105'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  <span className="text-sm font-semibold">Like</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300 hover:scale-105">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm font-semibold">Comment</span>
                </button>
              </div>
              <button
                onClick={onSaveToggle}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 ${
                  isSaved 
                    ? 'bg-purple-50 text-purple-600 scale-105' 
                    : 'bg-gray-50 text-gray-600 hover:bg-purple-50 hover:text-purple-600 hover:scale-105'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                <span className="text-sm font-semibold">Save</span>
              </button>
            </div>
          </div>

          {/* Comments */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-3">
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarImage src={`https://images.unsplash.com/photo-147209964578${comment.id}?w=28&h=28&fit=crop&crop=face`} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-blue-400 to-purple-500 text-white font-medium">{comment.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="bg-gray-50 rounded-2xl px-4 py-3">
                    <p className="text-xs font-bold text-gray-900 mb-1">{comment.username}</p>
                    <p className="text-sm text-gray-800 leading-relaxed">{comment.text}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 ml-4">{comment.timestamp}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Add Comment */}
          <form onSubmit={handleCommentSubmit} className="p-5 border-t border-gray-100 flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face" />
              <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">YU</AvatarFallback>
            </Avatar>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full text-sm bg-gray-50 rounded-full px-5 py-3 pr-12 border-none outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
              />
              {newComment.trim() && (
                <Button 
                  type="submit" 
                  size="sm" 
                  variant="ghost" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Send className="w-4 h-4" />
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
