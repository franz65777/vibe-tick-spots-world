import React from 'react';
import { useFriendLocationActivity, FriendActivity } from '@/hooks/useFriendLocationActivity';
import saveTagBeen from '@/assets/save-tag-been.png';
import saveTagToTry from '@/assets/save-tag-to-try.png';
import saveTagFavourite from '@/assets/save-tag-favourite.png';

interface FriendActivityStackProps {
  locationId: string | null;
  googlePlaceId?: string | null;
  maxVisible?: number;
  onPress?: () => void;
}

// Get the appropriate icon based on action type
const getActivityBadgeIcon = (activity: FriendActivity): string => {
  // For review/favourite use star
  if (activity.actionType === 'review' || activity.actionType === 'favourite' || activity.saveTag === 'favourite') {
    return saveTagFavourite;
  }
  // For been use eyes
  if (activity.actionType === 'been' || activity.saveTag === 'been') {
    return saveTagToTry;
  }
  // For saved/to_try/posted use pushpin
  return saveTagBeen;
};

const FriendActivityStack: React.FC<FriendActivityStackProps> = ({
  locationId,
  googlePlaceId,
  maxVisible = 3,
  onPress
}) => {
  const { activities, loading } = useFriendLocationActivity(locationId, googlePlaceId);

  if (loading || activities.length === 0) {
    return null;
  }

  const visibleActivities = activities.slice(0, maxVisible);
  const remainingCount = activities.length - maxVisible;

  // Get the first activity with a snippet (for the bubble)
  const activityWithSnippet = visibleActivities.find(a => a.snippet);

  return (
    <div 
      className="fixed left-4 z-[1999] flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300"
      style={{ 
        bottom: 'calc(42vh + 16px)',
      }}
      onClick={onPress}
    >
      {/* Avatar stack */}
      <div className="flex -space-x-2 relative">
        {/* Speech bubble with snippet - shown above the first avatar */}
        {activityWithSnippet && (
          <div className="absolute -top-14 left-0 z-10">
            <div className="bg-background/95 backdrop-blur-sm rounded-xl px-2.5 py-1.5 shadow-lg max-w-[120px] border border-border/50">
              <span className="text-[10px] text-foreground leading-tight line-clamp-2">
                "{activityWithSnippet.snippet}"
              </span>
              {/* Triangle pointer */}
              <div className="absolute -bottom-1.5 left-4 w-0 h-0 
                border-l-[6px] border-l-transparent 
                border-r-[6px] border-r-transparent 
                border-t-[6px] border-t-background/95" 
              />
            </div>
          </div>
        )}

        {visibleActivities.map((activity, index) => (
          <div 
            key={activity.userId}
            className="relative"
            style={{ zIndex: maxVisible - index }}
          >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full border-2 border-background shadow-lg overflow-hidden bg-muted">
              {activity.avatarUrl ? (
                <img 
                  src={activity.avatarUrl} 
                  alt={activity.username}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '';
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-semibold text-sm">
                  {activity.username[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            
            {/* Action badge - bottom right of avatar with PNG icon */}
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-background border border-border/30 shadow-sm flex items-center justify-center overflow-hidden">
              <img 
                src={getActivityBadgeIcon(activity)} 
                alt="" 
                className="w-3.5 h-3.5 object-contain"
              />
            </div>
          </div>
        ))}

        {/* "+N" indicator if there are more activities */}
        {remainingCount > 0 && (
          <div className="w-10 h-10 rounded-full bg-muted/90 backdrop-blur-sm border-2 border-background shadow-lg flex items-center justify-center">
            <span className="text-xs font-semibold text-muted-foreground">
              +{remainingCount}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendActivityStack;
