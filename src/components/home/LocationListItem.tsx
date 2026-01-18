import { ChevronRight, MapPin, Bookmark, Star } from 'lucide-react';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { useLocationStats } from '@/hooks/useLocationStats';
import { getRatingColor, getRatingFillColor } from '@/utils/ratingColors';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import saveTagBeen from '@/assets/save-tag-been.png';
import saveTagToTry from '@/assets/save-tag-to-try.png';
import saveTagFavourite from '@/assets/save-tag-favourite.png';
import { Place } from '@/types/place';
import { formatSearchResultAddress } from '@/utils/addressFormatter';

// Map tag values to imported icons
const TAG_ICONS: Record<string, string> = {
  been: saveTagBeen,
  to_try: saveTagToTry,
  favourite: saveTagFavourite,
};

interface LocationListItemProps {
  place: Place;
  enrichedAddress?: string;
  onClick: () => void;
}

export const LocationListItem = ({ place, enrichedAddress, onClick }: LocationListItemProps) => {
  const { stats } = useLocationStats(place.id, place.google_place_id);
  const { t } = useTranslation();
  
  const saveTag = (place as any).saveTag;

  const displayAddress = (() => {
    const rawAddress = place.address || enrichedAddress || '';
    if (!rawAddress) return null;
    return formatSearchResultAddress({
      name: place.name,
      address: rawAddress,
      city: place.city,
    });
  })();

  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-3 p-3 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/30 cursor-pointer transition-all duration-200 hover:bg-accent/50 hover:border-border/50 hover:shadow-md active:scale-[0.98]"
    >
      {/* Thumbnail / Category Icon */}
      <div className="relative flex-shrink-0 w-14 h-14 rounded-xl bg-muted/80 flex items-center justify-center overflow-hidden">
        {place.photos && place.photos.length > 0 ? (
          <img 
            src={place.photos[0]} 
            alt={place.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <CategoryIcon 
            category={place.category} 
            className="w-8 h-8"
            sizeMultiplier={place.category.toLowerCase() === 'restaurant' ? 0.75 : 1}
          />
        )}
        {/* Save tag badge overlay */}
        {saveTag && TAG_ICONS[saveTag] && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-background shadow-sm flex items-center justify-center">
            <img src={TAG_ICONS[saveTag]} alt="" className="w-3.5 h-3.5 object-contain" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground text-[15px] truncate">
            {place.name}
          </h3>
        </div>
        
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-muted-foreground capitalize truncate">
            {place.category}
          </span>
          {place.city && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-xs text-muted-foreground truncate">
                {place.city}
              </span>
            </>
          )}
        </div>
        
        {displayAddress && (
          <p className="text-xs text-muted-foreground/70 mt-1 truncate flex items-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {displayAddress}
          </p>
        )}
      </div>

      {/* Right side - Stats & Chevron */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Rating badge */}
        {stats.averageRating && stats.averageRating > 0 && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
            getRatingFillColor(stats.averageRating) + "/15"
          )}>
            <Star className={cn("w-3 h-3 fill-current", getRatingColor(stats.averageRating))} />
            <span className={getRatingColor(stats.averageRating)}>
              {stats.averageRating.toFixed(1)}
            </span>
          </div>
        )}
        
        {/* Saves count */}
        {stats.totalSaves > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground/60">
            <Bookmark className="w-3.5 h-3.5" />
            <span className="text-xs">{stats.totalSaves}</span>
          </div>
        )}
        
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
      </div>
    </div>
  );
};

// Skeleton loader for list items
export const LocationListItemSkeleton = () => (
  <div className="flex items-center gap-3 p-3 rounded-2xl bg-card/50 border border-border/30">
    <Skeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
    <div className="flex-1 min-w-0 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
    <Skeleton className="w-4 h-4 rounded-full flex-shrink-0" />
  </div>
);

// Empty state component
export const LocationListEmpty = () => {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <MapPin className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">
        {t('noLocationsFound', { ns: 'common', defaultValue: 'No locations found' })}
      </h3>
      <p className="text-sm text-muted-foreground max-w-[250px]">
        {t('tryChangingFilters', { ns: 'common', defaultValue: 'Try changing your filters or exploring a different area' })}
      </p>
    </div>
  );
};
