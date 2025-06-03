import { useState } from 'react';
import { ArrowLeft, MoreHorizontal, Bookmark, MapPin, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState('saved');
  const { profile, loading, error } = useProfile();
  const { user } = useAuth();

  const stats = [
    { label: 'Posts', value: '120' },
    { label: 'Followers', value: '1.5K' },
    { label: 'Following', value: '300' },
  ];

  const travelStats = [
    { label: 'Countries', value: '24', icon: '✈️' },
    { label: 'Cities', value: '87', icon: '📍' },
    { label: 'Places', value: '156', icon: '🔍' },
  ];

  const achievements = [
    { name: 'Top Reviewer', level: 3, icon: '⭐', color: 'bg-yellow-100 border-yellow-200' },
    { name: 'Foodie', level: 2, icon: '🍽️', color: 'bg-orange-100 border-orange-200' },
    { name: 'Explorer', level: 4, icon: '🧭', color: 'bg-green-100 border-green-200' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center justify-center h-64">
          <p className="text-red-600">Error loading profile: {error}</p>
        </div>
      </div>
    );
  }

  // Generate initials from username or full name
  const getInitials = () => {
    if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase();
    }
    if (profile?.full_name) {
      return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const displayUsername = profile?.username || user?.email?.split('@')[0] || 'user';
  const displayFullName = profile?.full_name;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
          <MoreHorizontal className="w-6 h-6 text-gray-600" />
        </div>

        {/* Profile Info */}
        <div className="flex items-start gap-4 mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 p-1">
              <div className="w-full h-full rounded-full bg-white p-1">
                <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={displayUsername}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-gray-600">{getInitials()}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="absolute bottom-1 right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{displayUsername}</h1>
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1 rounded-full">
                Elite
              </Button>
            </div>
            {displayFullName && (
              <p className="text-gray-600 text-sm mb-2">{displayFullName}</p>
            )}
            <p className="text-gray-700 text-sm">
              {profile?.bio || 'Travel Enthusiast | Food Lover | Photographer'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Travel Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
          {travelStats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-lg font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          <button
            onClick={() => setActiveTab('saved')}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
              activeTab === 'saved'
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600"
            )}
          >
            <Bookmark className="w-4 h-4" />
            Saved
          </button>
          <button
            onClick={() => setActiveTab('trips')}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
              activeTab === 'trips'
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600"
            )}
          >
            <MapPin className="w-4 h-4" />
            Trips
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
              activeTab === 'posts'
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600"
            )}
          >
            <Grid3X3 className="w-4 h-4" />
            Posts
          </button>
        </div>
      </div>

      {/* Achievements Section */}
      <div className="px-4 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Achievements</h2>
          <span className="text-sm text-blue-600 font-medium">View All</span>
        </div>
        
        <div className="flex gap-4">
          {achievements.map((achievement, index) => (
            <div key={index} className={`flex flex-col items-center p-3 rounded-xl border-2 ${achievement.color} min-w-[80px]`}>
              <div className="text-2xl mb-1 relative">
                {achievement.icon}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">{achievement.level}</span>
                </div>
              </div>
              <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                {achievement.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-100 rounded-xl h-32 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-400 opacity-60"></div>
          </div>
          <div className="bg-gray-100 rounded-xl h-32 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-60"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
