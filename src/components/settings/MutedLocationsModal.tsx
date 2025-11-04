import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BellOff, ArrowLeft, Bell, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMutedLocations } from '@/hooks/useMutedLocations';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategoryImage } from '@/utils/categoryIcons';
import { formatDetailedAddress } from '@/utils/addressFormatter';

interface MutedLocationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MutedLocationsModal: React.FC<MutedLocationsModalProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { mutedLocations, isLoading, unmuteLocation, isMuting } = useMutedLocations(user?.id);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLocations = useMemo(() => {
    if (!mutedLocations || !searchQuery.trim()) return mutedLocations;
    
    const query = searchQuery.toLowerCase();
    return mutedLocations.filter((muted: any) => 
      muted.locations?.name?.toLowerCase().includes(query) ||
      muted.locations?.address?.toLowerCase().includes(query) ||
      muted.locations?.city?.toLowerCase().includes(query)
    );
  }, [mutedLocations, searchQuery]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-full p-0 [&>button]:hidden">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <SheetTitle className="flex items-center gap-2">
                <BellOff className="w-5 h-5" />
                {t('mutedLocations', { ns: 'settings' })}
              </SheetTitle>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('searchMutedLocations', { ns: 'settings', defaultValue: 'Search muted locations...' })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-full"
              />
            </div>
          </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-3 p-4">
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-9 w-20" />
                </div>
              ))}
            </>
          ) : filteredLocations && filteredLocations.length > 0 ? (
            filteredLocations.map((muted: any) => (
              <div
                key={muted.id}
                className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <img 
                  src={getCategoryImage(muted.locations?.category || 'restaurant')} 
                  alt={muted.locations?.category}
                  className="w-12 h-12 object-contain flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate mb-1">
                    {muted.locations?.name || 'Unknown Location'}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {formatDetailedAddress({
                      city: muted.locations?.city,
                      address: muted.locations?.address,
                      coordinates: muted.locations ? {
                        lat: muted.locations.latitude,
                        lng: muted.locations.longitude
                      } : null
                    })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unmuteLocation(muted.location_id)}
                  disabled={isMuting}
                  className="flex-shrink-0"
                >
                  <Bell className="w-4 h-4" />
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <BellOff className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {searchQuery.trim() 
                  ? t('noSearchResults', { ns: 'settings', defaultValue: 'No locations found' })
                  : t('noMutedLocations', { ns: 'settings' })
                }
              </p>
            </div>
          )}
        </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MutedLocationsModal;
