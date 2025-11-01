import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, Send, X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { messageService, MessageThread, DirectMessage } from '@/services/messageService';
import { supabase } from '@/integrations/supabase/client';
import PlaceMessageCard from '@/components/messages/PlaceMessageCard';
import PostMessageCard from '@/components/messages/PostMessageCard';
import ProfileMessageCard from '@/components/messages/ProfileMessageCard';
import { useTranslation } from 'react-i18next';

type ViewMode = 'threads' | 'chat' | 'search';

const MessagesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (user) {
      loadThreads();
    }

    // Check if we should open a specific thread
    const state = location.state as any;
    if (state?.initialUserId) {
      handleUserSelect({ id: state.initialUserId });
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user?.id]);

  useEffect(() => {
    if (selectedThread && view === 'chat') {
      const otherParticipant = getOtherParticipant(selectedThread);
      if (otherParticipant) {
        loadMessages(otherParticipant.id);
        setupRealtimeSubscription();
      }
    }
  }, [selectedThread, view]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadThreads = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await messageService.getMessageThreads();
      setThreads(data || []);
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
      }
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

    const channel = supabase
      .channel(`messages-${selectedThread.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${user.id},receiver_id=eq.${otherParticipant.id}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as DirectMessage]);
        }
      )
      .subscribe();

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
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleBack = () => {
    // Always return to previous page as requested
    navigate(-1);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name')
        .ilike('username', `%${query}%`)
        .neq('id', user?.id)
        .limit(20);

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

    const existingThread = threads.find(
      (t) =>
        (t.participant_1_id === user.id && t.participant_2_id === selectedUser.id) ||
        (t.participant_2_id === user.id && t.participant_1_id === selectedUser.id)
    );

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
        other_user: selectedUser,
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

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return `${Math.floor(diffMins / 1440)}d`;
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleBack}
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-lg text-foreground">
              {view === 'chat'
                ? getOtherParticipant(selectedThread!)?.username || t('chat', { ns: 'messages' })
                : view === 'search'
                ? t('newMessage', { ns: 'messages' })
                : t('messages', { ns: 'messages' })}
            </h1>
          </div>

          {view === 'threads' && (
            <Button
              onClick={() => setView('search')}
              variant="ghost"
              size="sm"
              className="font-medium"
            >
              {t('new', { ns: 'messages' })}
            </Button>
          )}
        </div>
      </header>

      {/* Search View */}
      {view === 'search' && (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="shrink-0 p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('searchUsers', { ns: 'messages' })}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              {searchLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="divide-y divide-border">
                {searchResults.map((result) => (
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
                      {result.full_name && (
                        <p className="text-sm text-muted-foreground">{result.full_name}</p>
                      )}
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

      {/* Threads View */}
      {view === 'threads' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-3">
                <MessageSquare className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{t('noMessages', { ns: 'messages' })}</h3>
              <p className="text-muted-foreground text-sm mb-4">{t('startConversation', { ns: 'messages' })}</p>
              <Button onClick={() => setView('search')} size="sm">
                {t('newMessage', { ns: 'messages' })}
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {threads.map((thread) => {
                const otherParticipant = getOtherParticipant(thread);
                if (!otherParticipant) return null;

                return (
                  <button
                    key={thread.id}
                    onClick={() => handleThreadSelect(thread)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors"
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={otherParticipant.avatar_url} />
                      <AvatarFallback>{otherParticipant.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-semibold text-foreground truncate">
                          {otherParticipant.username}
                        </p>
                        <span className="text-xs text-muted-foreground ml-2">
                          {thread.last_message_at && formatMessageTime(thread.last_message_at)}
                        </span>
                      </div>
                       <p className="text-sm text-muted-foreground truncate">
                        {thread.last_message?.content || t('startConversation', { ns: 'messages' })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          </ScrollArea>
        </div>
      )}

      {/* Chat View */}
      {view === 'chat' && (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full p-4 bg-muted/30">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {messages.map((message) => {
                  const isOwn = message.sender_id === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      {['place_share', 'post_share', 'profile_share'].includes(message.message_type) &&
                      message.shared_content ? (
                        <div className={`max-w-[85%] ${isOwn ? 'ml-8' : 'mr-8'}`}>
                          {message.content && (
                            <div
                              className={`rounded-2xl px-4 py-3 mb-2 ${
                                isOwn
                                  ? 'bg-primary text-primary-foreground ml-auto max-w-fit'
                                  : 'bg-card text-card-foreground border border-border'
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                            </div>
                          )}
                          <div className="bg-card rounded-2xl border border-border overflow-hidden">
                            {message.message_type === 'place_share' && (
                              <PlaceMessageCard
                                placeData={message.shared_content}
                                onViewPlace={(placeData) => {
                                  navigate('/explore', { 
                                    state: { 
                                      sharedPlace: {
                                        id: placeData.place_id || placeData.google_place_id || '',
                                        google_place_id: placeData.google_place_id || placeData.place_id || '',
                                        name: placeData.name || '',
                                        category: placeData.category || 'place',
                                        address: placeData.address || '',
                                        city: placeData.city || '',
                                        coordinates: placeData.coordinates || { lat: 0, lng: 0 }
                                      }
                                    }
                                  });
                                }}
                              />
                            )}
                            {message.message_type === 'post_share' && (
                              <PostMessageCard postData={message.shared_content} />
                            )}
                            {message.message_type === 'profile_share' && (
                              <ProfileMessageCard profileData={message.shared_content} />
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className={`max-w-[70%] ${isOwn ? 'ml-16' : 'mr-16'}`}>
                          <div
                            className={`rounded-2xl px-4 py-3 ${
                              isOwn
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-card text-card-foreground border border-border'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                          </div>
                          <p
                            className={`text-xs mt-1 px-1 ${
                              isOwn ? 'text-muted-foreground text-right' : 'text-muted-foreground'
                            }`}
                          >
                            {formatMessageTime(message.created_at)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
            </ScrollArea>
          </div>

          {/* Message Input */}
          <div className="shrink-0 p-4 bg-background border-t border-border">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder={t('typeMessage', { ns: 'messages' })}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={sending}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                size="icon"
                className="flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
