
import React from 'react';
import { Trophy, Grid3X3 } from 'lucide-react';
import { useUserBadges } from '@/hooks/useUserBadges';
import { useProfile } from '@/hooks/useProfile';
import { useParams } from 'react-router-dom';

const Achievements = () => {
  const { userId } = useParams<{ userId: string }>();
  const { profile } = useProfile();
  
  // Use userId from params if viewing another user's profile, otherwise use current user's profile
  const targetUserId = userId || profile?.id;
  const { badges, loading } = useUserBadges(targetUserId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Trophy className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No badges yet</h3>
        <p className="text-gray-600 text-sm">Complete activities to earn your first badge!</p>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="grid grid-cols-2 gap-4">
        {badges.map((userBadge) => (
          <div
            key={userBadge.id}
            className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:shadow-md transition-shadow"
          >
            <div className="text-4xl mb-3">{userBadge.badge.icon}</div>
            <h3 className="font-semibold text-gray-900 mb-1 text-sm">{userBadge.badge.name}</h3>
            <p className="text-gray-600 text-xs mb-2 line-clamp-2">{userBadge.badge.description}</p>
            <div className="text-xs text-gray-500">
              Earned {new Date(userBadge.earned_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Achievements;
