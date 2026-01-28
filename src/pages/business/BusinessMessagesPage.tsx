import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, MessageSquare, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { messageService, MessageThread } from '@/services/messageService';
import StoriesViewer from '@/components/StoriesViewer';
import { SwipeBackWrapper } from '@/components/common/SwipeBackWrapper';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  profiles: {
    username: string;
    avatar_url?: string;
  };
}

const BusinessMessagesPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { businessProfile } = useBusinessProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasActiveStory, setHasActiveStory] = useState<Record<string, boolean>>({});
  const [showStories, setShowStories] = useState(false);
  const [currentUserStories, setCurrentUserStories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (user && businessProfile) {
      fetchBusinessMessages();
    }
  }, [user, businessProfile]);

  useEffect(() => {
    // Update filtered messages when messages change and no search query
    if (!searchQuery.trim()) {
      setFilteredMessages(messages);
    } else {
      handleSearch(searchQuery);
    }
  }, [messages]);

  const fetchBusinessMessages = async () => {
    try {
      setLoading(true);
      
      // Fetch business-specific message threads using the service
      const data = await messageService.getMessageThreads(true);
      
      // Transform to Message format with profiles
      const messagesWithProfiles = data.map(thread => ({
        id: thread.last_message?.id || '',
        sender_id: thread.last_message?.sender_id || '',
        receiver_id: thread.last_message?.receiver_id || '',
        content: thread.last_message?.content || '',
        is_read: thread.last_message?.is_read || false,
        created_at: thread.last_message?.created_at || thread.last_message_at,
        profiles: thread.other_user || {
          username: 'Unknown User',
          avatar_url: undefined
        }
      }));

      setMessages(messagesWithProfiles);
      setFilteredMessages(messagesWithProfiles);

      // Check for active stories for each user
      const storyStatus: Record<string, boolean> = {};
      for (const msg of messagesWithProfiles) {
        const { data: stories } = await supabase
          .from('stories')
          .select('id')
          .eq('user_id', msg.sender_id)
          .gt('expires_at', new Date().toISOString())
          .limit(1);
        storyStatus[msg.sender_id] = !!stories && stories.length > 0;
      }
      setHasActiveStory(storyStatus);
    } catch (error) {
      console.error('Error fetching business messages:', error);
      toast.error(t('failedLoadMessages', { ns: 'business' }));
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = async (userId: string) => {
    if (!hasActiveStory[userId]) {
      navigate(`/profile/${userId}`);
      return;
    }

    try {
      // Fetch user's stories
      const { data: stories } = await supabase
        .from('stories')
        .select('id, user_id, media_url, media_type, created_at, location_id, location_name, location_address, metadata')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      
      if (stories && stories.length > 0) {
        // Get profile data
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', userId)
          .single();
        
        const transformedStories = stories.map(story => ({
          id: story.id,
          userId: story.user_id,
          userName: profileData?.username || 'User',
          userAvatar: profileData?.avatar_url || '',
          mediaUrl: story.media_url,
          mediaType: story.media_type as 'image' | 'video',
          locationId: story.location_id || '',
          locationName: story.location_name || '',
          locationAddress: story.location_address || '',
          locationCategory: (story.metadata as any)?.category,
          timestamp: story.created_at,
          isViewed: false
        }));
        setCurrentUserStories(transformedStories);
        setShowStories(true);
      }
    } catch (error) {
      console.error('Error loading stories:', error);
      navigate(`/profile/${userId}`);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredMessages(messages);
      return;
    }

    const lowercaseQuery = query.toLowerCase();
    const filtered = messages.filter((msg) => {
      const username = msg.profiles?.username?.toLowerCase() || '';
      const content = msg.content?.toLowerCase() || '';
      return username.includes(lowercaseQuery) || content.includes(lowercaseQuery);
    });
    
    setFilteredMessages(filtered);
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return t('justNow', { ns: 'notifications' });
    if (diffInMinutes < 60) return t('minutesAgo', { ns: 'notifications', count: diffInMinutes });
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return t('hoursAgo', { ns: 'notifications', count: diffInHours });
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return t('daysAgo', { ns: 'notifications', count: diffInDays });
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    return t('weeksAgo', { ns: 'notifications', count: diffInWeeks });
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <SwipeBackWrapper onBack={() => navigate('/business')}>
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-3 p-4 pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/business')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">{t('businessMessages', { ns: 'business' })}</h1>
          </div>
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('searchPlaceholder', { ns: 'messages' })}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 h-9 bg-muted/50 rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('noMessagesYet', { ns: 'business' })}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('customerInquiries', { ns: 'business' })}
              </p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('noResults', { ns: 'common' })}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('tryDifferentSearch', { ns: 'common' })}
              </p>
            </div>
          ) : (
            filteredMessages.map((message) => (
              <div
                key={message.id}
                onClick={() => {
                  // Navigate to message detail or mark as read
                  console.log('Message clicked:', message.id);
                }}
                className={`w-full cursor-pointer active:bg-accent/50 transition-colors ${
                  !message.is_read ? 'bg-accent/20' : 'bg-background'
                }`}
              >
                <div className="flex items-center gap-3 py-3 px-4">
                  {/* Avatar */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAvatarClick(message.sender_id);
                    }}
                    className="flex-shrink-0"
                  >
                    <Avatar className={`w-12 h-12 border-2 ${
                      hasActiveStory[message.sender_id] 
                        ? 'border-primary' 
                        : 'border-background'
                    }`}>
                      <AvatarImage src={message.profiles?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                        {message.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <h4 className="font-semibold text-foreground text-[15px] truncate">
                        {message.profiles?.username || 'Unknown User'}
                      </h4>
                      <span className="text-muted-foreground text-[12px] flex-shrink-0">
                        {getRelativeTime(message.created_at)}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-[13px] line-clamp-1">
                      {message.content}
                    </p>
                  </div>

                  {/* Unread indicator */}
                  {!message.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  )}
                </div>
              </div>
            ))
          )}
      </div>

        {/* Stories Viewer */}
        {showStories && currentUserStories.length > 0 && (
          <StoriesViewer
            stories={currentUserStories}
            initialStoryIndex={0}
            onClose={() => {
              setShowStories(false);
              setCurrentUserStories([]);
            }}
            onStoryViewed={() => {}}
          />
        )}
      </div>
    </SwipeBackWrapper>
  );
};

export default BusinessMessagesPage;
