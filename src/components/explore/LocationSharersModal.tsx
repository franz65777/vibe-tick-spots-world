import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

interface LocationSharersModalProps {
  isOpen: boolean;
  onClose: () => void;
  sharers?: Array<{ id: string; username: string; avatar_url: string | null }>;
  locationName: string;
  locationId?: string | null;
  googlePlaceId?: string | null;
}

export const LocationSharersModal = ({ 
  isOpen, 
  onClose, 
  sharers: propSharers = [], 
  locationName,
  locationId,
  googlePlaceId 
}: LocationSharersModalProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Fetch savers if locationId or googlePlaceId is provided
  const { data: fetchedSavers = [], isLoading } = useQuery({
    queryKey: ['location-savers', locationId, googlePlaceId],
    queryFn: async () => {
      if (!locationId && !googlePlaceId) return [];

      let allSavers: any[] = [];

      // Fetch from user_saved_locations if locationId exists
      if (locationId) {
        const { data: uslData } = await supabase
          .from('user_saved_locations')
          .select(`
            user_id,
            profiles:user_id (
              id,
              username,
              avatar_url
            )
          `)
          .eq('location_id', locationId);

        if (uslData) {
          allSavers.push(...uslData.filter(s => s.profiles).map(s => s.profiles));
        }
      }

      // Fetch from saved_places if googlePlaceId exists
      if (googlePlaceId) {
        const { data: spData } = await supabase
          .from('saved_places')
          .select(`
            user_id,
            profiles:user_id (
              id,
              username,
              avatar_url
            )
          `)
          .eq('place_id', googlePlaceId);

        if (spData) {
          allSavers.push(...spData.filter(s => s.profiles).map(s => s.profiles));
        }
      }

      // Remove duplicates based on user id
      const uniqueSavers = Array.from(
        new Map(allSavers.map(s => [s.id, s])).values()
      );

      return uniqueSavers;
    },
    enabled: isOpen && (!!locationId || !!googlePlaceId),
  });

  const sharers = (locationId || googlePlaceId) ? fetchedSavers : propSharers;

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {t('savedBy', { ns: 'business' })} {locationName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('loading', { ns: 'common' })}</p>
          ) : sharers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('noSavesYet', { ns: 'business' })}</p>
          ) : (
            sharers.map((sharer) => (
              <div
                key={sharer.id}
                onClick={() => handleUserClick(sharer.id)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={sharer.avatar_url || undefined} />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm">@{sharer.username}</span>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
