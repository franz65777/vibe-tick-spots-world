import React, { useState, useEffect } from 'react';
import { X, MapPin, Users, MessageSquare, Send, Heart, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { commentService, Comment } from '@/services/commentService';
import { messageService } from '@/services/messageService';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface PlaceInteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'comments' | 'share';
  place: any;
}

const PlaceInteractionModal = ({ isOpen, onClose, mode, place }: PlaceInteractionModalProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [shareUsers] = useState([
    { id: '1', username: 'alex_travel', avatar_url: null },
    { id: '2', username: 'sarah_explorer', avatar_url: null },
    { id: '3', username: 'mike_wanderer', avatar_url: null }
  ]);

  useEffect(() => {
    if (isOpen && mode === 'comments') {
      loadComments();
    }
  }, [isOpen, mode, place?.id]);

  const loadComments = async () => {
    if (!place?.id) return;
    setLoading(true);
    const commentsData = await commentService.getCommentsForPlace(place.id);
    setComments(commentsData);
    setLoading(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !place?.id) return;

    const comment = await commentService.addComment(place.id, newComment);
    if (comment) {
      setComments(prev => [comment, ...prev]);
      setNewComment('');
    }
  };

  const handleShareWithUser = async (userId: string) => {
    if (!place) return;

    const result = await messageService.sendPlaceShare(userId, {
      id: place.id,
      name: place.name,
      category: place.category,
      image: place.image,
      coordinates: place.coordinates
    });

    if (result) {
      console.log('Place shared successfully');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-md h-[85vh] sm:h-[600px] sm:rounded-3xl rounded-t-3xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header with travel-inspired design */}
        <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M30 30l15-15v30h-30v-15z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              {mode === 'comments' ? (
                <div className="p-2 bg-white/20 rounded-full">
                  <MessageSquare className="w-5 h-5" />
                </div>
              ) : (
                <div className="p-2 bg-white/20 rounded-full">
                  <Share2 className="w-5 h-5" />
                </div>
              )}
              <div>
                <h3 className="font-bold text-lg">
                  {mode === 'comments' ? 'Travel Stories' : 'Share Discovery'}
                </h3>
                <p className="text-white/80 text-sm">{place?.name}</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {mode === 'comments' ? (
          <>
            {/* Comments section */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Be the first to share your experience!</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-50 rounded-2xl p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={comment.user?.avatar_url} />
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                            {comment.user?.username?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm text-gray-900">
                              {comment.user?.username}
                            </p>
                            <span className="text-xs text-gray-400">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{comment.content}</p>
                          <div className="flex items-center gap-3">
                            <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors">
                              <Heart className="w-3 h-3" />
                              {comment.likes_count}
                            </button>
                            <button className="text-xs text-gray-500 hover:text-blue-500 transition-colors">
                              Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Comment input */}
            <div className="p-4 border-t bg-white">
              <div className="flex gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                    {user?.user_metadata?.username?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 flex gap-2">
                  <Textarea
                    placeholder="Share your experience at this place..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="resize-none border-gray-200 rounded-xl text-sm"
                    rows={2}
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl px-4"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Share section */
          <div className="flex-1 p-4">
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">{t('shareWithFriends', { ns: 'common' })}</h4>
              <div className="space-y-3">
                {shareUsers.map((shareUser) => (
                  <div key={shareUser.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={shareUser.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-sm">
                          {shareUser.username[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{shareUser.username}</p>
                        <p className="text-xs text-gray-500">@{shareUser.username}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleShareWithUser(shareUser.id)}
                      size="sm"
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-full text-xs px-4"
                    >
                      {t('send', { ns: 'common' })}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaceInteractionModal;
