import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

interface LocationViewersModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string | null;
  googlePlaceId: string | null;
}

export const LocationViewersModal = ({ isOpen, onClose, locationId, googlePlaceId }: LocationViewersModalProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: viewers = [], isLoading } = useQuery({
    queryKey: ['location-viewers', locationId, googlePlaceId],
    queryFn: async () => {
      if (!locationId && !googlePlaceId) return [];

      const query = supabase
        .from('location_view_duration')
        .select(`
          user_id,
          profiles:user_id (
            id,
            username,
            avatar_url
          )
        `)
        .order('viewed_at', { ascending: false });

      if (locationId) query.eq('location_id', locationId);
      if (googlePlaceId) query.eq('google_place_id', googlePlaceId);

      const { data, error } = await query.limit(50);

      if (error) throw error;

      const uniqueViewers = Array.from(
        new Map(
          (data || [])
            .filter((v: any) => v.profiles)
            .map((v: any) => [v.profiles.id, v.profiles])
        ).values()
      );

      return uniqueViewers;
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
            {t('viewedBy', { ns: 'business' })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('loading', { ns: 'common' })}</p>
          ) : viewers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('noViewsYet', { ns: 'business' })}</p>
          ) : (
            viewers.map((viewer: any) => (
              <div
                key={viewer.id}
                onClick={() => handleUserClick(viewer.id)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={viewer.avatar_url || undefined} />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm">@{viewer.username}</span>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
