import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
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
      <div className="fixed inset-x-0 bottom-0 z-[71] bg-background rounded-t-2xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h3 className="font-semibold text-base">Comments</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Comments List */}
        <ScrollArea className="flex-1 px-4">
          {comments.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm">No comments yet</p>
              <p className="text-muted-foreground text-xs mt-1">Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={comment.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {comment.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="bg-muted rounded-2xl px-3 py-2">
                      <p className="font-semibold text-sm">{comment.username}</p>
                      <p className="text-sm text-foreground break-words">{comment.content}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 px-3">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </p>
                      {user?.id === comment.user_id && (
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="text-xs text-destructive hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
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
        <form onSubmit={handleSubmit} className="p-4 border-t border-border shrink-0">
          <div className="flex gap-2 items-end">
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {user?.user_metadata?.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>

            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="min-h-[40px] max-h-[120px] resize-none rounded-2xl"
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
              size="sm"
              className="rounded-full px-4 shrink-0"
            >
              {submitting ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};
