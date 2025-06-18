
import { useState, useEffect } from 'react';
import { X, Send, Heart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { commentService, Comment } from '@/services/commentService';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Place {
  id: string;
  name: string;
  category: string;
}

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  place: Place | null;
  onCommentSubmit: (text: string, place: Place) => void;
}

const CommentModal = ({ isOpen, onClose, place, onCommentSubmit }: CommentModalProps) => {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && place) {
      loadComments();
    }
  }, [isOpen, place]);

  const loadComments = async () => {
    if (!place) return;
    
    setLoading(true);
    try {
      const commentsData = await commentService.getCommentsForPlace(place.id);
      setComments(commentsData);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim() || !place || !user || submitting) return;

    setSubmitting(true);
    try {
      const newComment = await commentService.addComment(place.id, commentText);
      if (newComment) {
        setComments(prev => [newComment, ...prev]);
        setCommentText('');
        onCommentSubmit(commentText, place);
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentLike = async (commentId: string) => {
    try {
      const success = await commentService.toggleCommentLike(commentId);
      if (success) {
        setComments(prev => prev.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              is_liked: !comment.is_liked,
              likes_count: comment.is_liked ? comment.likes_count - 1 : comment.likes_count + 1
            };
          }
          return comment;
        }));
      }
    } catch (error) {
      console.error('Error toggling comment like:', error);
    }
  };

  if (!isOpen || !place) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-2xl w-full max-w-md h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Comments</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Place Info */}
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-medium">{place.name}</h3>
          <p className="text-sm text-gray-500">{place.category}</p>
        </div>

        {/* Comments List */}
        <ScrollArea className="flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No comments yet. Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  {/* User Avatar */}
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={comment.user?.avatar_url} />
                    <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                      {comment.user?.full_name?.[0] || comment.user?.username?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  {/* Comment Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{comment.user?.full_name || comment.user?.username}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mb-2">{comment.content}</p>
                    
                    {/* Comment Actions */}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleCommentLike(comment.id)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <Heart 
                          className={`w-3 h-3 ${
                            comment.is_liked ? 'fill-red-500 text-red-500' : 'text-gray-500'
                          }`} 
                        />
                        <span>{comment.likes_count}</span>
                      </button>
                      <button className="text-xs text-gray-500 hover:text-gray-700">
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Comment Input */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                {user?.user_metadata?.full_name?.[0] || 'Me'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 relative">
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="pr-10 rounded-full border-gray-300"
                onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit()}
                disabled={submitting}
              />
            </div>
            <button 
              onClick={handleCommentSubmit}
              disabled={!commentText.trim() || submitting}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send className="w-4 h-4 text-blue-600" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;
