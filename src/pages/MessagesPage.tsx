import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, Send, X, MessageSquare, Image, Trash2, Smile } from 'lucide-react';
import pinIcon from '@/assets/pin-icon.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { messageService, MessageThread, DirectMessage } from '@/services/messageService';
import { supabase } from '@/integrations/supabase/client';
import PlaceMessageCard from '@/components/messages/PlaceMessageCard';
import PostMessageCard from '@/components/messages/PostMessageCard';
import ProfileMessageCard from '@/components/messages/ProfileMessageCard';
import StoryMessageCard from '@/components/messages/StoryMessageCard';
import FolderMessageCard from '@/components/messages/FolderMessageCard';
import TripMessageCard from '@/components/messages/TripMessageCard';
import { useTranslation } from 'react-i18next';
import { useStories } from '@/hooks/useStories';
import StoriesViewer from '@/components/StoriesViewer';
import { useFrequentContacts } from '@/hooks/useFrequentContacts';
import { useSuggestedContacts } from '@/hooks/useSuggestedContacts';
import { getCategoryImage } from '@/utils/categoryIcons';
import CityLabel from '@/components/common/CityLabel';
import { categoryDisplayNames, type AllowedCategory } from '@/utils/allowedCategories';
type ViewMode = 'threads' | 'chat' | 'search';
const MessagesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user
  } = useAuth();
  const {
    t,
    i18n
  } = useTranslation();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [view, setView] = useState<ViewMode>('threads');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showStories, setShowStories] = useState(false);
  const [initialStoryIndex, setInitialStoryIndex] = useState(0);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messageReactions, setMessageReactions] = useState<Record<string, {
    emoji: string;
    user_id: string;
  }[]>>({});
  const [isDoubleTapping, setIsDoubleTapping] = useState(false);
  const [hiddenMessageIds, setHiddenMessageIds] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showSavedPlacesModal, setShowSavedPlacesModal] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [showUserSelectModal, setShowUserSelectModal] = useState(false);
  const [selectedPlaceToShare, setSelectedPlaceToShare] = useState<any>(null);
  const [userSelectLoading, setUserSelectLoading] = useState(false);
  const [otherUserProfile, setOtherUserProfile] = useState<any>(null);
  const [hasActiveStoryInThread, setHasActiveStoryInThread] = useState<Record<string, boolean>>({});
  const [storiesToShow, setStoriesToShow] = useState<any[]>([]);
  const [openedFromProfileId, setOpenedFromProfileId] = useState<string | null>(null);
  const lastTapRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const chatViewportWrapperRef = useRef<HTMLDivElement | null>(null);
  const {
    stories: allStories
  } = useStories();
  const {
    frequentContacts,
    loading: frequentLoading,
    refresh: refreshFrequent
  } = useFrequentContacts();
  const {
    suggestedContacts,
    loading: suggestedLoading,
    refresh: refreshSuggested
  } = useSuggestedContacts(frequentContacts.map(c => c.id));
  useEffect(() => {
    if (user) {
      loadThreads();
    }
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user?.id]);

  // Separate effect to handle initialUserId from location state
  useEffect(() => {
    const loadInitialThread = async () => {
      const state = location.state as any;
      if (state?.initialUserId && user) {
        // Fetch the full user profile first
        const {
          data: userProfile,
          error
        } = await supabase.from('profiles').select('id, username, avatar_url, full_name').eq('id', state.initialUserId).single();
      if (userProfile && !error) {
          // Store fromProfileId before clearing state
          if (state?.fromProfileId) {
            setOpenedFromProfileId(state.fromProfileId);
          }
          await handleUserSelect(userProfile);
          // Clear the state after using it
          navigate('/messages', {
            replace: true,
            state: {}
          });
        }
      }
    };
    loadInitialThread();
  }, [location.state, user]);
  useEffect(() => {
    if (selectedThread && view === 'chat') {
      const otherParticipant = getOtherParticipant(selectedThread);
      if (otherParticipant) {
        loadMessages(otherParticipant.id);
        loadHiddenMessages();
        setupRealtimeSubscription();
        loadOtherUserProfile(otherParticipant.id);
        setTimeout(() => scrollToBottom('auto'), 50);
      }
    } else if (view === 'threads') {
      // Refresh threads and unread counts when returning to threads view
      loadThreads();
    }
  }, [selectedThread, view]);
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  useEffect(() => {
    if (view === 'search') {
      // Refresh contacts when entering search view
      refreshFrequent();
      refreshSuggested();
    }
  }, [view]);

  // Keep chat stuck to the latest message when the viewport resizes (images, keyboard, etc.)
  useEffect(() => {
    if (view !== 'chat') return;
    const wrapper = chatViewportWrapperRef.current;
    const viewport = wrapper?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (!viewport) return;
    const ro = new ResizeObserver(() => scrollToBottom('auto'));
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [view]);
  const scrollToBottom = (behavior: 'auto' | 'smooth' = 'smooth') => {
    const wrapper = chatViewportWrapperRef.current;
    const tryScroll = () => {
      const viewport = wrapper?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
      if (viewport) {
        // Jump to the very end of the viewport
        viewport.scrollTop = viewport.scrollHeight;
      }
      // Always ensure the last anchor is visible as a fallback
      messagesEndRef.current?.scrollIntoView({
        behavior,
        block: 'end'
      });
    };
    // attempt now, next frame, and after layout
    tryScroll();
    requestAnimationFrame(tryScroll);
    setTimeout(tryScroll, 80);
    setTimeout(tryScroll, 220);
  };
  const loadThreads = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Get only personal (non-business) message threads
      const data = await messageService.getMessageThreads(false);
      setThreads(data || []);

      // Collect all other user IDs for batch queries
      const otherUserIds = (data || [])
        .map(thread => getOtherParticipant(thread)?.id)
        .filter((id): id is string => !!id);

      if (otherUserIds.length === 0) {
        setLoading(false);
        return;
      }

      // Batch fetch unread counts and story status in parallel
      const [unreadResults, storiesResult] = await Promise.all([
        // Batch unread counts - single query
        supabase
          .from('direct_messages')
          .select('sender_id')
          .in('sender_id', otherUserIds)
          .eq('receiver_id', user.id)
          .eq('is_read', false),
        // Batch active stories check - single query
        supabase
          .from('stories')
          .select('user_id')
          .in('user_id', otherUserIds)
          .gt('expires_at', new Date().toISOString())
      ]);

      // Process unread counts
      const counts: Record<string, number> = {};
      if (unreadResults.data) {
        for (const msg of unreadResults.data) {
          counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
        }
      }
      setUnreadCounts(counts);

      // Process story status
      const storyStatus: Record<string, boolean> = {};
      if (storiesResult.data) {
        const usersWithStories = new Set(storiesResult.data.map(s => s.user_id));
        for (const userId of otherUserIds) {
          storyStatus[userId] = usersWithStories.has(userId);
        }
      }
      setHasActiveStoryInThread(storyStatus);
    } catch (error) {
      console.error('Error loading threads:', error);
    } finally {
      setLoading(false);
    }
  };
  const loadMessages = async (otherUserId: string) => {
    try {
      setLoading(true);
      const data = await messageService.getMessagesInThread(otherUserId);
      setMessages(data || []);

      // Mark messages as read
      if (user && data && data.length > 0) {
        await messageService.markMessagesAsRead(otherUserId);
        // Update local unread count
        setUnreadCounts(prev => ({
          ...prev,
          [otherUserId]: 0
        }));
      }

      // Scroll to last unread message or bottom
      setTimeout(() => {
        const firstUnreadIndex = data?.findIndex(m => !m.is_read && m.receiver_id === user?.id);
        if (firstUnreadIndex && firstUnreadIndex > 0) {
          // Scroll to first unread message
          scrollToBottom('auto');
        } else {
          scrollToBottom('auto');
        }
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };
  const setupRealtimeSubscription = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    if (!selectedThread || !user) return;
    const otherParticipant = getOtherParticipant(selectedThread);
    if (!otherParticipant) return;
    const channel = supabase.channel(`messages-${selectedThread.id}`).on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'direct_messages',
      filter: `sender_id=eq.${user.id},receiver_id=eq.${otherParticipant.id}`
    }, payload => {
      setMessages(prev => [...prev, payload.new as DirectMessage]);
    }).subscribe();
    channelRef.current = channel;
  };
  const handleThreadSelect = (thread: MessageThread) => {
    setSelectedThread(thread);
    setView('chat');
  };
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedThread || !user) return;
    const otherParticipant = getOtherParticipant(selectedThread);
    if (!otherParticipant) return;
    try {
      setSending(true);
      await messageService.sendTextMessage(otherParticipant.id, newMessage.trim());
      setNewMessage('');
      await loadMessages(otherParticipant.id);
      await loadThreads(); // Reload threads to update the list
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };
  const handleBack = () => {
    if (view === 'chat') {
      // If chat was opened from a user profile, navigate back to that profile
      if (openedFromProfileId) {
        navigate(`/profile/${openedFromProfileId}`, { replace: true });
        return;
      }
      setView('threads');
      setSelectedThread(null);
      setMessages([]);
    } else if (view === 'search') {
      setView('threads');
      setSearchQuery('');
      setSearchResults([]);
    } else {
      // When exiting from threads list, go to home page
      navigate('/');
    }
  };
  const handleLongPressStart = (messageId: string) => {
    const timer = setTimeout(() => {
      setSelectedMessageId(messageId);
    }, 500); // 500ms long press
    setLongPressTimer(timer);
  };
  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };
  const loadHiddenMessages = async () => {
    try {
      const hiddenIds = await messageService.getHiddenMessages();
      setHiddenMessageIds(hiddenIds);
    } catch (error) {
      console.error('Error loading hidden messages:', error);
    }
  };
  const handleDeleteMessage = async () => {
    if (!selectedMessageId) return;
    try {
      const success = await messageService.hideMessage(selectedMessageId);
      if (success) {
        setHiddenMessageIds(prev => [...prev, selectedMessageId]);
        setSelectedMessageId(null);
      }
    } catch (error) {
      console.error('Error hiding message:', error);
    }
  };
  const handleMessageLongPress = (messageId: string) => {
    setSelectedMessageId(messageId);
  };
  const handleDoubleTap = async (messageId: string) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      setIsDoubleTapping(true);
      await toggleReaction(messageId, '❤️');
      setTimeout(() => setIsDoubleTapping(false), 300);
    }
    lastTapRef.current = now;
  };
  const toggleReaction = async (messageId: string, emoji: string) => {
    try {
      const reactions = messageReactions[messageId] || [];
      const userReaction = reactions.find(r => r.user_id === user?.id);
      if (userReaction && userReaction.emoji === emoji) {
        // Remove reaction
        await messageService.removeReaction(messageId);
        setMessageReactions(prev => ({
          ...prev,
          [messageId]: reactions.filter(r => r.user_id !== user?.id)
        }));
      } else {
        // Add/update reaction
        await messageService.addReaction(messageId, emoji);
        await loadMessageReactions(messageId);
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };
  const loadMessageReactions = async (messageId: string) => {
    try {
      const reactions = await messageService.getMessageReactions(messageId);
      setMessageReactions(prev => ({
        ...prev,
        [messageId]: reactions
      }));
    } catch (error) {
      console.error('Error loading reactions:', error);
    }
  };
  useEffect(() => {
    // Batch load reactions for all messages
    const loadAllReactions = async () => {
      if (messages.length === 0) return;
      const messageIds = messages.map(m => m.id);
      try {
        const { data } = await supabase
          .from('message_reactions')
          .select('message_id, emoji, user_id')
          .in('message_id', messageIds);
        
        if (data) {
          const reactionsMap: Record<string, { emoji: string; user_id: string }[]> = {};
          for (const reaction of data) {
            if (!reactionsMap[reaction.message_id]) {
              reactionsMap[reaction.message_id] = [];
            }
            reactionsMap[reaction.message_id].push({
              emoji: reaction.emoji,
              user_id: reaction.user_id
            });
          }
          setMessageReactions(reactionsMap);
        }
      } catch (error) {
        console.error('Error loading reactions:', error);
      }
    };
    loadAllReactions();
  }, [messages.length]);
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setSearchLoading(true);
      const {
        data,
        error
      } = await supabase.from('profiles').select('id, username, avatar_url, full_name').ilike('username', `%${query}%`).neq('id', user?.id).limit(20);
      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchLoading(false);
    }
  };
  const handleUserSelect = async (selectedUser: any) => {
    if (!user) return;
    const existingThread = threads.find(t => t.participant_1_id === user.id && t.participant_2_id === selectedUser.id || t.participant_2_id === user.id && t.participant_1_id === selectedUser.id);
    if (existingThread) {
      setSelectedThread(existingThread);
      setView('chat');
      await loadMessages(selectedUser.id);
    } else {
      const newThread: MessageThread = {
        id: '',
        participant_1_id: user.id,
        participant_2_id: selectedUser.id,
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        other_user: selectedUser
      };
      setSelectedThread(newThread);
      setView('chat');
      setMessages([]);
    }
  };
  const getOtherParticipant = (thread: MessageThread) => {
    if (!user) return null;
    return thread.other_user;
  };

  // Get other participant and their stories
  const otherParticipant = selectedThread ? getOtherParticipant(selectedThread) : null;
  const userStories = otherParticipant ? allStories.filter(story => story.user_id === otherParticipant.id) : [];

  // Convert stories to StoriesViewer format
  const convertedStories = userStories.map(story => ({
    id: story.id,
    userId: story.user_id,
    userName: otherParticipant?.username || '',
    userAvatar: otherParticipant?.avatar_url || '',
    mediaUrl: story.media_url,
    mediaType: story.media_type as 'image' | 'video',
    locationId: story.location_id || '',
    locationName: story.location_name || '',
    locationAddress: story.location_address || '',
    locationCategory: undefined,
    timestamp: story.created_at,
    isViewed: false,
    bookingUrl: undefined
  }));
  const handleReplyToStory = async (storyId: string, userId: string, message: string) => {
    try {
      await messageService.sendStoryReply(userId, storyId, message);
      await loadThreads();
      setShowStories(false);
      // Navigate to the conversation
      const thread = threads.find(t => t.participant_1_id === user?.id && t.participant_2_id === userId || t.participant_2_id === user?.id && t.participant_1_id === userId);
      if (thread) {
        handleThreadSelect(thread);
      }
    } catch (error) {
      console.error('Error replying to story:', error);
    }
  };
  const loadOtherUserProfile = async (userId: string) => {
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('id, username, avatar_url, full_name').eq('id', userId).single();
      if (error) throw error;
      setOtherUserProfile(data);
    } catch (error) {
      console.error('Error loading other user profile:', error);
    }
  };
  const handleAvatarClickInThread = async (thread: MessageThread) => {
    const otherUser = getOtherParticipant(thread);
    if (!otherUser) return;
    if (!hasActiveStoryInThread[otherUser.id]) {
      navigate(`/profile/${otherUser.id}`);
      return;
    }
    try {
      // Fetch user's stories
      const {
        data: stories
      } = await supabase.from('stories').select('id, user_id, media_url, media_type, created_at, location_id, location_name, location_address, metadata').eq('user_id', otherUser.id).gt('expires_at', new Date().toISOString()).order('created_at', {
        ascending: false
      });
      if (stories && stories.length > 0) {
        const transformedStories = stories.map(story => ({
          id: story.id,
          userId: story.user_id,
          userName: otherUser.username,
          userAvatar: otherUser.avatar_url,
          mediaUrl: story.media_url,
          mediaType: story.media_type as 'image' | 'video',
          locationId: story.location_id || '',
          locationName: story.location_name || '',
          locationAddress: story.location_address || '',
          locationCategory: (story.metadata as any)?.category,
          timestamp: story.created_at,
          isViewed: false
        }));
        setStoriesToShow(transformedStories);
        setInitialStoryIndex(0);
        setShowStories(true);
      }
    } catch (error) {
      console.error('Error loading stories:', error);
      navigate(`/profile/${otherUser.id}`);
    }
  };
  const loadSavedPlaces = async () => {
    if (!user) return;
    try {
      // Load from both tables to ensure complete list
      const [uslResult, spResult] = await Promise.all([supabase.from('user_saved_locations').select(`
            location_id,
            locations (
              id,
              name,
              category,
              city,
              address,
              image_url,
              google_place_id,
              latitude,
              longitude
            )
          `).eq('user_id', user.id).order('created_at', {
        ascending: false
      }), supabase.from('saved_places').select('*').eq('user_id', user.id).order('created_at', {
        ascending: false
      })]);
      const places = new Map();

      // Add from user_saved_locations
      if (uslResult.data) {
        uslResult.data.forEach((usl: any) => {
          if (usl.locations) {
            places.set(usl.locations.id, usl.locations);
          }
        });
      }

      // Add from saved_places
      if (spResult.data) {
        spResult.data.forEach((sp: any) => {
          if (!places.has(sp.place_id)) {
            const lat = sp.coordinates?.lat;
            const lng = sp.coordinates?.lng;
            places.set(sp.place_id, {
              id: sp.place_id,
              name: sp.place_name,
              category: sp.place_category || 'restaurant',
              city: sp.city,
              address: null,
              image_url: null,
              google_place_id: sp.place_id,
              coordinates: sp.coordinates,
              latitude: lat,
              longitude: lng
            });
          }
        });
      }
      setSavedPlaces(Array.from(places.values()));
    } catch (error) {
      console.error('Error loading saved places:', error);
    }
  };
  const handlePlaceClick = async (place: any) => {
    // If we're in a chat, send directly to the current recipient
    if (selectedThread && view === 'chat') {
      const recipient = getOtherParticipant(selectedThread);
      if (recipient) {
        setShowSavedPlacesModal(false);
        try {
          const sentMessage = await messageService.sendPlaceShare(recipient.id, {
            name: place.name,
            category: place.category,
            address: place.address,
            city: place.city,
            google_place_id: place.google_place_id,
            place_id: place.google_place_id,
            coordinates: {
              lat: place.latitude,
              lng: place.longitude
            }
          });
          // Optimistically add message to UI immediately
          if (sentMessage) {
            setMessages(prev => [...prev, sentMessage]);
            setTimeout(() => scrollToBottom('auto'), 50);
          }
        } catch (error) {
          console.error('Error sharing place:', error);
        }
        return;
      }
    }
    // Fallback to user selection if not in a chat
    setSelectedPlaceToShare(place);
    setShowSavedPlacesModal(false);
    setShowUserSelectModal(true);
  };
  const handleSharePlaceToUser = async (recipientId: string) => {
    if (!selectedPlaceToShare || !user) return;
    try {
      await messageService.sendPlaceShare(recipientId, {
        name: selectedPlaceToShare.name,
        category: selectedPlaceToShare.category,
        address: selectedPlaceToShare.address,
        city: selectedPlaceToShare.city,
        google_place_id: selectedPlaceToShare.google_place_id,
        place_id: selectedPlaceToShare.google_place_id,
        coordinates: {
          lat: selectedPlaceToShare.latitude,
          lng: selectedPlaceToShare.longitude
        }
      });
      setShowUserSelectModal(false);
      setSelectedPlaceToShare(null);
      await loadThreads();
    } catch (error) {
      console.error('Error sharing place:', error);
    }
  };
  const handleSearchUsersForSharing = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setUserSelectLoading(true);
      const {
        data,
        error
      } = await supabase.from('profiles').select('id, username, avatar_url, full_name').ilike('username', `%${query}%`).neq('id', user?.id).limit(20);
      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setUserSelectLoading(false);
    }
  };
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);

    // Get the current language from i18n
    const currentLang = i18n.language || 'en';
    if (diffMins < 1) return t('justNow', {
      ns: 'messages'
    });

    // Use short formats based on language
    if (diffMins < 60) {
      return `${diffMins}${currentLang === 'it' ? 'min' : 'm'}`;
    }
    if (diffHours < 24) {
      return `${diffHours}${currentLang === 'it' ? 'h' : 'h'}`;
    }

    // Less than 6 days: show days (1g, 2g, etc.)
    if (diffDays < 6) {
      return `${diffDays}${currentLang === 'it' ? 'g' : currentLang === 'es' ? 'd' : 'd'}`;
    }

    // 6 days to 4 weeks: show weeks (1 settimana, 2 settimane, etc.)
    if (diffWeeks < 4) {
      return diffWeeks === 1 ? `1 ${t('week', {
        ns: 'common'
      })}` : `${diffWeeks} ${t('weeks', {
        ns: 'common'
      })}`;
    }

    // Over 4 weeks: show date as "12 nov"
    const day = date.getDate();
    const month = date.getMonth();
    const monthAbbr = t(`monthsAbbr.${month}`, {
      ns: 'common'
    });
    return `${day} ${monthAbbr}`;
  };
  return <div className="h-screen w-full bg-background flex flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <header className="shrink-0 bg-background w-full border-b-0">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {view !== 'search' && <Button onClick={handleBack} variant="ghost" size="icon" className="rounded-full flex-shrink-0 h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>}
            
            {view === 'chat' && otherParticipant ? <div className="flex items-center gap-2 min-w-0 flex-1">
                <button onClick={() => {
              if (convertedStories && convertedStories.length > 0) {
                setInitialStoryIndex(0);
                setShowStories(true);
              }
            }} className="flex-shrink-0 relative">
                  <Avatar className={`w-10 h-10 ${convertedStories && convertedStories.length > 0 ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}`}>
                    <AvatarImage src={otherParticipant.avatar_url} />
                    <AvatarFallback>{otherParticipant.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                </button>
                <button onClick={() => navigate(`/profile/${otherParticipant.id}`, {
              state: {
                returnTo: 'chat',
                chatUserId: otherParticipant.id
              }
            })} className="min-w-0 text-left hover:opacity-80 transition-opacity">
                  <h1 className="font-semibold text-base text-foreground truncate">
                    {otherParticipant.username}
                  </h1>
                </button>
              </div> : view === 'search' ? <>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="text" placeholder={t('searchPlaceholder', {
                ns: 'messages'
              })} value={searchQuery} onChange={e => handleSearch(e.target.value)} className="pl-9 h-9 bg-muted/50 rounded-full" autoFocus />
                </div>
                <Button onClick={() => {
              setView('threads');
              setSearchQuery('');
              setSearchResults([]);
            }} variant="ghost" className="text-sm font-medium text-primary hover:text-primary/80 px-3">
                  {t('cancel', {
                ns: 'common'
              })}
                </Button>
              </> : view === 'threads' ? <div className="flex-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="text" placeholder={t('searchPlaceholder', {
                ns: 'messages'
              })} value={searchQuery} onChange={e => handleSearch(e.target.value)} onFocus={() => setView('search')} className="pl-9 h-9 bg-muted/50 rounded-full" />
                </div>
              </div> : null}
          </div>
        </div>
      </header>

      {/* Search View */}
      {view === 'search' && <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              {searchQuery.length === 0 && <div className="py-6 space-y-8">
                  {/* Frequent Contacts */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-4 text-center">{t('frequentContacts', {
                  ns: 'messages'
                })}</h3>
                    {frequentLoading ? <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div> : frequentContacts.length > 0 ? <div className="flex flex-wrap gap-4 justify-center px-4">
                        {frequentContacts.map(contact => <button key={contact.id} onClick={() => handleUserSelect(contact)} className="flex flex-col items-center gap-2 group">
                            <Avatar className="w-16 h-16 border-2 border-transparent group-hover:border-primary transition-colors">
                              <AvatarImage src={contact.avatar_url} />
                              <AvatarFallback>{contact.username?.[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-center font-medium truncate max-w-[64px]">
                              {contact.username}
                            </span>
                          </button>)}
                      </div> : <p className="text-center text-sm text-muted-foreground">{t('noFrequentContacts', {
                  ns: 'messages'
                })}</p>}
                  </div>

                  {/* Suggested Contacts */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-4 text-center">{t('suggestedContacts', {
                  ns: 'messages'
                })}</h3>
                    {suggestedLoading ? <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div> : suggestedContacts.length > 0 ? <div className="flex flex-wrap gap-4 justify-center px-4">
                        {suggestedContacts.map(contact => <button key={contact.id} onClick={() => handleUserSelect(contact)} className="flex flex-col items-center gap-2 group">
                            <Avatar className="w-16 h-16 border-2 border-transparent group-hover:border-primary transition-colors">
                              <AvatarImage src={contact.avatar_url} />
                              <AvatarFallback>{contact.username?.[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-center font-medium truncate max-w-[64px]">
                              {contact.username}
                            </span>
                          </button>)}
                      </div> : frequentContacts.length === 0 ? <p className="text-center text-sm text-muted-foreground px-6">{t('followPeoplePrompt', {
                  ns: 'messages'
                })}</p> : <p className="text-center text-sm text-muted-foreground">{t('noSuggestedContacts', {
                  ns: 'messages'
                })}</p>}
                  </div>
                </div>}
              
              {searchLoading ? <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div> : searchQuery.length >= 2 && searchResults.length > 0 ? <div className="divide-y divide-border">
                  {searchResults.map(result => <button key={result.id} onClick={() => handleUserSelect(result)} className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={result.avatar_url} />
                        <AvatarFallback>{result.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-foreground">{result.username}</p>
                        {result.full_name && <p className="text-sm text-muted-foreground">{result.full_name}</p>}
                      </div>
                    </button>)}
                </div> : searchQuery.length >= 2 ? <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <p className="text-muted-foreground">{t('noUsersFound', {
                ns: 'messages'
              })}</p>
                </div> : null}
            </ScrollArea>
          </div>
        </div>}

      {/* Threads View */}
      {view === 'threads' && <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            {loading ? <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div> : threads.length === 0 ? <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-3">
                <MessageSquare className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{t('noMessages', {
              ns: 'messages'
            })}</h3>
              <p className="text-muted-foreground text-sm mb-4">{t('startConversation', {
              ns: 'messages'
            })}</p>
              <Button onClick={() => setView('search')} size="sm">
                {t('newMessage', {
              ns: 'messages'
            })}
              </Button>
            </div> : <div className="space-y-0">
              {threads.map(thread => {
            const otherParticipant = getOtherParticipant(thread);
            if (!otherParticipant) return null;
            const unreadCount = unreadCounts[otherParticipant.id] || 0;
            const lastMessage = thread.last_message;
            const isMyMessage = lastMessage?.sender_id === user?.id;
            const isStoryReply = lastMessage?.message_type === 'story_reply';
            const isStoryShare = lastMessage?.message_type === 'story_share';

            // Format message preview
            let messagePreview = '';
            if (isStoryReply && !isMyMessage) {
              messagePreview = t('repliedToYourStory', {
                ns: 'messages'
              });
            } else if (isStoryShare) {
              messagePreview = t('sharedAStory', {
                ns: 'messages'
              });
            } else if (unreadCount > 1) {
              messagePreview = t('newMessages', {
                ns: 'messages',
                count: unreadCount
              });
            } else if (lastMessage?.message_type === 'audio') {
              messagePreview = t('audioMessage', {
                ns: 'messages'
              });
            } else if (lastMessage?.message_type === 'place_share') {
              messagePreview = t('sharedAPlace', {
                ns: 'messages'
              });
            } else if (lastMessage?.message_type === 'post_share') {
              messagePreview = t('sharedAPost', {
                ns: 'messages'
              });
            } else if (lastMessage?.message_type === 'profile_share') {
              messagePreview = t('sharedAProfile', {
                ns: 'messages'
              });
            } else if (lastMessage?.message_type === 'folder_share') {
              messagePreview = t('sharedAList', {
                ns: 'messages'
              });
            } else if (lastMessage?.message_type === 'trip_share') {
              messagePreview = t('sharedATrip', {
                ns: 'messages'
              });
            } else if (lastMessage?.content) {
              const content = lastMessage.content;
              messagePreview = content.length > 30 ? `${content.substring(0, 30)}...` : content;
            } else {
              messagePreview = t('startConversation', {
                ns: 'messages'
              });
            }

            // Message status for sent messages
            let statusText = '';
            if (isMyMessage && !isStoryReply && !isStoryShare) {
              statusText = lastMessage?.is_read ? t('viewed', {
                ns: 'messages'
              }) : t('sent', {
                ns: 'messages'
              });
            }
            return <button key={thread.id} onClick={() => handleThreadSelect(thread)} className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors">
                    <button onClick={e => {
                e.stopPropagation();
                handleAvatarClickInThread(thread);
              }} className="flex-shrink-0">
                      <Avatar className={`w-14 h-14 border-2 ${hasActiveStoryInThread[otherParticipant.id] ? 'border-primary' : 'border-background'}`}>
                        <AvatarImage src={otherParticipant.avatar_url} />
                        <AvatarFallback>{otherParticipant.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </button>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex justify-between items-end mb-1">
                        <p className="font-semibold text-base text-foreground truncate">
                          {otherParticipant.username}
                        </p>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {thread.last_message_at && formatMessageTime(thread.last_message_at)}
                          </span>
                          {unreadCount > 0 && <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-xs text-primary-foreground font-bold">
                                {unreadCount}
                              </span>
                            </div>}
                        </div>
                      </div>
                       <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground truncate">
                          {isStoryReply ? <span className="font-semibold">{messagePreview}</span> : lastMessage?.message_type === 'audio' ? <span className="font-semibold">{messagePreview}</span> : <>
                              {lastMessage?.content && <>
                                  <span className="font-semibold">
                                    {lastMessage.content.substring(0, Math.min(20, lastMessage.content.length))}
                                  </span>
                                  {lastMessage.content.length > 20 && '...'}
                                </>}
                              {!lastMessage?.content && messagePreview}
                            </>}
                        </p>
                        {statusText && <span className="text-xs text-muted-foreground">· {statusText}</span>}
                      </div>
                    </div>
                  </button>;
          })}
            </div>}
          </ScrollArea>
        </div>}

      {/* Chat View */}
      {view === 'chat' && <div className="flex-1 min-h-0 overflow-hidden flex flex-col pb-[env(safe-area-inset-bottom)]">
          <div ref={chatViewportWrapperRef} className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full p-4 [&>div>div]:!overflow-y-auto [&>div>div]:scrollbar-hide">
            {loading ? <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div> : <div className="space-y-3">
                 {messages.filter(m => !hiddenMessageIds.includes(m.id)).map(message => {
              const isOwn = message.sender_id === user?.id;
              return <div key={message.id} className={`flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`} onTouchStart={() => handleLongPressStart(message.id)} onTouchEnd={handleLongPressEnd} onMouseDown={() => handleLongPressStart(message.id)} onMouseUp={handleLongPressEnd} onMouseLeave={handleLongPressEnd} onClick={() => handleDoubleTap(message.id)}>
                          <div className={`flex items-end gap-2 w-full ${isOwn ? 'flex-row-reverse justify-start' : 'flex-row'}`}>
                            {/* Avatar - only for received messages */}
                            {!isOwn && <Avatar className="w-6 h-6 flex-shrink-0">
                                <AvatarImage src={otherUserProfile?.avatar_url} />
                                <AvatarFallback className="text-xs">
                                  {otherUserProfile?.username?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>}

                            <div className="flex-shrink-0 max-w-[calc(100%-40px)]">
                        
                        {message.message_type === 'audio' && message.shared_content?.audio_url ? <div className="w-full">
                            <div className={`rounded-2xl px-3 py-2.5 relative ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground border border-border'}`}>
                              <div className="flex items-center gap-2">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isOwn ? 'bg-primary-foreground/20' : 'bg-primary/10'}`}>
                                  <svg className={`w-5 h-5 ${isOwn ? 'text-primary-foreground' : 'text-primary'}`} fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <audio controls className="w-full h-8" style={{
                              maxWidth: '100%'
                            }}>
                                    <source src={message.shared_content.audio_url} type="audio/webm" />
                                  </audio>
                                </div>
                              </div>
                              {messageReactions[message.id]?.length > 0 && <div className="absolute -bottom-2 left-2 flex gap-0.5 bg-background/95 rounded-full px-1.5 py-0.5 shadow-sm border border-border">
                                  {messageReactions[message.id].map((reaction, idx) => <button key={idx} onClick={e => {
                            e.stopPropagation();
                            toggleReaction(message.id, reaction.emoji);
                          }} className="text-sm leading-none hover:scale-110 transition-transform">
                                      {reaction.emoji}
                                    </button>)}
                                </div>}
                            </div>
                            {/* Timestamp below message */}
                            <p className={`text-xs text-muted-foreground px-2 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                              {formatMessageTime(message.created_at)}
                            </p>
                          </div> : message.message_type === 'story_reply' && (message.story_id || message.shared_content) ?
                    // Story reply - show "Ha respondido a tu historia" with story preview
                    <div className={`max-w-[85%] ${isOwn ? 'ml-auto' : ''}`}>
                            {!isOwn && <p className="text-xs text-muted-foreground mb-2 px-1">
                                {t('repliedToYourStory', {
                          ns: 'messages'
                        })}
                              </p>}
                            {message.shared_content && <div className="bg-card rounded-2xl border border-border overflow-hidden p-3 mb-2 relative">
                                <StoryMessageCard storyData={message.shared_content} />
                                {messageReactions[message.id]?.length > 0 && <div className="absolute -bottom-2 left-2 flex gap-0.5 bg-background/95 rounded-full px-1.5 py-0.5 shadow-sm border border-border">
                                    {messageReactions[message.id].map((reaction, idx) => <button key={idx} onClick={e => {
                            e.stopPropagation();
                            toggleReaction(message.id, reaction.emoji);
                          }} className="text-sm leading-none hover:scale-110 transition-transform">
                                        {reaction.emoji}
                                      </button>)}
                                  </div>}
                              </div>}
                            {message.content && <div className={`rounded-2xl px-4 py-3 mb-2 relative ${isOwn ? 'bg-primary text-primary-foreground ml-auto max-w-fit' : 'bg-card text-card-foreground border border-border'}`}>
                                <p className="text-sm">{message.content}</p>
                                {messageReactions[message.id]?.length > 0 && <div className="absolute -bottom-2 left-2 flex gap-0.5 bg-background/95 rounded-full px-1.5 py-0.5 shadow-sm border border-border">
                                    {messageReactions[message.id].map((reaction, idx) => <button key={idx} onClick={e => {
                            e.stopPropagation();
                            toggleReaction(message.id, reaction.emoji);
                          }} className="text-sm leading-none hover:scale-110 transition-transform">
                                        {reaction.emoji}
                                      </button>)}
                                  </div>}
                              </div>}
                            {/* Timestamp below message */}
                            <p className={`text-xs text-muted-foreground px-2 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                              {formatMessageTime(message.created_at)}
                            </p>
                          </div> : message.message_type === 'story_share' && message.shared_content ?
                    // Story share - show story preview
                    <div className={`max-w-[85%] ${isOwn ? 'ml-auto' : ''}`}>
                            <div className="bg-card rounded-2xl border border-border overflow-hidden p-3 relative">
                              <StoryMessageCard storyData={message.shared_content} content={message.content} />
                              {messageReactions[message.id]?.length > 0 && <div className="absolute -bottom-2 left-2 flex gap-0.5 bg-background/95 rounded-full px-1.5 py-0.5 shadow-sm border border-border">
                                  {messageReactions[message.id].map((reaction, idx) => <button key={idx} onClick={e => {
                            e.stopPropagation();
                            toggleReaction(message.id, reaction.emoji);
                          }} className="text-sm leading-none hover:scale-110 transition-transform">
                                      {reaction.emoji}
                                    </button>)}
                                </div>}
                            </div>
                            {/* Timestamp below message */}
                            <p className={`text-xs text-muted-foreground px-2 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                              {formatMessageTime(message.created_at)}
                            </p>
                          </div> : ['place_share', 'post_share', 'profile_share', 'folder_share', 'trip_share'].includes(message.message_type) && message.shared_content ? <div className={`w-full max-w-[200px] ${isOwn ? 'ml-auto' : ''}`}>
                            {message.content && <div className={`rounded-2xl px-4 py-3 mb-2 relative ${isOwn ? 'bg-primary text-primary-foreground ml-auto max-w-fit' : 'bg-card text-card-foreground border border-border'}`}>
                                <p className="text-sm">{message.content}</p>
                              </div>}
                            <div className="bg-card rounded-2xl border border-border relative overflow-visible">
                              {message.message_type === 'place_share' && <PlaceMessageCard placeData={message.shared_content} onViewPlace={placeData => {
                          // Get the other user ID from the message
                          const otherUserId = message.sender_id === user?.id ? message.receiver_id : message.sender_id;
                          navigate('/', {
                            state: {
                              showLocationCard: true,
                              locationData: {
                                id: placeData.id || placeData.place_id || placeData.google_place_id || '',
                                google_place_id: placeData.google_place_id || placeData.place_id || '',
                                name: placeData.name || '',
                                category: placeData.category || 'place',
                                address: placeData.address || '',
                                city: placeData.city || '',
                                coordinates: placeData.coordinates || {
                                  lat: 0,
                                  lng: 0
                                }
                              },
                              fromMessages: true,
                              returnToUserId: otherUserId
                            }
                          });
                        }} />}
                              {message.message_type === 'post_share' && <PostMessageCard postData={message.shared_content} />}
                              {message.message_type === 'profile_share' && <ProfileMessageCard profileData={message.shared_content} currentChatUserId={otherParticipant?.id} />}
                              {message.message_type === 'folder_share' && <FolderMessageCard folderData={message.shared_content} />}
                              {message.message_type === 'trip_share' && <TripMessageCard tripData={message.shared_content} />}
                              {messageReactions[message.id]?.length > 0 && <div className="absolute -bottom-2 left-2 flex gap-0.5 bg-background/95 rounded-full px-1.5 py-0.5 shadow-sm border border-border">
                                  {messageReactions[message.id].map((reaction, idx) => <button key={idx} onClick={e => {
                            e.stopPropagation();
                            toggleReaction(message.id, reaction.emoji);
                          }} className="text-sm leading-none hover:scale-110 transition-transform">
                                      {reaction.emoji}
                                    </button>)}
                                </div>}
                            </div>
                            {/* Timestamp below message */}
                            <p className={`text-xs text-muted-foreground px-2 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                              {formatMessageTime(message.created_at)}
                            </p>
                          </div> : <div className="w-full">
                            <div className={`rounded-2xl px-4 py-3 relative inline-block max-w-full ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground border border-border'}`} style={{
                        wordBreak: 'normal',
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'break-word'
                      }}>
                              <p className="text-sm whitespace-normal break-words">{message.content}</p>
                              {messageReactions[message.id]?.length > 0 && <div className="absolute -bottom-2 left-2 flex gap-0.5 bg-background/95 rounded-full px-1.5 py-0.5 shadow-sm border border-border">
                                  {messageReactions[message.id].map((reaction, idx) => <button key={idx} onClick={e => {
                            e.stopPropagation();
                            toggleReaction(message.id, reaction.emoji);
                          }} className="text-sm leading-none hover:scale-110 transition-transform">
                                      {reaction.emoji}
                                    </button>)}
                                </div>}
                            </div>
                            {/* Timestamp below message */}
                            <p className={`text-xs text-muted-foreground px-2 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                              {formatMessageTime(message.created_at)}
                            </p>
                          </div>}
                          </div>
                        </div>
                       </div>;
            })}
                 <div ref={messagesEndRef} />
               </div>}
             </ScrollArea>
           </div>

          {/* Message Input */}
          <div className="shrink-0 p-3 bg-background pb-[calc(env(safe-area-inset-bottom)+8px)]">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="flex-shrink-0 h-9 w-9 p-0 text-muted-foreground hover:text-foreground" 
                onClick={() => {
                  loadSavedPlaces();
                  setShowSavedPlacesModal(true);
                }}
              >
                <img 
                  alt="Pin" 
                  className="w-7 h-7 object-contain" 
                  src="/lovable-uploads/e48ff6d7-7d85-4bbe-aad3-223abcbf495b.png" 
                />
              </Button>
              
              <Input 
                type="text" 
                placeholder={t('typeMessage', { ns: 'messages' })} 
                value={newMessage} 
                onChange={e => setNewMessage(e.target.value)} 
                onKeyPress={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }} 
                disabled={sending} 
                className="flex-1 rounded-full" 
              />

              <Button 
                onClick={handleSendMessage} 
                disabled={sending || !newMessage.trim()} 
                size="icon" 
                className="flex-shrink-0 h-9 w-9 rounded-full"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>}

      {/* Stories Viewer */}
      {showStories && convertedStories && convertedStories.length > 0 && <StoriesViewer stories={convertedStories} initialStoryIndex={initialStoryIndex} onClose={() => setShowStories(false)} onStoryViewed={storyId => {
      console.log('Story viewed:', storyId);
    }} onLocationClick={locationId => {
      setShowStories(false);
      navigate('/explore', {
        state: {
          locationId
        }
      });
    }} />}

      {/* Delete Message Bottom Sheet */}
      <Sheet open={!!selectedMessageId} onOpenChange={open => !open && setSelectedMessageId(null)}>
        <SheetContent side="bottom" className="rounded-t-[20px]">
          <SheetHeader>
            <SheetTitle className="text-center">{t('messageOptions', {
              ns: 'messages'
            })}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-2 pt-4">
            <Button variant="ghost" className="w-full justify-start text-left h-12 text-base" onClick={() => {
            setShowEmojiPicker(true);
          }}>
              <Smile className="w-5 h-5 mr-3" />
              {t('addReaction', {
              ns: 'messages'
            })}
            </Button>
            <Button variant="ghost" className="w-full justify-start text-left h-12 text-base text-destructive hover:text-destructive" onClick={handleDeleteMessage}>
              <Trash2 className="w-5 h-5 mr-3" />
              {t('deleteMessage', {
              ns: 'messages'
            })}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Emoji Picker Bottom Sheet */}
      <Sheet open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
        <SheetContent side="bottom" className="rounded-t-[20px]">
          <SheetHeader>
            <SheetTitle className="text-center">{t('selectEmoji', {
              ns: 'messages'
            })}</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-8 gap-2 pt-4 max-h-[300px] overflow-y-auto">
            {['❤️', '👍', '😂', '😮', '😢', '🙏', '👏', '🔥', '🎉', '💯', '😍', '🤔', '😎', '🥳', '💪', '✨'].map(emoji => <button key={emoji} className="text-3xl p-2 hover:bg-accent rounded-lg transition-colors" onClick={() => {
            if (selectedMessageId) {
              toggleReaction(selectedMessageId, emoji);
              setShowEmojiPicker(false);
              setSelectedMessageId(null);
            }
          }}>
                {emoji}
              </button>)}
          </div>
        </SheetContent>
      </Sheet>

      {/* Saved Places Modal */}
      <Sheet open={showSavedPlacesModal} onOpenChange={setShowSavedPlacesModal}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-[20px]">
          <SheetHeader>
            <SheetTitle className="text-center">{t('shareSavedPlace', {
              ns: 'messages'
            })}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full pt-4 [&>div>div]:!overflow-y-auto [&>div>div]:scrollbar-hide">
            {savedPlaces.length === 0 ? <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <img src={pinIcon} alt="Pin" className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-muted-foreground">{t('noSavedPlaces', {
                ns: 'messages'
              })}</p>
              </div> : <div className="space-y-2 pb-4">
                {savedPlaces.map(place => <button key={place.id} onClick={() => handlePlaceClick(place)} className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors rounded-lg">
                    {place.image_url ? <img src={place.image_url} alt={place.name} className="w-14 h-14 rounded-lg object-cover" /> : <div className="w-14 h-14 flex items-center justify-center">
                        <img src={getCategoryImage(place.category)} alt={place.category} className={`object-contain ${place.category === 'restaurant' || place.category === 'hotel' ? 'w-[52px] h-[52px]' : 'w-10 h-10'}`} />
                      </div>}
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {place.name || 'Location'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        <CityLabel id={place.google_place_id || place.id} city={place.city} name={place.name} address={place.address} coordinates={place.coordinates} /> • {categoryDisplayNames[place.category as AllowedCategory] || place.category || 'Place'}
                      </p>
                    </div>
                  </button>)}
              </div>}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* User Selection Modal for Sharing */}
      <Sheet open={showUserSelectModal} onOpenChange={setShowUserSelectModal}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-[20px]">
          <SheetHeader>
            <SheetTitle className="text-center">{t('selectRecipient', {
              ns: 'messages'
            })}</SheetTitle>
          </SheetHeader>
          <div className="pt-4">
              <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="text" placeholder={t('search', {
                ns: 'common'
              })} className="pl-10 rounded-full bg-muted border-0" onChange={e => handleSearchUsersForSharing(e.target.value)} />
              </div>
            </div>
            <ScrollArea className="h-[calc(80vh-120px)]">
              <div className="px-4 space-y-1">
                {userSelectLoading ? <div className="text-center py-8 text-muted-foreground">{t('loading', {
                  ns: 'common'
                })}</div> : searchResults.length === 0 ? <div className="text-center py-8 text-muted-foreground">{t('searchUsersToShare', {
                  ns: 'messages'
                })}</div> : searchResults.map(user => <button key={user.id} onClick={() => handleSharePlaceToUser(user.id)} className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors rounded-lg">
                      <Avatar className="w-12 h-12 flex-shrink-0">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-semibold text-foreground truncate">{user.username}</p>
                        {user.full_name && <p className="text-sm text-muted-foreground truncate">{user.full_name}</p>}
                      </div>
                    </button>)}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {showStories && <StoriesViewer stories={storiesToShow.length > 0 ? storiesToShow : convertedStories} initialStoryIndex={initialStoryIndex} onClose={() => {
      setShowStories(false);
      setStoriesToShow([]);
    }} onStoryViewed={() => {}} onReplyToStory={handleReplyToStory} />}
    </div>;
};
export default MessagesPage;