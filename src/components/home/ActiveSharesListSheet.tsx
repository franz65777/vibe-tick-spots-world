import React, { useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useLocationShares } from '@/hooks/useLocationShares';
import { useTranslation } from 'react-i18next';
import { Place } from '@/types/place';

interface ActiveSharesListSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  places: Place[];
  onSelectLocation: (placeId: string) => void;
}

const ActiveSharesListSheet: React.FC<ActiveSharesListSheetProps> = ({ open, onOpenChange, places, onSelectLocation }) => {
  const { t } = useTranslation();
  const { shares } = useLocationShares();

  // Group active shares by location_id
  const grouped = useMemo(() => {
    const now = new Date();
    const groups = new Map<string, { name: string; shareUsers: { id: string; username: string; avatar_url: string | null }[] }>();

    shares.forEach((s) => {
      try {
        if (new Date(s.expires_at) <= now) return; // only active
      } catch { return; }
      const locId = s.location_id ?? `__geo__:${s.latitude.toFixed(5)},${s.longitude.toFixed(5)}`;
      const name = s.location_name || `${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}`;
      const entry = groups.get(locId) || { name, shareUsers: [] };
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

  useEffect(() => {
    // Hide bottom navigation while open
    if (open) {
      window.dispatchEvent(new CustomEvent('ui:overlay-open'));
    } else {
      window.dispatchEvent(new CustomEvent('ui:overlay-close'));
    }
  }, [open]);

  const handleSelect = (locKey: string) => {
    // If locKey is a real place id, use it; if geo fallback, try to find nearest place
    onSelectLocation(locKey);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl flex flex-col">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-xl font-semibold">{t('activeShares', { ns: 'mapFilters' })}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-3 pr-4 py-2">
            {Array.from(grouped.entries()).map(([locKey, info]) => {
              // Resolve place name from places by id if possible
              const match = places.find(p => p.id === locKey);
              const name = match?.name || info.name;
              return (
                <button
                  key={locKey}
                  onClick={() => handleSelect(locKey)}
                  className="w-full flex items-center gap-3 p-4 bg-card border-2 border-border rounded-2xl hover:border-primary/50 hover:shadow-md transition-all text-left"
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
                  <Button size="sm" variant="secondary">{t('view', { ns: 'common', defaultValue: 'View' })}</Button>
                </button>
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
