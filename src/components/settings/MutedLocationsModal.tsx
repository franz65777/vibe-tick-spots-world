import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BellOff, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMutedLocations } from '@/hooks/useMutedLocations';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface MutedLocationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MutedLocationsModal: React.FC<MutedLocationsModalProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { mutedLocations, isLoading, unmuteLocation, isMuting } = useMutedLocations(user?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5" />
            {t('mutedLocations', { ns: 'settings' })}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-4">
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
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <h3 className="font-medium truncate">{muted.locations?.name}</h3>
                  </div>
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
                  <BellOff className="w-4 h-4 mr-1" />
                  {t('muted', { ns: 'settings' })}
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
      </DialogContent>
    </Dialog>
  );
};

export default MutedLocationsModal;
