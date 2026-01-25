import React, { useState, useEffect, useMemo } from 'react';
import { useFriendLocationActivity, FriendActivity } from '@/hooks/useFriendLocationActivity';
import saveTagBeen from '@/assets/save-tag-been.png';
import saveTagToTry from '@/assets/save-tag-to-try.png';
import saveTagFavourite from '@/assets/save-tag-favourite.png';
import FriendActivityModal from './FriendActivityModal';
import { haptics } from '@/utils/haptics';

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
  const [cardHeight, setCardHeight] = useState(window.innerHeight * 0.42);
  const [isVisible, setIsVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const [isCardExpanded, setIsCardExpanded] = useState(false);

  // Listen for card height changes
  useEffect(() => {
    const handleCardHeightChange = (e: CustomEvent) => {
      setCardHeight(e.detail.height);
      setIsVisible(e.detail.visible !== false);
      setIsDragging(e.detail.isDragging || false);
      setIsCardExpanded(e.detail.isExpanded || false);
    };

    window.addEventListener('pin-card-height-change', handleCardHeightChange as EventListener);
    return () => {
      window.removeEventListener('pin-card-height-change', handleCardHeightChange as EventListener);
    };
  }, []);

  // Calculate bottom position based on card height
  const bottomPosition = useMemo(() => {
    if (!isVisible) return -100;
    return cardHeight + 16;
  }, [cardHeight, isVisible]);

  // Hide when loading, no activities, or card is fully expanded
  if (loading || activities.length === 0 || isCardExpanded) {
    return null;
  }

  const visibleActivities = activities.slice(0, maxVisible);
  const remainingCount = activities.length - maxVisible;

  // Handle individual avatar click with conditional logic
  const handleAvatarClick = (activity: FriendActivity, e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.impact('light');
    
    // If has post/review -> expand card and scroll to content
    if (activity.actionType === 'posted' || activity.actionType === 'review') {
      if (activity.actionType === 'review') {
        window.dispatchEvent(new CustomEvent('pin-scroll-to-review', {
          detail: { locationId, googlePlaceId, userId: activity.userId }
        }));
      } else if (activity.postId) {
        window.dispatchEvent(new CustomEvent('pin-scroll-to-post', {
          detail: { locationId, googlePlaceId, postId: activity.postId }
        }));
      }
    } else {
      // Saved/Been/Favourite/Liked -> Open SavedByModal
      window.dispatchEvent(new CustomEvent('pin-open-saved-by', {
        detail: { locationId, googlePlaceId }
      }));
    }
  };

  // Handle "+N" indicator click - opens full modal
  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.impact('light');
    setShowModal(true);
    onPress?.();
  };

  return (
    <>
      <div 
        className="fixed left-5 z-[1999] flex items-center gap-1"
        style={{
          bottom: `${bottomPosition}px`,
          opacity: isVisible ? 1 : 0,
          pointerEvents: isVisible ? 'auto' : 'none',
          transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: isDragging 
            ? 'none' 
            : 'bottom 0.3s ease-out, opacity 0.25s ease-out, transform 0.25s ease-out',
          animation: isVisible && !isDragging ? 'friendStackFloat 3s ease-in-out infinite' : 'none'
        }}
      >
        {/* Avatar stack */}
        <div className="flex -space-x-2 relative">
          {visibleActivities.map((activity, index) => (
            <div 
              key={activity.userId}
              className="relative cursor-pointer"
              style={{ 
                zIndex: maxVisible - index,
                animation: `avatarPop 0.25s ease-out ${0.05 * index}s both`
              }}
              onClick={(e) => handleAvatarClick(activity, e)}
            >
              {/* Speech bubble - ONLY for first avatar with snippet */}
              {index === 0 && activity.snippet && (
                <div 
                  className="absolute bottom-full left-0 mb-1.5 z-10"
                  style={{ animation: 'bubbleFadeIn 0.4s ease-out 0.2s both' }}
                >
                  <div className="bg-background/95 backdrop-blur-sm rounded-xl px-2.5 py-1.5 shadow-lg min-w-[80px] max-w-[140px] border border-border/50">
                    <span className="text-[10px] text-foreground leading-tight block text-left" style={{ textWrap: 'balance' } as React.CSSProperties}>
                      {activity.hasRealSnippet ? `"${activity.snippet}"` : activity.snippet}
                    </span>
                    {/* Triangle pointer - pointing down to avatar */}
                    <div className="absolute -bottom-1.5 left-4 w-0 h-0 
                      border-l-[6px] border-l-transparent 
                      border-r-[6px] border-r-transparent 
                      border-t-[6px] border-t-background/95" 
                    />
                  </div>
                </div>
              )}

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full border-2 border-background shadow-lg overflow-hidden bg-muted">
                {activity.avatarUrl ? (
                  <img 
                    src={activity.avatarUrl} 
                    alt={activity.username}
                    className="w-full h-full object-cover"
                    loading="eager"
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
              className="w-10 h-10 rounded-full bg-muted/90 backdrop-blur-sm border-2 border-background shadow-lg flex items-center justify-center cursor-pointer"
              style={{ animation: 'avatarPop 0.4s ease-out 0.4s both' }}
              onClick={handleMoreClick}
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
            transform: scale(0.7);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes bubbleFadeIn {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default FriendActivityStack;
