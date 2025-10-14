import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { addPostComment, type PostComment } from '@/services/postCommentService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface PostCommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postOwnerId: string;
  comments: PostComment[];
  onCommentAdded: (comment: PostComment) => void;
}

export const PostCommentsDrawer = ({
  isOpen,
  onClose,
  postId,
  postOwnerId,
  comments,
  onCommentAdded,
}: PostCommentsDrawerProps) => {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    const commentContent = newComment;
    setNewComment('');
    setSubmitting(true);

    try {
      const comment = await addPostComment(postId, user.id, commentContent);
      if (comment) {
        onCommentAdded(comment);

        // Create notification for post owner
        if (postOwnerId !== user.id) {
          try {
            // Fetch current user's profile data
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', user.id)
              .maybeSingle();

            await supabase.from('notifications').insert({
              user_id: postOwnerId,
              type: 'comment',
              title: 'New comment on your post',
              message: `${profile?.username || 'Someone'} commented: "${commentContent.slice(0, 50)}${commentContent.length > 50 ? '...' : ''}"`,
              data: {
                post_id: postId,
                user_id: user.id,
                user_name: profile?.username,
                user_avatar: profile?.avatar_url,
                comment: commentContent,
              },
            });
          } catch (err) {
            console.error('Error creating notification:', err);
          }
        }

        toast.success('Comment added');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
      setNewComment(commentContent);
    } finally {
      setSubmitting(false);
    }
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
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-base">Comments</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Comments List */}
        <ScrollArea className="flex-1 px-4 py-3">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">No comments yet</p>
              <p className="text-xs text-muted-foreground mt-1">Be the first to comment</p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={comment.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted text-xs">
                      {comment.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold mr-2">{comment.username}</span>
                      {comment.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Comment Input */}
        <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-border bg-background">
          <div className="flex gap-3 items-center">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              disabled={!user || submitting}
              className="flex-1 min-h-0 resize-none border-none focus-visible:ring-0 px-0"
              rows={1}
            />
            {newComment.trim() && (
              <Button
                type="submit"
                size="sm"
                disabled={submitting || !user}
                className="font-semibold"
              >
                {submitting ? 'Posting...' : 'Post'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </>
  );
};
