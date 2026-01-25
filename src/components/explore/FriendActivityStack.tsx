import React from 'react';
import { useFriendLocationActivity, FriendActivity } from '@/hooks/useFriendLocationActivity';
import { MapPin, Eye, Star, ThumbsUp, Camera } from 'lucide-react';

interface FriendActivityStackProps {
  locationId: string | null;
  googlePlaceId?: string | null;
  maxVisible?: number;
  onPress?: () => void;
}

// Get the appropriate icon component based on action type
const getActivityIcon = (activity: FriendActivity) => {
  // For saves, use saveTag to determine icon
  if (activity.actionType === 'saved' || activity.saveTag) {
    switch (activity.saveTag) {
      case 'favourite':
        return <Star className="w-3 h-3 text-amber-400 fill-amber-400" />;
      case 'been':
        return <Eye className="w-3 h-3 text-blue-500" />;
      case 'to_try':
      default:
        return <MapPin className="w-3 h-3 text-blue-500 fill-blue-500" />;
    }
  }
  
  // For other action types
  switch (activity.actionType) {
    case 'favourite':
    case 'review':
      return <Star className="w-3 h-3 text-amber-400 fill-amber-400" />;
    case 'been':
      return <Eye className="w-3 h-3 text-blue-500" />;
    case 'liked':
      return <ThumbsUp className="w-3 h-3 text-blue-500 fill-blue-500" />;
    case 'posted':
      return <Camera className="w-3 h-3 text-blue-500" />;
    default:
      return <MapPin className="w-3 h-3 text-blue-500 fill-blue-500" />;
  }
};

// Get background color for badge based on action
const getBadgeBackground = (activity: FriendActivity): string => {
  if (activity.actionType === 'favourite' || activity.saveTag === 'favourite' || activity.actionType === 'review') {
    return 'bg-amber-50 dark:bg-amber-900/30';
  }
  return 'bg-blue-50 dark:bg-blue-900/30';
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

  return (
    <div 
      className="fixed left-4 z-[1999] flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300"
      style={{ 
        bottom: 'calc(42vh + 16px)',
      }}
      onClick={onPress}
    >
      {/* Avatar stack */}
      <div className="flex -space-x-2">
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
            
            {/* Action badge - bottom right of avatar */}
            <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ${getBadgeBackground(activity)} border-2 border-background shadow-sm flex items-center justify-center`}>
              {getActivityIcon(activity)}
            </div>
          </div>
        ))}
      </div>

      {/* "+N" indicator if there are more activities */}
      {remainingCount > 0 && (
        <div className="w-8 h-8 rounded-full bg-muted/80 backdrop-blur-sm border border-border/50 shadow-md flex items-center justify-center -ml-1">
          <span className="text-xs font-semibold text-muted-foreground">
            +{remainingCount}
          </span>
        </div>
      )}
    </div>
  );
};

export default FriendActivityStack;
