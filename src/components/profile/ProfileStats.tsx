
import { useState } from 'react';

interface ProfileStatsProps {
  onFollowersClick: () => void;
  onFollowingClick: () => void;
  onPostsClick: () => void;
}

const ProfileStats = ({ onFollowersClick, onFollowingClick, onPostsClick }: ProfileStatsProps) => {
  // Demo data - in real app, these would come from the database
  const stats = [
    { label: 'Posts', value: '47', onClick: onPostsClick },
    { label: 'Followers', value: '2.3K', onClick: onFollowersClick },
    { label: 'Following', value: '892', onClick: onFollowingClick },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 mb-6 px-4">
      {stats.map((stat, index) => (
        <button
          key={index}
          onClick={stat.onClick}
          className="text-center hover:bg-gray-50 rounded-lg p-2 transition-colors"
        >
          <div className="text-xl font-bold text-gray-900">{stat.value}</div>
          <div className="text-sm text-gray-600">{stat.label}</div>
        </button>
      ))}
    </div>
  );
};

export default ProfileStats;
