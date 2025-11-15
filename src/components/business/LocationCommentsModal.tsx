import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';

interface LocationCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string | null;
  googlePlaceId: string | null;
}

export const LocationCommentsModal = ({ isOpen, onClose, locationId, googlePlaceId }: LocationCommentsModalProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['location-comments', locationId, googlePlaceId],
    queryFn: async () => {
      if (!locationId && !googlePlaceId) return [];

      const placeId = googlePlaceId || locationId;
      if (!placeId) return [];

      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles:user_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq('place_id', placeId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return data || [];
    },
    enabled: isOpen && (!!locationId || !!googlePlaceId),
  });

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {t('comments', { ns: 'business' })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('loading', { ns: 'common' })}</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('noCommentsYet', { ns: 'business' })}</p>
          ) : (
            comments.map((comment: any) => (
              <div
                key={comment.id}
                className="flex gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
              >
                <Avatar 
                  className="h-10 w-10 cursor-pointer" 
                  onClick={() => handleUserClick(comment.profiles.id)}
                >
                  <AvatarImage src={comment.profiles.avatar_url || undefined} />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className="font-medium text-sm cursor-pointer hover:underline"
                      onClick={() => handleUserClick(comment.profiles.id)}
                    >
                      @{comment.profiles.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
