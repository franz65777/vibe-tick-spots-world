import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { messageService, MessageThread, DirectMessage } from '@/services/messageService';
import { realtimeChatService } from '@/services/realtimeChatService';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import PlaceMessageCard from './messages/PlaceMessageCard';
import PostMessageCard from './messages/PostMessageCard';
import { useNavigate } from 'react-router-dom';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUserId?: string | null;
}

const MessagesModal = ({ isOpen, onClose, initialUserId }: MessagesModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'threads' | 'chat' | 'search'>('threads');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadThreads();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (initialUserId && threads.length > 0) {
      const thread = threads.find(
        (t) => t.participant_1_id === initialUserId || t.participant_2_id === initialUserId
      );
      if (thread) {
        handleThreadSelect(thread);
      }
    }
  }, [initialUserId, threads]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Setup realtime subscription for selected thread
  useEffect(() => {
    if (!selectedThread || !user) return;

    const otherUserId =
      selectedThread.participant_1_id === user.id
        ? selectedThread.participant_2_id
        : selectedThread.participant_1_id;

    const unsubscribe = realtimeChatService.subscribeToThread(
      user.id,
      otherUserId,
      (newMessage) => {
        setMessages((prev) => [...prev, newMessage as DirectMessage]);
        scrollToBottom();
      }
    );

    return () => {
      unsubscribe();
    };
  }, [selectedThread, user]);

  const loadThreads = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userThreads = await messageService.getMessageThreads();
      setThreads(userThreads);
    } catch (error) {
      console.error('Error loading threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (otherUserId: string) => {
    setLoading(true);
    try {
      const threadMessages = await messageService.getMessagesInThread(otherUserId);
      setMessages(threadMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleThreadSelect = async (thread: MessageThread) => {
    setSelectedThread(thread);
    setView('chat');
    const otherUserId =
      thread.participant_1_id === user?.id ? thread.participant_2_id : thread.participant_1_id;
    await loadMessages(otherUserId);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedThread || !user) return;
    try {
      const otherParticipantId =
        selectedThread.participant_1_id === user.id
          ? selectedThread.participant_2_id
          : selectedThread.participant_1_id;
      await messageService.sendTextMessage(otherParticipantId, newMessage.trim());
      setNewMessage('');
      await loadMessages(otherParticipantId);
      await loadThreads();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getOtherParticipant = (thread: MessageThread) => {
    return thread.participant_1_id === user?.id ? thread.other_user : thread.other_user;
  };

  const formatMessageTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const handleBack = () => {
    if (view === 'chat') {
      setView('threads');
      setSelectedThread(null);
      setMessages([]);
    } else if (view === 'search') {
      setView('threads');
      setSearchQuery('');
      setSearchResults([]);
    } else {
      onClose();
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, bio')
        .ilike('username', `%${query}%`)
        .neq('id', user?.id || '')
        .limit(20);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleUserSelect = async (userId: string) => {
    // Check if there's already a thread with this user
    const existingThread = threads.find(
      (t) => t.participant_1_id === userId || t.participant_2_id === userId
    );

    if (existingThread) {
      handleThreadSelect(existingThread);
    } else {
      // Create a new thread/conversation
      const selectedUser = searchResults.find((u) => u.id === userId);
      if (selectedUser) {
        const newThread: MessageThread = {
          id: `temp-${userId}`,
          participant_1_id: user?.id || '',
          participant_2_id: userId,
          last_message_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          other_user: selectedUser,
        };
        setSelectedThread(newThread);
        setView('chat');
        setMessages([]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md h-[85vh] sm:h-[80vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleBack}
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              {view === 'threads' ? (
                <X className="w-5 h-5" />
              ) : (
                <ArrowLeft className="w-5 h-5" />
              )}
            </Button>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
              {view === 'chat'
                ? getOtherParticipant(selectedThread!)?.username || 'Chat'
                : view === 'search'
                ? 'New Message'
                : 'Messages'}
            </h3>
          </div>

          {view === 'threads' && (
            <Button
              onClick={() => setView('search')}
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              New
            </Button>
          )}
        </div>

        {/* Search View */}
        {view === 'search' && (
          <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
            <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search for people..."
                  className="pl-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  autoFocus
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {searching ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="p-2">
                  {searchResults.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => handleUserSelect(profile.id)}
                      className="w-full p-3 flex items-center gap-3 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-colors"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={profile.avatar_url} />
                        <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                          {profile.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {profile.username}
                        </p>
                        {profile.bio && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {profile.bio}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.trim() ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <p className="text-gray-500 dark:text-gray-400">No users found</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    Search for people to start a conversation
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Threads List */}
        {view === 'threads' && (
          <ScrollArea className="flex-1 bg-gray-50 dark:bg-gray-950">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <p className="font-semibold text-gray-900 dark:text-white mb-2">
                  No messages yet
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Start a conversation with someone
                </p>
                <Button onClick={() => setView('search')} className="rounded-full">
                  New Message
                </Button>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {threads.map((thread) => {
                  const otherParticipant = getOtherParticipant(thread);
                  return (
                    <button
                      key={thread.id}
                      onClick={() => handleThreadSelect(thread)}
                      className="w-full p-3 text-left hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={otherParticipant?.avatar_url} />
                          <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                            {otherParticipant?.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">
                              {otherParticipant?.username}
                            </p>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              {thread.last_message_at && formatMessageTime(thread.last_message_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {thread.last_message?.content || 'Start a conversation'}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        )}

        {/* Chat View */}
        {view === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0 bg-gray-50 dark:bg-gray-950">
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isOwn = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        {['place_share', 'post_share'].includes(message.message_type) &&
                        message.shared_content ? (
                          <div className={`max-w-[85%] ${isOwn ? 'ml-8' : 'mr-8'}`}>
                            {message.content && (
                              <div
                                className={`rounded-2xl px-4 py-3 mb-2 ${
                                  isOwn
                                    ? 'bg-blue-600 text-white ml-auto max-w-fit'
                                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                                }`}
                              >
                                <p className="text-sm">{message.content}</p>
                              </div>
                            )}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                              {message.message_type === 'place_share' && (
                                <PlaceMessageCard
                                  placeData={message.shared_content}
                                  onViewPlace={(placeData) => {
                                    // Close the message modal
                                    onClose();
                                    // Navigate to /explore and open location
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
                            </div>
                          </div>
                        ) : (
                          <div className={`max-w-[70%] ${isOwn ? 'ml-16' : 'mr-16'}`}>
                            <div
                              className={`rounded-2xl px-4 py-3 ${
                                isOwn
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                            </div>
                            <p
                              className={`text-xs mt-1 px-1 ${
                                isOwn ? 'text-gray-500 text-right' : 'text-gray-500'
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
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
              <div className="flex gap-2 items-end">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-2xl bg-gray-50 dark:bg-gray-800"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="rounded-2xl bg-blue-600 hover:bg-blue-700"
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesModal;
