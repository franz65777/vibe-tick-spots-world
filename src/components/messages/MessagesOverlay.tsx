import React, { memo, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Send, X, Image, Trash2 } from 'lucide-react';
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
import { translateCategory } from '@/utils/translateCategory';
import { useRealtimeEvent } from '@/hooks/useCentralizedRealtime';
import VirtualizedThreadList from '@/components/messages/VirtualizedThreadList';
import VirtualizedMessageList from '@/components/messages/VirtualizedMessageList';
import MessageOptionsOverlay from '@/components/messages/MessageOptionsOverlay';
import { useMessagesOverlay } from '@/contexts/MessagesOverlayContext';

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

interface MessagesOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = 'threads' | 'chat' | 'search';

const MessagesOverlay = memo(({ isOpen, onClose }: MessagesOverlayProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { initialUserId, fromProfileId, clearInitialUserId } = useMessagesOverlay();
  
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
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
  const [messageReactions, setMessageReactions] = useState<Record<string, { emoji: string; user_id: string }[]>>({});
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
  
  // Ref to track if this overlay set the data-modal-open attribute
  const didSetModalOpenRef = useRef(false);
  
  const { stories: allStories } = useStories();
  const { frequentContacts, loading: frequentLoading, refresh: refreshFrequent } = useFrequentContacts();
  const { suggestedContacts, loading: suggestedLoading, refresh: refreshSuggested } = useSuggestedContacts(frequentContacts.map(c => c.id));

  // Get the full selected message object for the overlay
  const selectedMessage = useMemo(() => {
    if (!selectedMessageId) return null;
    return messages.find(m => m.id === selectedMessageId) || null;
  }, [selectedMessageId, messages]);

  // Manage data-modal-open - only reacts to isOpen changes
  useEffect(() => {
    if (isOpen) {
      didSetModalOpenRef.current = true;
      document.body.setAttribute('data-modal-open', 'true');
      window.dispatchEvent(new CustomEvent('ui:overlay-open'));
      // Close other overlays to prevent stacking
      window.dispatchEvent(new CustomEvent('close-search-drawer'));
      window.dispatchEvent(new CustomEvent('close-filter-dropdown'));
      window.dispatchEvent(new CustomEvent('close-city-selector'));
      window.dispatchEvent(new CustomEvent('close-list-view'));
    } else if (didSetModalOpenRef.current) {
      didSetModalOpenRef.current = false;
      document.body.removeAttribute('data-modal-open');
      window.dispatchEvent(new CustomEvent('ui:overlay-close'));
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && view === 'threads') onClose();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, view]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (didSetModalOpenRef.current) {
        document.body.removeAttribute('data-modal-open');
        window.dispatchEvent(new CustomEvent('ui:overlay-close'));
      }
    };
  }, []);

  // Get other participant helper - uses other_user from MessageThread
  const getOtherParticipant = useCallback((thread: MessageThread) => {
    if (!user || !thread.other_user) return null;
    return thread.other_user;
  }, [user]);

  const otherParticipant = useMemo(() => {
    if (!selectedThread) return null;
    return getOtherParticipant(selectedThread);
  }, [selectedThread, getOtherParticipant]);

  // Load threads
  const loadThreads = useCallback(async () => {
    if (!user) return;
    try {
      setThreadsLoading(true);
      const data = await messageService.getMessageThreads(false);
      setThreads(data || []);

      const otherUserIds = (data || [])
        .map(thread => getOtherParticipant(thread)?.id)
        .filter((id): id is string => !!id);

      if (otherUserIds.length === 0) {
        setThreadsLoading(false);
        return;
      }

      const [unreadResults, storiesResult] = await Promise.all([
        supabase
          .from('direct_messages')
          .select('sender_id')
          .in('sender_id', otherUserIds)
          .eq('receiver_id', user.id)
          .eq('is_read', false),
        supabase
          .from('stories')
          .select('user_id')
          .in('user_id', otherUserIds)
          .gt('expires_at', new Date().toISOString())
      ]);

      const counts: Record<string, number> = {};
      if (unreadResults.data) {
        for (const msg of unreadResults.data) {
          counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
        }
      }
      setUnreadCounts(counts);

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
      setThreadsLoading(false);
    }
  }, [user, getOtherParticipant]);

  // Load messages
  const loadMessages = useCallback(async (otherUserId: string) => {
    try {
      const isFirstLoad = messages.length === 0;
      if (isFirstLoad) {
        setMessagesLoading(true);
      }
      
      const data = await messageService.getMessagesInThread(otherUserId);
      setMessages(data || []);

      if (user && data && data.length > 0) {
        messageService.markMessagesAsRead(otherUserId);
        setUnreadCounts(prev => ({
          ...prev,
          [otherUserId]: 0
        }));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  }, [user, messages.length]);

  // Load hidden messages
  const loadHiddenMessages = async () => {
    try {
      const hiddenIds = await messageService.getHiddenMessages();
      setHiddenMessageIds(hiddenIds);
    } catch (error) {
      console.error('Error loading hidden messages:', error);
    }
  };

  // Load other user profile
  const loadOtherUserProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name')
        .eq('id', userId)
        .single();
      setOtherUserProfile(data);
    } catch (error) {
      console.error('Error loading other user profile:', error);
    }
  };

  // Use centralized realtime for messages
  const selectedThreadIdRef = useRef<string | null>(null);
  const selectedOtherUserIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (selectedThread) {
      selectedThreadIdRef.current = selectedThread.id;
      const other = getOtherParticipant(selectedThread);
      selectedOtherUserIdRef.current = other?.id || null;
    } else {
      selectedThreadIdRef.current = null;
      selectedOtherUserIdRef.current = null;
    }
  }, [selectedThread, getOtherParticipant]);
  
  useRealtimeEvent('message_insert', useCallback((payload: any) => {
    if (!selectedOtherUserIdRef.current || !user) return;
    if (payload.sender_id === selectedOtherUserIdRef.current || 
        (payload.sender_id === user.id && payload.receiver_id === selectedOtherUserIdRef.current)) {
      setMessages(prev => {
        if (prev.some(m => m.id === payload.id)) return prev;
        return [...prev, payload as DirectMessage];
      });
    }
  }, [user]));

  // Legacy cleanup
  const setupRealtimeSubscription = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  // Load on open
  useEffect(() => {
    if (isOpen && user) {
      loadThreads();
    }
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [isOpen, user?.id, loadThreads]);

  // Handle initial user ID from context
  useEffect(() => {
    const loadInitialThread = async () => {
      if (isOpen && initialUserId && user) {
        const { data: userProfile, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, full_name')
          .eq('id', initialUserId)
          .single();
          
        if (userProfile && !error) {
          if (fromProfileId) {
            setOpenedFromProfileId(fromProfileId);
          }
          await handleUserSelect(userProfile);
          clearInitialUserId();
        }
      }
    };
    loadInitialThread();
  }, [isOpen, initialUserId, user, fromProfileId, clearInitialUserId]);

  // Handle thread/chat changes
  useEffect(() => {
    if (selectedThread && view === 'chat') {
      const other = getOtherParticipant(selectedThread);
      if (other) {
        Promise.all([
          loadMessages(other.id),
          loadHiddenMessages(),
          loadOtherUserProfile(other.id),
        ]);
        setupRealtimeSubscription();
      }
    } else if (view === 'threads') {
      loadThreads();
    }
  }, [selectedThread, view, getOtherParticipant, loadMessages, loadThreads, setupRealtimeSubscription]);

  // Refresh contacts on search view
  useEffect(() => {
    if (view === 'search') {
      refreshFrequent();
      refreshSuggested();
    }
  }, [view, refreshFrequent, refreshSuggested]);

  // Auto-focus input when entering chat view
  useEffect(() => {
    if (view === 'chat' && !replyingToMessage) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [view, replyingToMessage]);

  // Handlers
  const handleThreadSelect = useCallback((thread: MessageThread) => {
    setMessages([]);
    setSelectedThread(thread);
    setView('chat');
  }, []);

  const handleUserSelect = useCallback(async (selectedUser: any) => {
    if (!user) return;
    
    const existingThread = threads.find(t => {
      const other = getOtherParticipant(t);
      return other?.id === selectedUser.id;
    });

    if (existingThread) {
      handleThreadSelect(existingThread);
    } else {
      const virtualThread: MessageThread = {
        id: `temp-${selectedUser.id}`,
        participant_1_id: user.id,
        participant_2_id: selectedUser.id,
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        other_user: selectedUser,
        last_message: undefined
      };
      setSelectedThread(virtualThread);
      setView('chat');
    }
    setSearchQuery('');
    setSearchResults([]);
  }, [user, threads, getOtherParticipant, handleThreadSelect]);

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedThread || !user) return;
    const other = getOtherParticipant(selectedThread);
    if (!other) return;
    
    const messageContent = newMessage.trim();
    const replyTo = replyingToMessage;
    
    setNewMessage('');
    setReplyingToMessage(null);
    
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: DirectMessage = {
      id: tempId,
      sender_id: user.id,
      receiver_id: other.id,
      content: messageContent,
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
      shared_content: replyTo ? {
        reply_to_id: replyTo.id,
        reply_to_content: replyTo.content || '',
        reply_to_sender_id: replyTo.sender_id,
        reply_to_message_type: replyTo.message_type,
        reply_to_shared_content: replyTo.shared_content || null,
      } : null,
      sender: {
        username: user.user_metadata?.username || 'You',
        full_name: user.user_metadata?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url || ''
      }
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    try {
      const sentMessage = await messageService.sendTextMessage(
        other.id, 
        messageContent, 
        replyTo || undefined
      );
      
      if (sentMessage) {
        setMessages(prev => 
          prev.map(m => m.id === tempId ? sentMessage : m)
        );
      }
      
      loadThreads();
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  }, [newMessage, selectedThread, user, replyingToMessage, getOtherParticipant, loadThreads]);

  const handleBack = useCallback(() => {
    if (view === 'chat') {
      if (openedFromProfileId) {
        onClose();
        navigate(`/profile/${openedFromProfileId}`, { replace: true });
        return;
      }
      setView('threads');
      setSelectedThread(null);
      setMessages([]);
      setOpenedFromProfileId(null);
    } else if (view === 'search') {
      setView('threads');
      setSearchQuery('');
      setSearchResults([]);
    } else {
      onClose();
    }
  }, [view, openedFromProfileId, navigate, onClose]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .neq('id', user?.id)
        .limit(20);

      if (!error && data) {
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchLoading(false);
    }
  }, [user?.id]);

  const handleLongPressStart = (messageId: string) => {
    const timer = setTimeout(() => {
      setSelectedMessageId(messageId);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
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

  const handleDoubleTap = async (messageId: string) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
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
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user?.id);
        
        if (!error) {
          setMessageReactions(prev => ({
            ...prev,
            [messageId]: reactions.filter(r => r.user_id !== user?.id)
          }));
        }
      } else {
        if (userReaction) {
          await supabase
            .from('message_reactions')
            .delete()
            .eq('message_id', messageId)
            .eq('user_id', user?.id);
        }
        
        const { error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: user?.id,
            emoji
          });
        
        if (!error) {
          const newReactions = reactions.filter(r => r.user_id !== user?.id);
          newReactions.push({ emoji, user_id: user?.id || '' });
          setMessageReactions(prev => ({
            ...prev,
            [messageId]: newReactions
          }));
        }
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  const handleAvatarClickInThread = useCallback(async (userId: string) => {
    const userStories = allStories.filter(s => s.user_id === userId);
    if (userStories.length > 0) {
      setStoriesToShow(userStories.map(s => ({
        id: s.id,
        user: {
          id: s.user_id,
          username: (s as any).profiles?.username || '',
          avatarUrl: (s as any).profiles?.avatar_url || ''
        },
        mediaUrl: s.media_url,
        createdAt: s.created_at,
        expiresAt: s.expires_at,
        locationId: s.location_id,
        locationName: (s as any).locations?.name || '',
        locationCategory: (s as any).locations?.category || '',
        locationLat: (s as any).locations?.latitude || '',
        locationLng: (s as any).locations?.longitude || '',
        caption: s.caption
      })));
      setInitialStoryIndex(0);
      setShowStories(true);
    }
  }, [allStories]);

  // Convert stories for StoriesViewer
  const convertedStories = useMemo(() => {
    if (!otherParticipant) return [];
    const userStories = allStories.filter(s => s.user_id === otherParticipant.id);
    return userStories.map(s => ({
      id: s.id,
      user: {
        id: s.user_id,
        username: otherParticipant.username || '',
        avatarUrl: otherParticipant.avatar_url || ''
      },
      mediaUrl: s.media_url,
      createdAt: s.created_at,
      expiresAt: s.expires_at,
      locationId: s.location_id,
      locationName: (s as any).locations?.name || '',
      locationCategory: (s as any).locations?.category || '',
      locationLat: (s as any).locations?.latitude || '',
      locationLng: (s as any).locations?.longitude || '',
      caption: s.caption
    }));
  }, [allStories, otherParticipant]);

  const handleReplyToStory = async (storyId: string, userId: string, message: string) => {
    console.log('Story reply:', { storyId, userId, message });
  };

  // Format message time
  const formatMessageTime = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);

    const currentLang = i18n.language || 'en';
    if (diffMins < 1) return t('justNow', { ns: 'messages' });

    if (diffMins < 60) {
      return `${diffMins}${currentLang === 'it' ? 'min' : 'm'}`;
    }
    if (diffHours < 24) {
      return `${diffHours}h`;
    }

    if (diffDays < 6) {
      return `${diffDays}${currentLang === 'it' ? 'g' : 'd'}`;
    }

    if (diffWeeks < 4) {
      return diffWeeks === 1 ? `1 ${t('week', { ns: 'common' })}` : `${diffWeeks} ${t('weeks', { ns: 'common' })}`;
    }

    const day = date.getDate();
    const month = date.getMonth();
    const monthAbbr = t(`monthsAbbr.${month}`, { ns: 'common' });
    return `${day} ${monthAbbr}`;
  }, [i18n.language, t]);

  if (!isOpen) return null;

  const overlay = (
    <div className="fixed inset-0 z-[2147483640] flex flex-col bg-background/40 backdrop-blur-xl">
      <div className="h-screen w-full flex flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
        {/* Header */}
        <header className="shrink-0 w-full">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {view !== 'search' && (
                <Button onClick={handleBack} variant="ghost" size="icon" className="rounded-full flex-shrink-0 h-8 w-8">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              
              {view === 'chat' && otherParticipant ? (
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button 
                    onClick={() => {
                      if (convertedStories && convertedStories.length > 0) {
                        setInitialStoryIndex(0);
                        setShowStories(true);
                      }
                    }} 
                    className="flex-shrink-0 relative"
                  >
                    <Avatar className={`w-10 h-10 ${convertedStories && convertedStories.length > 0 ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}`}>
                      <AvatarImage src={otherParticipant.avatar_url} />
                      <AvatarFallback>{otherParticipant.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </button>
                  <button 
                    onClick={() => {
                      onClose();
                      navigate(`/profile/${otherParticipant.id}`, {
                        state: { returnTo: 'chat', chatUserId: otherParticipant.id }
                      });
                    }} 
                    className="min-w-0 text-left hover:opacity-80 transition-opacity"
                  >
                    <h1 className="font-semibold text-base text-foreground truncate">
                      {otherParticipant.username}
                    </h1>
                  </button>
                </div>
              ) : view === 'search' ? (
                <>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="text" 
                      placeholder={t('searchPlaceholder', { ns: 'messages' })} 
                      value={searchQuery} 
                      onChange={e => handleSearch(e.target.value)} 
                      className="pl-9 h-9 bg-muted/50 rounded-full" 
                      autoFocus 
                    />
                  </div>
                  <Button 
                    onClick={() => {
                      setView('threads');
                      setSearchQuery('');
                      setSearchResults([]);
                    }} 
                    variant="ghost" 
                    className="text-sm font-medium text-primary hover:text-primary/80 px-3"
                  >
                    {t('cancel', { ns: 'common' })}
                  </Button>
                </>
              ) : view === 'threads' ? (
                <div className="flex-1 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="text" 
                      placeholder={t('searchPlaceholder', { ns: 'messages' })} 
                      value={searchQuery} 
                      onChange={e => handleSearch(e.target.value)} 
                      onFocus={() => setView('search')} 
                      className="pl-9 h-9 bg-muted/50 rounded-full" 
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {/* Search View */}
        {view === 'search' && (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full">
                {searchQuery.length === 0 && (
                  <div className="py-6 space-y-8">
                    {/* Frequent Contacts */}
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-4 text-center">
                        {t('frequentContacts', { ns: 'messages' })}
                      </h3>
                      {frequentLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : frequentContacts.length > 0 ? (
                        <div className="flex flex-wrap gap-4 justify-center px-4">
                          {frequentContacts.map(contact => (
                            <button 
                              key={contact.id} 
                              onClick={() => handleUserSelect(contact)} 
                              className="flex flex-col items-center gap-2 group"
                            >
                              <Avatar className="w-16 h-16 border-2 border-transparent group-hover:border-primary transition-colors">
                                <AvatarImage src={contact.avatar_url} />
                                <AvatarFallback>{contact.username?.[0]?.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-center font-medium truncate max-w-[64px]">
                                {contact.username}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-sm text-muted-foreground">
                          {t('noFrequentContacts', { ns: 'messages' })}
                        </p>
                      )}
                    </div>

                    {/* Suggested Contacts */}
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-4 text-center">
                        {t('suggestedContacts', { ns: 'messages' })}
                      </h3>
                      {suggestedLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : suggestedContacts.length > 0 ? (
                        <div className="flex flex-wrap gap-4 justify-center px-4">
                          {suggestedContacts.map(contact => (
                            <button 
                              key={contact.id} 
                              onClick={() => handleUserSelect(contact)} 
                              className="flex flex-col items-center gap-2 group"
                            >
                              <Avatar className="w-16 h-16 border-2 border-transparent group-hover:border-primary transition-colors">
                                <AvatarImage src={contact.avatar_url} />
                                <AvatarFallback>{contact.username?.[0]?.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-center font-medium truncate max-w-[64px]">
                                {contact.username}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : frequentContacts.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground px-6">
                          {t('followPeoplePrompt', { ns: 'messages' })}
                        </p>
                      ) : (
                        <p className="text-center text-sm text-muted-foreground">
                          {t('noSuggestedContacts', { ns: 'messages' })}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {searchLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : searchQuery.length >= 2 && searchResults.length > 0 ? (
                  <div className="divide-y divide-border">
                    {searchResults.map(result => (
                      <button 
                        key={result.id} 
                        onClick={() => handleUserSelect(result)} 
                        className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors"
                      >
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={result.avatar_url} />
                          <AvatarFallback>{result.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-foreground">{result.username}</p>
                          {result.full_name && <p className="text-sm text-muted-foreground">{result.full_name}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : searchQuery.length >= 2 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                    <p className="text-muted-foreground">{t('noUsersFound', { ns: 'messages' })}</p>
                  </div>
                ) : null}
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Threads View - Virtualized for 60fps */}
        {view === 'threads' && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <VirtualizedThreadList
              threads={threads}
              loading={threadsLoading}
              userId={user?.id}
              unreadCounts={unreadCounts}
              hasActiveStoryInThread={hasActiveStoryInThread}
              onThreadSelect={handleThreadSelect}
              onAvatarClick={(thread: MessageThread) => {
                const other = getOtherParticipant(thread);
                if (other) handleAvatarClickInThread(other.id);
              }}
              onNewMessage={() => setView('search')}
              formatMessageTime={formatMessageTime}
              getOtherParticipant={getOtherParticipant}
            />
          </div>
        )}

        {/* Chat View - Virtualized for 60fps */}
        {view === 'chat' && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div ref={chatViewportWrapperRef} className="flex-1 min-h-0 overflow-hidden">
              <VirtualizedMessageList
                messages={messages}
                loading={messagesLoading}
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
                  const lat = placeData.latitude ?? placeData.coordinates?.lat ?? 0;
                  const lng = placeData.longitude ?? placeData.coordinates?.lng ?? 0;
                  const googlePlaceId = placeData.google_place_id || placeData.place_id || '';
                  
                  onClose();
                  navigate('/', {
                    state: {
                      showLocationCard: true,
                      locationData: {
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
                    {replyingToMessage.content || t('sharedContent', { ns: 'messages' })}
                  </p>
                </div>
                <button 
                  onClick={() => setReplyingToMessage(null)}
                  className="p-1 hover:bg-accent rounded-full transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            )}

            {/* Message Input */}
            <div className="shrink-0 p-3 bg-background/60 pb-[calc(env(safe-area-inset-bottom)+12px)] mt-auto">
              <div className="flex items-center gap-2">
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
        {showStories && convertedStories && convertedStories.length > 0 && (
          <StoriesViewer 
            stories={storiesToShow.length > 0 ? storiesToShow : convertedStories} 
            initialStoryIndex={initialStoryIndex} 
            onClose={() => {
              setShowStories(false);
              setStoriesToShow([]);
            }} 
            onStoryViewed={() => {}} 
            onReplyToStory={handleReplyToStory} 
          />
        )}

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
              <SheetTitle className="text-center">{t('selectEmoji', { ns: 'messages' })}</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-8 gap-2 pt-4 max-h-[300px] overflow-y-auto">
              {['❤️', '👍', '😂', '😮', '😢', '🙏', '👏', '🔥', '🎉', '💯', '😍', '🤔', '😎', '🥳', '💪', '✨'].map(emoji => (
                <button 
                  key={emoji} 
                  className="text-3xl p-2 hover:bg-accent rounded-lg transition-colors" 
                  onClick={() => {
                    if (selectedMessageId) {
                      toggleReaction(selectedMessageId, emoji);
                      setShowEmojiPicker(false);
                      setSelectedMessageId(null);
                    }
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
});

MessagesOverlay.displayName = 'MessagesOverlay';

export default MessagesOverlay;
