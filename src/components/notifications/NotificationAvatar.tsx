import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

interface GroupedUser {
  id: string;
  name: string;
  avatar?: string;
}

interface NotificationAvatarProps {
  type: string;
  groupedUsers?: GroupedUser[];
  groupedUserOverrides?: Record<string, { name: string; avatar?: string }>;
  avatarUrl: string | null;
  displayUsername: string;
  hasActiveStory: boolean;
  targetUserId: string | null;
  onAvatarClick: (e: React.MouseEvent) => void;
}

const NotificationAvatar = memo(({
  type,
  groupedUsers,
  groupedUserOverrides = {},
  avatarUrl,
  displayUsername,
  hasActiveStory,
  targetUserId,
  onAvatarClick
}: NotificationAvatarProps) => {
  const navigate = useNavigate();

  // For grouped likes, show multiple avatars
  if (type === 'like' && groupedUsers && groupedUsers.length > 1) {
    const usersToShow = groupedUsers.slice(0, 3); // Show max 3 avatars
    return (
      <div className="flex -space-x-2 flex-shrink-0">
        {usersToShow.map((user, index) => {
          const override = groupedUserOverrides[user.id];
          const avatar = override?.avatar || user.avatar;
          const name = override?.name || user.name;
          
          return (
            <div 
              key={user.id}
              className="w-8 h-8 rounded-full border-2 border-background cursor-pointer relative overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0"
              style={{ zIndex: usersToShow.length - index }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (user.id) navigate(`/profile/${user.id}`);
              }}
              data-avatar-click="true"
            >
              {avatar ? (
                <img 
                  src={avatar} 
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-primary font-semibold text-xs">
                  {name?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Single avatar
  return (
    <div 
      className={`w-11 h-11 rounded-full border-2 ${hasActiveStory ? 'border-primary' : 'border-background'} cursor-pointer flex-shrink-0 overflow-hidden bg-primary/10 flex items-center justify-center`}
      onClick={onAvatarClick}
      data-avatar-click="true"
    >
      {avatarUrl ? (
        <img 
          src={avatarUrl} 
          alt={displayUsername}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-primary font-semibold text-sm">
          {(displayUsername?.[0] || '?').toUpperCase()}
        </span>
      )}
    </div>
  );
});

NotificationAvatar.displayName = 'NotificationAvatar';

export default NotificationAvatar;
