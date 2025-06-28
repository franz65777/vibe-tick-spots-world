
import React, { useState, useEffect } from 'react';
import { MessageSquare, Heart, Send, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { commentService, Comment } from '@/services/commentService';
import { useAuth } from '@/contexts/AuthContext';

interface CommentSystemProps {
  placeId: string;
  isOpen: boolean;
  onClose: () => void;
}

const CommentSystem = ({ placeId, isOpen, onClose }: CommentSystemProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && placeId) {
      loadComments();
    }
  }, [isOpen, placeId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const fetchedComments = await commentService.getCommentsForPlace(placeId);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    try {
      const comment = await commentService.addComment(placeId, newComment.trim());
      if (comment) {
        setComments(prev => [comment, ...prev]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const success = await commentService.toggleCommentLike(commentId);
      if (success) {
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { 
                ...comment, 
                is_liked: !comment.is_liked,
                likes_count: comment.is_liked ? comment.likes_count - 1 : comment.likes_count + 1
              }
            : comment
        ));
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Comments
          </h3>
          <Button onClick={onClose} variant="ghost" size="sm">
            ✕
          </Button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No comments yet</p>
              <p className="text-gray-400 text-sm">Be the first to share your thoughts!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  {comment.user?.avatar_url ? (
                    <img 
                      src={comment.user.avatar_url} 
                      alt={comment.user.username || 'User'} 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="bg-gray-50 rounded-2xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 text-sm">
                        {comment.user?.full_name || comment.user?.username || 'Anonymous'}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{comment.content}</p>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <button
                      onClick={() => handleLikeComment(comment.id)}
                      className={`flex items-center gap-1 text-xs transition-colors ${
                        comment.is_liked 
                          ? 'text-red-600' 
                          : 'text-gray-500 hover:text-red-600'
                      }`}
                    >
                      <Heart className={`w-3 h-3 ${comment.is_liked ? 'fill-current' : ''}`} />
                      {comment.likes_count > 0 && comment.likes_count}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Comment */}
        {user && (
          <div className="border-t border-gray-100 p-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                {user.user_metadata?.avatar_url ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt="You" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="flex-1">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="min-h-[80px] resize-none border-gray-200 rounded-xl focus:border-blue-400 focus:ring-blue-400"
                />
                <div className="flex justify-end mt-2">
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || submitting}
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {submitting ? 'Posting...' : 'Post'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentSystem;
