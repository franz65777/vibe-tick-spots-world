import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FriendActivity } from '@/hooks/useFriendLocationActivity';
import { useNavigate } from 'react-router-dom';
import saveTagBeen from '@/assets/save-tag-been.png';
import saveTagToTry from '@/assets/save-tag-to-try.png';
import saveTagFavourite from '@/assets/save-tag-favourite.png';

interface FriendActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: FriendActivity[];
  locationName?: string;
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

// Get action label
const getActionLabel = (activity: FriendActivity): string => {
  switch (activity.actionType) {
    case 'review':
      return 'reviewed';
    case 'posted':
      return 'posted';
    case 'favourite':
      return 'favourited';
    case 'been':
      return 'has been';
    case 'saved':
      return 'saved';
    case 'liked':
      return 'liked';
    default:
      return 'interacted';
  }
};

const FriendActivityModal: React.FC<FriendActivityModalProps> = ({
  open,
  onOpenChange,
  activities,
  locationName
}) => {
  const navigate = useNavigate();

  const handleUserClick = (userId: string) => {
    onOpenChange(false);
    navigate(`/profile/${userId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b border-border/50">
          <DialogTitle className="text-base font-semibold text-center">
            Friends at {locationName || 'this spot'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-y-auto p-3">
          <div className="grid grid-cols-3 gap-3">
            {activities.map((activity) => (
              <button
                key={activity.userId}
                onClick={() => handleUserClick(activity.userId)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-muted/50 transition-colors"
              >
                {/* Avatar with badge */}
                <div className="relative">
                  <div className="w-16 h-16 rounded-[20px] overflow-hidden bg-muted shadow-md">
                    {activity.avatarUrl ? (
                      <img 
                        src={activity.avatarUrl} 
                        alt={activity.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-xl">
                        {activity.username[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  
                  {/* Action badge */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border border-border/30 shadow-sm flex items-center justify-center">
                    <img 
                      src={getActivityBadgeIcon(activity)} 
                      alt="" 
                      className="w-4 h-4 object-contain"
                    />
                  </div>
                </div>
                
                {/* Username */}
                <span className="text-xs font-medium text-foreground truncate max-w-full">
                  {activity.username}
                </span>
                
                {/* Action label */}
                <span className="text-[10px] text-muted-foreground">
                  {getActionLabel(activity)}
                </span>
                
                {/* Snippet preview if available */}
                {activity.snippet && (
                  <p className="text-[9px] text-muted-foreground/70 line-clamp-2 text-center leading-tight">
                    "{activity.snippet}"
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FriendActivityModal;
