import React, { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface RecentUser {
  id: string;
  username: string;
  avatar_url: string | null;
  searched_at: string;
  has_active_story?: boolean;
}

const RecentUserSearches = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);

  useEffect(() => {
    loadRecentSearches();
  }, [user]);

  const loadRecentSearches = async () => {
    if (!user) return;

    try {
      // Get recent user searches by target_user_id
      const { data: searchHistory } = await supabase
        .from('search_history')
        .select('target_user_id, searched_at')
        .eq('user_id', user.id)
        .eq('search_type', 'users')
        .not('target_user_id', 'is', null)
        .order('searched_at', { ascending: false })
        .limit(10);

      if (!searchHistory || searchHistory.length === 0) {
        setRecentUsers([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(searchHistory.map(s => s.target_user_id).filter(Boolean))];

      if (userIds.length === 0) {
        setRecentUsers([]);
        return;
      }

      // Fetch user profiles by ID
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds)
        .limit(10);

      if (!profiles) {
        setRecentUsers([]);
        return;
      }

      // Check for active stories (created in last 24h)
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: stories } = await supabase
        .from('stories')
        .select('user_id')
        .in('user_id', profiles.map(p => p.id))
        .gt('created_at', dayAgo);

      const userIdsWithStories = new Set(stories?.map(s => s.user_id) || []);

      // Map with search dates and story status
      const usersWithData = profiles.map(profile => {
        const searchRecord = searchHistory.find(s => s.target_user_id === profile.id);
        return {
          ...profile,
          searched_at: searchRecord?.searched_at || new Date().toISOString(),
          has_active_story: userIdsWithStories.has(profile.id)
        };
      });

      // Sort by most recent search
      usersWithData.sort((a, b) => 
        new Date(b.searched_at).getTime() - new Date(a.searched_at).getTime()
      );

      setRecentUsers(usersWithData);
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const handleRemoveSearch = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      // Remove from search history by target_user_id
      await supabase
        .from('search_history')
        .delete()
        .eq('user_id', user.id)
        .eq('target_user_id', userId)
        .eq('search_type', 'users');

      // Update local state
      setRecentUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error removing search:', error);
    }
  };

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  if (recentUsers.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Recent</h3>
      </div>
      
      <div className="space-y-2">
        {recentUsers.map((user) => (
          <div
            key={user.id}
            onClick={() => handleUserClick(user.id)}
            className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors group"
          >
            <div className="relative flex-shrink-0">
              <Avatar className="w-12 h-12">
                <AvatarImage src={user.avatar_url || ''} />
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-400 text-white">
                  {user.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {user.has_active_story && (
                <div className="absolute inset-0 rounded-full border-2 border-purple-500"></div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user.username}
              </p>
            </div>

            <button
              onClick={(e) => handleRemoveSearch(user.id, e)}
              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded-full transition-all"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentUserSearches;
