import React, { useEffect, useMemo } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useLocationShares } from '@/hooks/useLocationShares';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useTranslation } from 'react-i18next';
import { Place } from '@/types/place';
import { MapPin, Clock, Navigation, Timer, Eye } from 'lucide-react';

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

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + 
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
};

const ActiveSharesListSheet: React.FC<ActiveSharesListSheetProps> = ({ 
  open, 
  onOpenChange, 
  places, 
  onSelectLocation, 
  onCountChange, 
  parentOverlayOpen 
}) => {
  const { t } = useTranslation();
  const { shares } = useLocationShares();
  const { location: userLocation } = useGeolocation();

  // Get time elapsed since share started
  const getTimeElapsed = (createdAt: string): string => {
    const start = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return t('justNow', { ns: 'common', defaultValue: 'Just now' });
    if (diffMins < 60) return `${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}min`;
  };

  // Get time remaining until expiry
  const getTimeRemaining = (expiresAt: string): string => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return t('expiringNow', { ns: 'common', defaultValue: 'Expiring' });
    if (diffMins < 60) return `${diffMins}min`;
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return remainingMins > 0 ? `${diffHours}h ${remainingMins}min` : `${diffHours}h`;
  };

  // Group active shares by location_id and keep share data for fallback
  const grouped = useMemo(() => {
    const now = new Date();
    const groups = new Map<string, { 
      name: string; 
      shareUsers: { id: string; username: string; avatar_url: string | null; createdAt: string; expiresAt: string }[];
      shareData: ShareData;
      earliestCreatedAt: string;
      latestExpiresAt: string;
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
        },
        earliestCreatedAt: s.created_at,
        latestExpiresAt: s.expires_at
      };
      // Avoid duplicates by user id
      if (!entry.shareUsers.find(u => u.id === s.user.id)) {
        entry.shareUsers.push({ 
          id: s.user.id, 
          username: s.user.username, 
          avatar_url: s.user.avatar_url,
          createdAt: s.created_at,
          expiresAt: s.expires_at
        });
      }
      // Track earliest start and latest expiry
      if (new Date(s.created_at) < new Date(entry.earliestCreatedAt)) {
        entry.earliestCreatedAt = s.created_at;
      }
      if (new Date(s.expires_at) > new Date(entry.latestExpiresAt)) {
        entry.latestExpiresAt = s.expires_at;
      }
      // Prefer consistent place name if available
      if (!entry.name && name) entry.name = name;
      groups.set(locId, entry);
    });

    // Sort by distance if user location is available
    if (userLocation?.latitude && userLocation?.longitude) {
      const sorted = Array.from(groups.entries()).sort(([, a], [, b]) => {
        const distA = calculateDistance(
          userLocation.latitude, userLocation.longitude,
          a.shareData.latitude, a.shareData.longitude
        );
        const distB = calculateDistance(
          userLocation.latitude, userLocation.longitude,
          b.shareData.latitude, b.shareData.longitude
        );
        return distA - distB;
      });
      return new Map(sorted);
    }

    return groups;
  }, [shares, userLocation]);

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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent 
        showHandle={true}
        hideOverlay={true}
        className="h-[82vh] flex flex-col z-[150] bg-gray-200/40 dark:bg-slate-800/65 backdrop-blur-md border-t border-border/10 shadow-2xl"
      >
        <DrawerHeader className="pb-2 flex-shrink-0">
          <DrawerTitle className="text-xl font-bold flex items-center gap-2">
            {t('activeShares', { ns: 'mapFilters' })}
            {grouped.size > 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-white text-xs font-bold">
                {grouped.size}
              </span>
            )}
          </DrawerTitle>
        </DrawerHeader>
        
        <ScrollArea className="flex-1 -mx-6 px-6 scrollbar-hide">
          <div className="space-y-3 py-2 pb-8">
            {Array.from(grouped.entries()).map(([locKey, info]) => {
              // Resolve place name from places by id if possible
              const match = places.find(p => p.id === locKey || p.google_place_id === locKey);
              const name = match?.name || info.name;
              
              // Calculate distance from user
              const distance = userLocation?.latitude && userLocation?.longitude
                ? formatDistance(calculateDistance(
                    userLocation.latitude, userLocation.longitude,
                    info.shareData.latitude, info.shareData.longitude
                  ))
                : null;

              const timeElapsed = getTimeElapsed(info.earliestCreatedAt);
              const timeRemaining = getTimeRemaining(info.latestExpiresAt);
              
              // Get first user for primary display
              const primaryUser = info.shareUsers[0];
              
              return (
                <div
                  key={locKey}
                  className="w-full p-4 bg-white/60 dark:bg-slate-700/60 backdrop-blur-lg rounded-2xl border border-border/20 shadow-sm"
                >
                  {/* Header: Avatar + Name + Live Badge */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <Avatar className="w-12 h-12 ring-2 ring-purple-500 ring-offset-2 ring-offset-background">
                        <AvatarImage src={primaryUser.avatar_url || undefined} />
                        <AvatarFallback className="bg-purple-100 text-purple-700 font-semibold">
                          {primaryUser.username?.slice(0, 2)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {/* Live pulse indicator */}
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background animate-pulse" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">
                          {primaryUser.username}
                        </h4>
                        {info.shareUsers.length > 1 && (
                          <span className="text-xs text-muted-foreground">
                            +{info.shareUsers.length - 1}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {t('sharingFor', { ns: 'common', defaultValue: 'Sharing for' })} {timeElapsed}
                      </p>
                    </div>
                    
                    {/* Additional user avatars */}
                    {info.shareUsers.length > 1 && (
                      <div className="flex -space-x-2">
                        {info.shareUsers.slice(1, 4).map((u) => (
                          <Avatar key={u.id} className="w-7 h-7 ring-2 ring-background border border-border/30">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px] bg-muted">
                              {u.username?.slice(0, 2)?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Location Info */}
                  <div className="flex items-center gap-2 mb-3 p-2.5 bg-background/50 rounded-xl">
                    <MapPin className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span className="text-sm font-medium line-clamp-1 flex-1">{name}</span>
                  </div>
                  
                  {/* Stats Row: Distance + Expiry */}
                  <div className="flex items-center justify-between text-sm mb-3">
                    {distance && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                        <Navigation className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span className="font-semibold text-purple-700 dark:text-purple-300">
                          {distance} {t('away', { ns: 'common', defaultValue: 'away' })}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1.5 text-muted-foreground ml-auto">
                      <Timer className="w-3.5 h-3.5" />
                      <span className="text-xs">
                        {timeRemaining} {t('left', { ns: 'common', defaultValue: 'left' })}
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <Button 
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white" 
                    onClick={() => handleSelect(locKey, info.shareData)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {t('viewOnMap', { ns: 'common', defaultValue: 'View on Map' })}
                  </Button>
                </div>
              );
            })}
            
            {grouped.size === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="font-medium">{t('noActiveShares', { ns: 'mapFilters', defaultValue: 'No active shares' })}</p>
                <p className="text-sm mt-1">{t('friendsNotSharing', { ns: 'mapFilters', defaultValue: 'Your friends are not sharing their location' })}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};

export default ActiveSharesListSheet;
