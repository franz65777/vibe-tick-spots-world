import React, { useState } from 'react';
import { useFriendLocationActivity, FriendActivity } from '@/hooks/useFriendLocationActivity';
import saveTagBeen from '@/assets/save-tag-been.png';
import saveTagToTry from '@/assets/save-tag-to-try.png';
import saveTagFavourite from '@/assets/save-tag-favourite.png';
import FriendActivityModal from './FriendActivityModal';

interface FriendActivityStackProps {
  locationId: string | null;
  googlePlaceId?: string | null;
  locationName?: string;
  maxVisible?: number;
  onPress?: () => void;
}

// Get the appropriate icon based on action type
const getActivityBadgeIcon = (activity: FriendActivity): string => {
  if (activity.actionType === 'review' || activity.actionType === 'favourite' || activity.saveTag === 'favourite') {
    return saveTagFavourite;
  }
  if (activity.actionType === 'been' || activity.saveTag === 'been') {
    return saveTagToTry;
  }
  return saveTagBeen;
};

const FriendActivityStack: React.FC<FriendActivityStackProps> = ({
  locationId,
  googlePlaceId,
  locationName,
  maxVisible = 3,
  onPress
}) => {
  const { activities, loading } = useFriendLocationActivity(locationId, googlePlaceId);
  const [showModal, setShowModal] = useState(false);

  if (loading || activities.length === 0) {
    return null;
  }

  const visibleActivities = activities.slice(0, maxVisible);
  const remainingCount = activities.length - maxVisible;

  // Get the first activity with a snippet (for the bubble)
  const activityWithSnippet = visibleActivities.find(a => a.snippet);

  const handleStackClick = () => {
    setShowModal(true);
    onPress?.();
  };

  return (
    <>
      <div 
        className="fixed left-4 z-[1999] flex items-center gap-1 cursor-pointer"
        style={{ 
          bottom: 'calc(42vh + 16px)',
          animation: 'friendStackEnter 0.5s ease-out forwards, friendStackFloat 3s ease-in-out 0.5s infinite'
        }}
        onClick={handleStackClick}
      >
        {/* Avatar stack */}
        <div className="flex -space-x-2 relative">
          {/* Speech bubble with snippet - shown above the first avatar */}
          {activityWithSnippet && activityWithSnippet.snippet && (
            <div 
              className="absolute -top-14 left-0 z-10"
              style={{ animation: 'bubbleFadeIn 0.6s ease-out 0.3s both' }}
            >
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
              style={{ 
                zIndex: maxVisible - index,
                animation: `avatarPop 0.4s ease-out ${0.1 * (index + 1)}s both`
              }}
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
            <div 
              className="w-10 h-10 rounded-full bg-muted/90 backdrop-blur-sm border-2 border-background shadow-lg flex items-center justify-center"
              style={{ animation: 'avatarPop 0.4s ease-out 0.4s both' }}
            >
              <span className="text-xs font-semibold text-muted-foreground">
                +{remainingCount}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modal for all friends */}
      <FriendActivityModal
        open={showModal}
        onOpenChange={setShowModal}
        activities={activities}
        locationName={locationName}
      />

      {/* Inline keyframes for animations */}
      <style>{`
        @keyframes friendStackEnter {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes friendStackFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        
        @keyframes avatarPop {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          70% {
            transform: scale(1.1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes bubbleFadeIn {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default FriendActivityStack;
