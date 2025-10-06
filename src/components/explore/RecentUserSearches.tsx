import React, { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import StoriesViewer from '@/components/StoriesViewer';

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
  const [viewingStories, setViewingStories] = useState<any[]>([]);
  const [viewingStoriesIndex, setViewingStoriesIndex] = useState(0);

  useEffect(() => {
    loadRecentSearches();
  }, [user]);

  const loadRecentSearches = async () => {
    if (!user) return;

    try {
      // Prefer ID-based history for accuracy
      const { data: idHistory } = await supabase
        .from('search_history')
        .select('target_user_id, searched_at')
        .eq('user_id', user.id)
        .eq('search_type', 'users')
        .not('target_user_id', 'is', null)
        .order('searched_at', { ascending: false })
        .limit(10);

      if (idHistory && idHistory.length > 0) {
        const userIds = [...new Set(idHistory.map(s => s.target_user_id).filter(Boolean))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds)
          .limit(10);

        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: stories } = await supabase
          .from('stories')
          .select('user_id')
          .in('user_id', (profiles || []).map(p => p.id))
          .gt('created_at', dayAgo);
        const userIdsWithStories = new Set(stories?.map(s => s.user_id) || []);

        const usersWithData = (profiles || []).map(profile => {
          const searchRecord = idHistory.find(s => s.target_user_id === profile.id);
          return {
            ...profile,
            searched_at: searchRecord?.searched_at || new Date().toISOString(),
            has_active_story: userIdsWithStories.has(profile.id)
          };
        }).sort((a, b) => new Date(b.searched_at).getTime() - new Date(a.searched_at).getTime());

        setRecentUsers(usersWithData);
        return;
      }

      // Fallback: username-based history (legacy)
      const { data: nameHistory } = await supabase
        .from('search_history')
        .select('search_query, searched_at')
        .eq('user_id', user.id)
        .eq('search_type', 'users')
        .order('searched_at', { ascending: false })
        .limit(10);

      if (!nameHistory || nameHistory.length === 0) {
        setRecentUsers([]);
        return;
      }

      const usernames = [...new Set(nameHistory.map(s => s.search_query))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('username', usernames)
        .limit(10);

      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: stories } = await supabase
        .from('stories')
        .select('user_id')
        .in('user_id', (profiles || []).map(p => p.id))
        .gt('created_at', dayAgo);
      const userIdsWithStories = new Set(stories?.map(s => s.user_id) || []);

      const usersWithData = (profiles || []).map(profile => {
        const searchRecord = nameHistory.find(s => s.search_query === profile.username);
        return {
          ...profile,
          searched_at: searchRecord?.searched_at || new Date().toISOString(),
          has_active_story: userIdsWithStories.has(profile.id)
        };
      }).sort((a, b) => new Date(b.searched_at).getTime() - new Date(a.searched_at).getTime());

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

  const handleAvatarClick = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Fetch user's stories
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: stories } = await supabase
      .from('stories')
      .select(`
        id,
        user_id,
        media_url,
        media_type,
        caption,
        location_id,
        location_name,
        location_address,
        created_at,
        locations (
          category
        )
      `)
      .eq('user_id', userId)
      .gt('created_at', dayAgo)
      .order('created_at', { ascending: true });

    if (stories && stories.length > 0) {
      const formattedStories = stories.map((story: any) => ({
        id: story.id,
        userId: story.user_id,
        userName: recentUsers.find(u => u.id === userId)?.username || 'User',
        userAvatar: recentUsers.find(u => u.id === userId)?.avatar_url || '',
        mediaUrl: story.media_url,
        mediaType: story.media_type,
        locationId: story.location_id,
        locationName: story.location_name || '',
        locationAddress: story.location_address || '',
        locationCategory: story.locations?.category,
        timestamp: story.created_at,
        isViewed: false
      }));
      
      setViewingStories(formattedStories);
      setViewingStoriesIndex(0);
    }
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
            className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors group"
          >
            <div 
              className="relative flex-shrink-0 cursor-pointer"
              onClick={(e) => user.has_active_story ? handleAvatarClick(user.id, e) : handleUserClick(user.id)}
            >
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
            
            <div 
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => handleUserClick(user.id)}
            >
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
      
      {/* Stories Viewer */}
      {viewingStories.length > 0 && (
        <StoriesViewer
          stories={viewingStories}
          initialStoryIndex={viewingStoriesIndex}
          onClose={() => setViewingStories([])}
          onStoryViewed={() => {}}
        />
      )}
    </div>
  );
};

export default RecentUserSearches;
