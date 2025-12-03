import React, { useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useLocationShares } from '@/hooks/useLocationShares';
import { useTranslation } from 'react-i18next';
import { Place } from '@/types/place';

interface ShareData {
  location_id: string | null;
  location_name: string;
  location_address: string | null;
  latitude: number;
  longitude: number;
}

interface ActiveSharesListSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  places: Place[];
  onSelectLocation: (placeId: string, shareData?: ShareData) => void;
  onCountChange?: (count: number) => void;
  parentOverlayOpen?: boolean;
}

const ActiveSharesListSheet: React.FC<ActiveSharesListSheetProps> = ({ open, onOpenChange, places, onSelectLocation, onCountChange, parentOverlayOpen }) => {
  const { t } = useTranslation();
  const { shares } = useLocationShares();

  // Group active shares by location_id and keep share data for fallback
  const grouped = useMemo(() => {
    const now = new Date();
    const groups = new Map<string, { 
      name: string; 
      shareUsers: { id: string; username: string; avatar_url: string | null }[];
      shareData: ShareData;
    }>();

    shares.forEach((s) => {
      try {
        if (new Date(s.expires_at) <= now) return; // only active
      } catch { return; }
      const locId = s.location_id ?? `__geo__:${s.latitude.toFixed(5)},${s.longitude.toFixed(5)}`;
      const name = s.location_name || `${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}`;
      const entry = groups.get(locId) || { 
        name, 
        shareUsers: [],
        shareData: {
          location_id: s.location_id,
          location_name: s.location_name,
          location_address: s.location_address,
          latitude: s.latitude,
          longitude: s.longitude
        }
      };
      // Avoid duplicates by user id
      if (!entry.shareUsers.find(u => u.id === s.user.id)) {
        entry.shareUsers.push({ id: s.user.id, username: s.user.username, avatar_url: s.user.avatar_url });
      }
      // Prefer consistent place name if available
      if (!entry.name && name) entry.name = name;
      groups.set(locId, entry);
    });
    return groups;
  }, [shares]);

  // Notify parent of count changes
  useEffect(() => {
    onCountChange?.(grouped.size);
  }, [grouped.size, onCountChange]);

  useEffect(() => {
    // Maintain global overlay state correctly
    if (open) {
      window.dispatchEvent(new CustomEvent('ui:overlay-open'));
    } else if (parentOverlayOpen) {
      // Keep hidden if parent (location list) is still open
      window.dispatchEvent(new CustomEvent('ui:overlay-open'));
    } else {
      window.dispatchEvent(new CustomEvent('ui:overlay-close'));
    }
  }, [open, parentOverlayOpen]);

  const handleSelect = (locKey: string, shareData: ShareData) => {
    // Pass both locKey and shareData so parent can construct place if not found
    onSelectLocation(locKey, shareData);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl flex flex-col pb-safe z-[150]">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-xl font-semibold flex items-center gap-2">
            {t('activeShares', { ns: 'mapFilters' })}
            {grouped.size > 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-white text-xs font-bold">
                {grouped.size}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-6 px-6 scrollbar-hide">
          <div className="space-y-3 pr-4 py-2">
            {Array.from(grouped.entries()).map(([locKey, info]) => {
              // Resolve place name from places by id if possible
              const match = places.find(p => p.id === locKey || p.google_place_id === locKey);
              const name = match?.name || info.name;
              return (
              <div
                  key={locKey}
                  onClick={() => handleSelect(locKey, info.shareData)}
                  className="w-full flex items-center gap-3 p-4 bg-card border-2 border-border rounded-2xl hover:border-primary/50 hover:shadow-md transition-all text-left cursor-pointer"
                >
                  <div className="flex -space-x-1 shrink-0">
                    {info.shareUsers.slice(0, 3).map((u) => (
                      <Avatar key={u.id} className="w-6 h-6 ring-1 ring-purple-500 border-2 border-background">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback>{u.username?.slice(0, 2)?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                    ))}
                    {info.shareUsers.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center border-2 border-background">
                        +{info.shareUsers.length - 3}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-base text-foreground line-clamp-1">{name}</h4>
                  </div>
                  <Button size="sm" variant="secondary">{t('view', { ns: 'common' })}</Button>
                </div>
              );
            })}
            {grouped.size === 0 && (
              <div className="text-center py-8 text-muted-foreground">{t('noLocations', { ns: 'mapFilters' })}</div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default ActiveSharesListSheet;
