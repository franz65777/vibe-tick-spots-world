
import { Heart, MessageCircle, MapPin, X, Send } from 'lucide-react';
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
      // In real app, submit comment to backend
      console.log('New comment:', newComment);
      setNewComment('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face" />
              <AvatarFallback>YU</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">your_username</p>
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <MapPin className="w-3 h-3" />
                <span>{post.location}</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Image */}
        <div className="relative">
          <img 
            src={post.image} 
            alt={post.caption}
            className="w-full aspect-square object-cover"
          />
        </div>

        {/* Actions */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={onLikeToggle}
                className={`transition-transform duration-200 ${isLiked ? 'scale-110' : 'hover:scale-110'}`}
              >
                <Heart className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} />
              </button>
              <button className="hover:scale-110 transition-transform duration-200">
                <MessageCircle className="w-6 h-6 text-gray-700" />
              </button>
            </div>
            <button
              onClick={onSaveToggle}
              className={`transition-all duration-200 ${isSaved ? 'scale-110' : 'hover:scale-110'}`}
            >
              <MapPin className={`w-6 h-6 ${isSaved ? 'fill-blue-500 text-blue-500' : 'text-gray-700'}`} />
            </button>
          </div>

          <div className="space-y-1 text-sm">
            <p className="font-semibold">{post.likes + (isLiked ? 1 : 0)} likes</p>
            <p className="font-semibold">{(post.totalSaves || 15) + (isSaved ? 1 : 0)} saves</p>
            <p>
              <span className="font-semibold">your_username</span> {post.caption}
            </p>
            <p className="text-gray-500 text-xs">{post.createdAt}</p>
          </div>
        </div>

        {/* Comments */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-3">
              <Avatar className="w-6 h-6">
                <AvatarImage src={`https://images.unsplash.com/photo-147209964578${comment.id}?w=24&h=24&fit=crop&crop=face`} />
                <AvatarFallback>{comment.username[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-semibold">{comment.username}</span>{' '}
                  {comment.text}
                </p>
                <p className="text-xs text-gray-500 mt-1">{comment.timestamp}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Add Comment */}
        <form onSubmit={handleCommentSubmit} className="p-4 border-t flex items-center gap-3">
          <Avatar className="w-6 h-6">
            <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=24&h=24&fit=crop&crop=face" />
            <AvatarFallback>YU</AvatarFallback>
          </Avatar>
          <input
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 text-sm border-none outline-none bg-transparent"
          />
          {newComment.trim() && (
            <Button type="submit" size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700">
              <Send className="w-4 h-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
};

export default PostDetailModal;
