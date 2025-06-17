
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';

interface Follower {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

interface FollowersListProps {
  followers: Follower[];
  title: string;
}

const FollowersList = ({ followers, title }: FollowersListProps) => {
  const navigate = useNavigate();

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-3">
        {followers.map((follower) => (
          <button
            key={follower.id}
            onClick={() => handleUserClick(follower.id)}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 p-1">
              <div className="w-full h-full rounded-full bg-white p-1">
                <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {follower.avatar_url ? (
                    <img 
                      src={follower.avatar_url} 
                      alt={follower.username}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-gray-600">
                      {getInitials(follower.full_name || follower.username)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{follower.username}</p>
              {follower.full_name && (
                <p className="text-sm text-gray-500 truncate">{follower.full_name}</p>
              )}
            </div>
            
            <User className="w-5 h-5 text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default FollowersList;
