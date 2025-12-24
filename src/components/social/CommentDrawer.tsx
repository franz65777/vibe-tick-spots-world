import React, { useState, useRef, useCallback } from 'react';
import { Send, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Drawer } from 'vaul';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { getDateFnsLocale } from '@/utils/dateFnsLocales';
import type { Comment } from '@/services/socialEngagementService';
import { useOptimizedProfile } from '@/hooks/useOptimizedProfile';
import { supabase } from '@/integrations/supabase/client';
import noCommentsIcon from '@/assets/speech-bubble-icon.png';

interface CommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  comments: Comment[];
  onAddComment: (content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  isLoading?: boolean;
}

interface CommentLikeState {
  [commentId: string]: { isLiked: boolean; count: number };
}

export const CommentDrawer = ({
  isOpen,
  onClose,
  comments,
  onAddComment,
  onDeleteComment,
  isLoading = false,
}: CommentDrawerProps) => {
  const { user } = useAuth();
  const { profile } = useOptimizedProfile();
  const { t, i18n } = useTranslation();
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentLikes, setCommentLikes] = useState<CommentLikeState>({});
  const lastTapRef = useRef<{ [key: string]: number }>({});
  const likeAnimationRef = useRef<{ [key: string]: boolean }>({});
  const [showLikeAnimation, setShowLikeAnimation] = useState<{ [key: string]: boolean }>({});

  // Load comment likes on mount and when comments change
  React.useEffect(() => {
    if (!user?.id || comments.length === 0) return;

    const loadLikes = async () => {
      const commentIds = comments.map(c => c.id);
      
      // Get like counts for all comments
      const { data: likeCounts } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .in('comment_id', commentIds);

      // Get user's likes
      const { data: userLikes } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', user.id)
        .in('comment_id', commentIds);

      const userLikedSet = new Set(userLikes?.map(l => l.comment_id) || []);
      
      // Count likes per comment
      const countMap: { [key: string]: number } = {};
      likeCounts?.forEach(l => {
        countMap[l.comment_id] = (countMap[l.comment_id] || 0) + 1;
      });

      const newState: CommentLikeState = {};
      comments.forEach(c => {
        newState[c.id] = {
          isLiked: userLikedSet.has(c.id),
          count: countMap[c.id] || 0
        };
      });
      setCommentLikes(newState);
    };

    loadLikes();
  }, [user?.id, comments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onAddComment(newComment);
      setNewComment('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    await onDeleteComment(commentId);
  };

  // Translate delete button text
  const deleteText = t('comments.delete', 'Elimina');

  const toggleCommentLike = useCallback(async (commentId: string) => {
    if (!user?.id) return;

    const currentState = commentLikes[commentId] || { isLiked: false, count: 0 };
    const newIsLiked = !currentState.isLiked;

    // Optimistic update
    setCommentLikes(prev => ({
      ...prev,
      [commentId]: {
        isLiked: newIsLiked,
        count: newIsLiked ? currentState.count + 1 : Math.max(0, currentState.count - 1)
      }
    }));

    // Show heart animation on like
    if (newIsLiked) {
      setShowLikeAnimation(prev => ({ ...prev, [commentId]: true }));
      setTimeout(() => {
        setShowLikeAnimation(prev => ({ ...prev, [commentId]: false }));
      }, 600);
    }

    try {
      if (newIsLiked) {
        await supabase.from('comment_likes').insert({
          user_id: user.id,
          comment_id: commentId
        });
      } else {
        await supabase.from('comment_likes').delete()
          .eq('user_id', user.id)
          .eq('comment_id', commentId);
      }
    } catch (error) {
      // Revert on error
      setCommentLikes(prev => ({
        ...prev,
        [commentId]: currentState
      }));
    }
  }, [user?.id, commentLikes]);

  const handleDoubleTap = useCallback((commentId: string) => {
    const now = Date.now();
    const lastTap = lastTapRef.current[commentId] || 0;
    
    if (now - lastTap < 300) {
      // Double tap detected - like the comment
      const currentState = commentLikes[commentId] || { isLiked: false, count: 0 };
      if (!currentState.isLiked) {
        toggleCommentLike(commentId);
      } else {
        // Already liked, just show animation
        setShowLikeAnimation(prev => ({ ...prev, [commentId]: true }));
        setTimeout(() => {
          setShowLikeAnimation(prev => ({ ...prev, [commentId]: false }));
        }, 600);
      }
      lastTapRef.current[commentId] = 0;
    } else {
      lastTapRef.current[commentId] = now;
    }
  }, [commentLikes, toggleCommentLike]);

  return (
    <Drawer.Root 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      modal={true}
      dismissible={true}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[9998]" onClick={onClose} />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[9999] bg-background rounded-t-3xl flex flex-col h-[85vh] outline-none shadow-2xl">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1.5 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-center px-4 py-3 shrink-0 relative">
            <h3 className="font-semibold text-base">{t('comments.title', 'Commenti')}</h3>
          </div>

          {/* Comments List */}
          <ScrollArea className="flex-1 px-4">
            {isLoading ? (
              <div className="py-8 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-2.5 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-muted shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="bg-muted rounded-2xl px-3.5 py-4 space-y-2">
                        <div className="h-3 w-20 bg-muted-foreground/20 rounded" />
                        <div className="h-3 w-full bg-muted-foreground/20 rounded" />
                        <div className="h-3 w-2/3 bg-muted-foreground/20 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center">
                <img 
                  src={noCommentsIcon} 
                  alt="No comments" 
                  className="w-20 h-20 mb-4 opacity-60"
                />
                <p className="text-muted-foreground text-sm">{t('comments.noComments', 'Nessun commento')}</p>
                <p className="text-muted-foreground text-xs mt-1">{t('comments.beFirst', 'Sii il primo a commentare!')}</p>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {comments.map((comment) => {
                  const likeState = commentLikes[comment.id] || { isLiked: false, count: 0 };
                  const showAnimation = showLikeAnimation[comment.id];
                  
                  return (
                    <div 
                      key={comment.id} 
                      className="flex gap-2.5"
                      onClick={() => handleDoubleTap(comment.id)}
                    >
                      <Avatar className="w-9 h-9 shrink-0">
                        <AvatarImage src={comment.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {comment.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0 relative">
                        <div className="bg-muted rounded-2xl px-3.5 py-2.5 relative overflow-hidden">
                          <p className="font-semibold text-sm mb-0.5">{comment.username}</p>
                          <p className="text-sm text-foreground break-words leading-relaxed">{comment.content}</p>
                          
                          {/* Like animation overlay */}
                          {showAnimation && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <Heart className="w-10 h-10 text-red-500 fill-red-500 animate-ping" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 px-3">
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: getDateFnsLocale(i18n.language) })}
                          </p>
                          
                          {/* Like button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCommentLike(comment.id);
                            }}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Heart 
                              className={`w-3.5 h-3.5 transition-all ${
                                likeState.isLiked ? 'text-red-500 fill-red-500 scale-110' : ''
                              }`} 
                            />
                            {likeState.count > 0 && (
                              <span className={likeState.isLiked ? 'text-red-500' : ''}>
                                {likeState.count}
                              </span>
                            )}
                          </button>
                          
                          {user?.id === comment.user_id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(comment.id);
                              }}
                              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
                            >
                              {deleteText}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Comment Input */}
          <form onSubmit={handleSubmit} className="p-4 shrink-0 bg-background">
            <div className="flex gap-3 items-center">
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {profile?.username?.[0]?.toUpperCase() || user?.user_metadata?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 relative">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={t('comments.addPlaceholder', 'Aggiungi un commento...')}
                  className="rounded-full pr-10 h-11 bg-muted border-0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <Button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full"
                >
                  <Send className={`h-5 w-5 ${newComment.trim() ? 'text-primary' : 'text-muted-foreground'}`} />
                </Button>
              </div>
            </div>
          </form>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};