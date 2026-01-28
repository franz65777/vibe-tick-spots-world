import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, Send, X, MessageSquare, Image, Trash2 } from 'lucide-react';
import pinIcon from '@/assets/pin-icon.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { SwipeBackWrapper } from '@/components/common/SwipeBackWrapper';
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
import { translateCategory } from '@/utils/translateCategory';
// Helper to extract the first photo URL from the locations.photos JSONB column
const extractFirstPhotoUrl = (photos: unknown): string | null => {
  if (!photos) return null;
  const arr = Array.isArray(photos) ? photos : null;
  if (!arr) return null;
  for (const item of arr) {
    if (typeof item === 'string' && item.trim()) return item;
    if (item && typeof item === 'object') {
      const anyItem = item as any;
      const url = anyItem.url || anyItem.photo_url || anyItem.src;
      if (typeof url === 'string' && url.trim()) return url;
    }
  }
  return null;
};

// Determine which thumbnail to show: 1) business photo  2) Google photo  3) null (fallback to icon)
const getLocationThumbnail = (location: any): string | null => {
  if (location.image_url) return location.image_url;
  const googlePhoto = extractFirstPhotoUrl(location.photos);
  if (googlePhoto) return googlePhoto;
  return null;
};
import { useRealtimeEvent } from '@/hooks/useCentralizedRealtime';
import VirtualizedThreadList from '@/components/messages/VirtualizedThreadList';
import VirtualizedMessageList from '@/components/messages/VirtualizedMessageList';
import MessageOptionsOverlay from '@/components/messages/MessageOptionsOverlay';

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
  const [replyingToMessage, setReplyingToMessage] = useState<DirectMessage | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  // Get the full selected message object for the overlay
  const selectedMessage = useMemo(() => {
    if (!selectedMessageId) return null;
    return messages.find(m => m.id === selectedMessageId) || null;
  }, [selectedMessageId, messages]);
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
  const scrollToBottom = useCallback((behavior: 'auto' | 'smooth' = 'smooth') => {
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
  }, []);

  const loadThreads = useCallback(async () => {
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
  }, [user]);

  const loadMessages = useCallback(async (otherUserId: string) => {
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
  }, [user, scrollToBottom]);

  // Use centralized realtime for messages - reduces connections by 80%+
  const selectedThreadIdRef = useRef<string | null>(null);
  const selectedOtherUserIdRef = useRef<string | null>(null);
  
  // Update refs when thread changes
  useEffect(() => {
    if (selectedThread) {
      selectedThreadIdRef.current = selectedThread.id;
      const other = getOtherParticipant(selectedThread);
      selectedOtherUserIdRef.current = other?.id || null;
    } else {
      selectedThreadIdRef.current = null;
      selectedOtherUserIdRef.current = null;
    }
  }, [selectedThread]);
  
  // Listen to centralized message events
  useRealtimeEvent('message_insert', useCallback((payload: any) => {
    if (!selectedOtherUserIdRef.current || !user) return;
    // Only add message if it's for the current conversation
    if (payload.sender_id === selectedOtherUserIdRef.current || 
        (payload.sender_id === user.id && payload.receiver_id === selectedOtherUserIdRef.current)) {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === payload.id)) return prev;
        return [...prev, payload as DirectMessage];
      });
    }
  }, [user]));
  
  // Legacy cleanup - remove old channel if exists
  const setupRealtimeSubscription = useCallback(() => {
    // Channel management now handled by useCentralizedRealtime
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const handleThreadSelect = useCallback((thread: MessageThread) => {
    setSelectedThread(thread);
    setView('chat');
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedThread || !user) return;
    const otherParticipant = getOtherParticipant(selectedThread);
    if (!otherParticipant) return;
    try {
      setSending(true);
      // Pass replyingToMessage to sendTextMessage if present
      await messageService.sendTextMessage(otherParticipant.id, newMessage.trim(), replyingToMessage || undefined);
      setNewMessage('');
      setReplyingToMessage(null); // Clear reply context after sending
      await loadMessages(otherParticipant.id);
      await loadThreads(); // Reload threads to update the list
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  }, [newMessage, selectedThread, user, replyingToMessage, loadMessages, loadThreads]);

  const handleBack = useCallback(() => {
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
  }, [view, openedFromProfileId, navigate]);

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
              photos,
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
            latitude: place.latitude,
            longitude: place.longitude,
            coordinates: {
              lat: place.latitude,
              lng: place.longitude
            },
            image_url: place.image_url || null,
            photos: place.photos || null
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
        latitude: selectedPlaceToShare.latitude,
        longitude: selectedPlaceToShare.longitude,
        coordinates: {
          lat: selectedPlaceToShare.latitude,
          lng: selectedPlaceToShare.longitude
        },
        image_url: selectedPlaceToShare.image_url || null,
        photos: selectedPlaceToShare.photos || null
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
  return <SwipeBackWrapper onBack={handleBack}><div className="h-screen w-full bg-background flex flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
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

      {/* Threads View - Virtualized for 60fps with 1000+ threads */}
      {view === 'threads' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <VirtualizedThreadList
            threads={threads}
            loading={loading}
            userId={user?.id}
            unreadCounts={unreadCounts}
            hasActiveStoryInThread={hasActiveStoryInThread}
            onThreadSelect={handleThreadSelect}
            onAvatarClick={handleAvatarClickInThread}
            onNewMessage={() => setView('search')}
            formatMessageTime={formatMessageTime}
            getOtherParticipant={getOtherParticipant}
          />
        </div>
      )}

      {/* Chat View - Virtualized for 60fps with 1000+ messages */}
      {view === 'chat' && (
        <div className="flex-1 min-h-0 flex flex-col">
          <div ref={chatViewportWrapperRef} className="flex-1 min-h-0 overflow-hidden">
            <VirtualizedMessageList
              messages={messages}
              loading={loading}
              userId={user?.id}
              hiddenMessageIds={hiddenMessageIds}
              messageReactions={messageReactions}
              otherUserProfile={otherUserProfile}
              otherParticipantId={otherParticipant?.id}
              formatMessageTime={formatMessageTime}
              onLongPressStart={handleLongPressStart}
              onLongPressEnd={handleLongPressEnd}
              onDoubleTap={handleDoubleTap}
              onToggleReaction={toggleReaction}
              onReply={(message) => {
                setReplyingToMessage(message);
                inputRef.current?.focus();
              }}
              onViewPlace={(placeData, otherUserId) => {
                // Extract latitude/longitude from coordinates or direct fields
                const lat = placeData.latitude ?? placeData.coordinates?.lat ?? 0;
                const lng = placeData.longitude ?? placeData.coordinates?.lng ?? 0;
                const googlePlaceId = placeData.google_place_id || placeData.place_id || '';
                
                navigate('/', {
                  state: {
                    showLocationCard: true,
                    locationData: {
                      // IMPORTANT: Only use internal ID if present and different from google_place_id
                      // Let PinDetailCard resolve it if we only have google_place_id
                      id: placeData.id && placeData.id !== googlePlaceId ? placeData.id : undefined,
                      google_place_id: googlePlaceId,
                      name: placeData.name || '',
                      category: placeData.category || 'place',
                      address: placeData.address || '',
                      city: placeData.city || '',
                      latitude: lat,
                      longitude: lng,
                      coordinates: { lat, lng },
                      image_url: placeData.image_url || placeData.image || null,
                      photos: placeData.photos || null
                    },
                    fromMessages: true,
                    returnToUserId: otherUserId
                  }
                });
              }}
            />
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Preview */}
          {replyingToMessage && (
            <div className="shrink-0 border-t border-border bg-accent/30 px-4 py-2 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">
                  {replyingToMessage.sender_id === user?.id 
                    ? t('replyingToYourself', { ns: 'messages' }) 
                    : t('replyingTo', { ns: 'messages', name: otherUserProfile?.username })}
                </p>
                <p className="text-sm text-foreground truncate">
                  {(() => {
                    if (replyingToMessage.content) return replyingToMessage.content;
                    const typeLabels: Record<string, string> = {
                      'place_share': 'toAPlace',
                      'post_share': 'toAPost',
                      'profile_share': 'toAProfile',
                      'story_share': 'toAStory',
                      'story_reply': 'toAStory',
                      'folder_share': 'toAFolder',
                      'trip_share': 'toATrip',
                      'audio': 'toAnAudio',
                    };
                    const key = typeLabels[replyingToMessage.message_type] || 'sharedContent';
                    return t(key, { ns: 'messages' });
                  })()}
                </p>
              </div>
              
              {/* Thumbnail */}
              {(() => {
                const content = replyingToMessage.shared_content as Record<string, any> | null;
                if (!content) return null;
                let thumbnailUrl: string | null = null;
                switch (replyingToMessage.message_type) {
                  case 'place_share':
                    thumbnailUrl = content.image_url || content.image || (content.photos?.[0]?.photo_reference ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=100&photo_reference=${content.photos[0].photo_reference}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}` : null);
                    break;
                  case 'post_share':
                    thumbnailUrl = content.media_urls?.[0] || null;
                    break;
                  case 'profile_share':
                    thumbnailUrl = content.avatar_url || null;
                    break;
                  case 'story_share':
                  case 'story_reply':
                    thumbnailUrl = content.media_url || null;
                    break;
                  case 'folder_share':
                    thumbnailUrl = content.cover_image || content.cover_image_url || null;
                    break;
                  case 'trip_share':
                    thumbnailUrl = content.cover_image || null;
                    break;
                }
                if (!thumbnailUrl) return null;
                return (
                  <img 
                    src={thumbnailUrl} 
                    alt="Preview" 
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                );
              })()}
              
              <button 
                onClick={() => setReplyingToMessage(null)}
                className="p-1 hover:bg-accent rounded-full transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Message Input */}
          <div className="shrink-0 p-3 bg-background pb-[calc(env(safe-area-inset-bottom)+12px)] mt-auto">
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
                ref={inputRef}
                type="text" 
                placeholder={replyingToMessage ? t('typeReply', { ns: 'messages' }) : t('typeMessage', { ns: 'messages' })} 
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
        </div>
      )}

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

      {/* Instagram-style Message Options Overlay */}
      <MessageOptionsOverlay
        isOpen={!!selectedMessageId}
        onClose={() => setSelectedMessageId(null)}
        message={selectedMessage}
        isOwnMessage={selectedMessage?.sender_id === user?.id}
        onReaction={(emoji) => {
          if (selectedMessageId) {
            toggleReaction(selectedMessageId, emoji);
          }
        }}
        onReply={() => {
          if (selectedMessage) {
            setReplyingToMessage(selectedMessage);
            setSelectedMessageId(null);
            inputRef.current?.focus();
          }
        }}
        onDelete={handleDeleteMessage}
        onShowAllEmojis={() => setShowEmojiPicker(true)}
      />

      {/* Extended Emoji Picker Bottom Sheet */}
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
              </div> : <div className="space-y-1 pb-4">
                {savedPlaces.map(place => {
                  const thumbnail = getLocationThumbnail(place);
                  const translatedCategory = translateCategory(place.category, t);
                  
                  return (
                    <button 
                      key={place.id} 
                      onClick={() => handlePlaceClick(place)} 
                      className="w-full flex items-center gap-4 p-3.5 hover:bg-accent/50 active:scale-[0.98] transition-all rounded-2xl group"
                    >
                      {/* Thumbnail with category badge overlay when photo exists */}
                      <div className="relative w-14 h-14 shrink-0">
                        {thumbnail ? (
                          <>
                            <img 
                              src={thumbnail} 
                              alt={place.name} 
                              className="w-full h-full rounded-xl object-cover shadow-sm"
                            />
                            {/* Category badge in bottom right */}
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-background shadow-md flex items-center justify-center">
                              <img 
                                src={getCategoryImage(place.category)} 
                                alt={place.category} 
                                className="w-5 h-5 object-contain"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full rounded-xl bg-muted flex items-center justify-center">
                            <img 
                              src={getCategoryImage(place.category)} 
                              alt={place.category} 
                              className={`object-contain ${
                                place.category === 'restaurant' || place.category === 'hotel' 
                                  ? 'w-11 h-11' 
                                  : 'w-9 h-9'
                              }`}
                            />
                          </div>
                        )}
                      </div>

                      {/* Place info */}
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {place.name || t('location', { ns: 'common', defaultValue: 'Location' })}
                        </p>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          <CityLabel 
                            id={place.google_place_id || place.id} 
                            city={place.city} 
                            name={place.name} 
                            address={place.address} 
                            coordinates={place.coordinates} 
                          /> • {translatedCategory}
                        </p>
                      </div>
                    </button>
                  );
                })}
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
    </div></SwipeBackWrapper>;
};
export default MessagesPage;