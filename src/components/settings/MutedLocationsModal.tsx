import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { BellOff, ArrowLeft, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMutedLocations } from '@/hooks/useMutedLocations';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategoryImage } from '@/utils/categoryIcons';

interface MutedLocationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MutedLocationsModal: React.FC<MutedLocationsModalProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { mutedLocations, isLoading, unmuteLocation, isMuting } = useMutedLocations(user?.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-full p-0 [&>button]:hidden">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center gap-3">
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
          ) : mutedLocations && mutedLocations.length > 0 ? (
            mutedLocations.map((muted: any) => (
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
                  <h3 className="font-medium truncate mb-1">{muted.locations?.name}</h3>
                  {muted.locations?.address && (
                    <p className="text-sm text-muted-foreground truncate">
                      {muted.locations.address}
                    </p>
                  )}
                  {muted.locations?.city && (
                    <p className="text-xs text-muted-foreground">{muted.locations.city}</p>
                  )}
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
              <p className="text-muted-foreground">{t('noMutedLocations', { ns: 'settings' })}</p>
            </div>
          )}
        </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MutedLocationsModal;
