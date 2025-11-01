import React, { useState } from 'react';
import { X, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { Comment } from '@/services/socialEngagementService';

interface CommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  comments: Comment[];
  onAddComment: (content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

export const CommentDrawer = ({
  isOpen,
  onClose,
  comments,
  onAddComment,
  onDeleteComment,
}: CommentDrawerProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[70]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-x-0 bottom-0 z-[71] bg-background rounded-t-3xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl">
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-center px-4 py-3 border-b border-border shrink-0 relative">
          <h3 className="font-semibold text-base">{t('common.comment', 'Commenti')}</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full absolute right-2"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Comments List */}
        <ScrollArea className="flex-1 px-4">
          {comments.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted-foreground text-sm">Nessun commento</p>
              <p className="text-muted-foreground text-xs mt-1">Sii il primo a commentare!</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2.5">
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarImage src={comment.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {comment.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="bg-muted rounded-2xl px-3.5 py-2.5">
                      <p className="font-semibold text-sm mb-0.5">{comment.username}</p>
                      <p className="text-sm text-foreground break-words leading-relaxed">{comment.content}</p>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 px-3">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </p>
                      {user?.id === comment.user_id && (
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
                        >
                          {t('common.delete', 'Elimina')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Comment Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border shrink-0 bg-background">
          <div className="flex gap-3 items-center">
            <Avatar className="w-9 h-9 shrink-0">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {user?.user_metadata?.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 relative">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Aggiungi un commento..."
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
      </div>
    </>
  );
};
