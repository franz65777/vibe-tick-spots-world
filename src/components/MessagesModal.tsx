import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Send, ArrowLeft, Phone, Video, MoreHorizontal, Smile, Paperclip, Mic } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { messageService, MessageThread, DirectMessage } from '@/services/messageService';
import { formatDistanceToNow } from 'date-fns';
import PlaceMessageCard from './messages/PlaceMessageCard';
import PostMessageCard from './messages/PostMessageCard';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUserId?: string | null;
}
const MessagesModal = ({
  isOpen,
  onClose,
  initialUserId
}: MessagesModalProps) => {
  const {
    user
  } = useAuth();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'threads' | 'chat'>('threads');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen && user) {
      loadThreads();
    }
  }, [isOpen, user]);
  useEffect(() => {
    if (initialUserId && threads.length > 0) {
      const thread = threads.find(t => t.participant_1_id === initialUserId || t.participant_2_id === initialUserId);
      if (thread) {
        handleThreadSelect(thread);
      }
    }
  }, [initialUserId, threads]);
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
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
    const otherUserId = thread.participant_1_id === user?.id ? thread.participant_2_id : thread.participant_1_id;
    await loadMessages(otherUserId);
  };
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedThread || !user) return;
    try {
      const otherParticipantId = selectedThread.participant_1_id === user.id ? selectedThread.participant_2_id : selectedThread.participant_1_id;
      await messageService.sendTextMessage(otherParticipantId, newMessage.trim());
      setNewMessage('');
      await loadMessages(otherParticipantId);
      await loadThreads();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  };
  const getOtherParticipant = (thread: MessageThread) => {
    return thread.participant_1_id === user?.id ? thread.other_user : thread.other_user;
  };
  const formatMessageTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), {
      addSuffix: true
    });
  };
  const handleBack = () => {
    if (view === 'chat') {
      setView('threads');
      setSelectedThread(null);
      setMessages([]);
    } else {
      onClose();
    }
  };
  return <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-full h-full md:max-w-2xl md:h-[85vh] p-0 overflow-hidden rounded-3xl border-0 shadow-2xl">
      {/* Enhanced Header */}
      <DialogHeader className="relative p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div className="relative flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack} 
            className="h-10 w-10 rounded-xl hover:bg-white/50 transition-colors" 
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </Button>
          
          {view === 'threads' ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg">
                <Send className="w-5 h-5 text-white" />
              </div>
              <DialogTitle className="text-xl font-bold text-gray-900">Messages</DialogTitle>
              {threads.length > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 font-medium">
                  {threads.length}
                </Badge>
              )}
            </div>
          ) : selectedThread && (
            <div className="flex items-center gap-3 flex-1">
              <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                <AvatarImage src={getOtherParticipant(selectedThread)?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white font-semibold">
                  {getOtherParticipant(selectedThread)?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-semibold text-gray-900 truncate">
                  {getOtherParticipant(selectedThread)?.username}
                </DialogTitle>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-xs text-gray-500">Active now</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white/50">
                  <Phone className="h-4 w-4 text-gray-600" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white/50">
                  <Video className="h-4 w-4 text-gray-600" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white/50">
                  <MoreHorizontal className="h-4 w-4 text-gray-600" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogHeader>

      {view === 'threads' ? <div className="flex-1 flex flex-col bg-gray-50">
          {/* Enhanced Search */}
          <div className="p-4 bg-white border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                placeholder="Search conversations" 
                className="pl-10 h-11 bg-gray-50 border-gray-200 rounded-xl focus:bg-white focus:border-blue-300 transition-colors" 
              />
            </div>
          </div>

          {/* Threads list */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-600">Loading conversations...</span>
                </div>
              </div>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
                  <Send className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 text-lg">No conversations yet</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                  Start connecting with friends and share your favorite places together!
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {threads.map(thread => {
                  const otherParticipant = getOtherParticipant(thread);
                  return (
                    <button
                      key={thread.id}
                      onClick={() => handleThreadSelect(thread)}
                      className="w-full p-4 text-left hover:bg-white rounded-2xl transition-all duration-200 hover:shadow-sm border border-transparent hover:border-gray-100"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="h-14 w-14 ring-2 ring-white shadow-sm">
                            <AvatarImage src={otherParticipant?.avatar_url} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white font-semibold text-lg">
                              {otherParticipant?.username?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-semibold text-gray-900 truncate text-base">
                              {otherParticipant?.username}
                            </h3>
                            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                              {thread.last_message_at && formatMessageTime(thread.last_message_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 truncate">
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
        </div> : <div className="flex-1 flex flex-col bg-gray-50">
          {/* Enhanced Messages */}
          <ScrollArea className="flex-1 p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map(message => {
                  const isOwn = message.sender_id === user?.id;
                  return (
                    <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      {(['place_share', 'post_share'].includes(message.message_type) && message.shared_content) ? (
                        <div className={`max-w-[85%] ${isOwn ? 'ml-8' : 'mr-8'}`}>
                          {message.content && (
                            <div className={`rounded-2xl px-4 py-3 mb-2 ${
                              isOwn 
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white ml-auto max-w-fit' 
                                : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                            }`}>
                              <p className="text-sm leading-relaxed">{message.content}</p>
                            </div>
                          )}
                          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            {message.message_type === 'place_share' && (
                              <PlaceMessageCard placeData={message.shared_content} onViewPlace={() => {}} />
                            )}
                            {message.message_type === 'post_share' && (
                              <PostMessageCard postData={message.shared_content} />
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className={`max-w-[70%] ${isOwn ? 'ml-16' : 'mr-16'}`}>
                          <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                            isOwn 
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                              : 'bg-white text-gray-900 border border-gray-200'
                          }`}>
                            <p className="text-sm leading-relaxed">{message.content}</p>
                          </div>
                          <p className={`text-xs mt-1 px-1 ${
                            isOwn ? 'text-gray-500 text-right' : 'text-gray-500'
                          }`}>
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

          {/* Enhanced Message input */}
          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex gap-3 items-end">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-gray-100 flex-shrink-0">
                <Paperclip className="h-4 w-4 text-gray-500" />
              </Button>
              
              <div className="flex-1 relative">
                <Input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="min-h-[44px] rounded-2xl border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 pr-12 bg-gray-50 focus:bg-white transition-colors"
                  onKeyPress={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl hover:bg-gray-100"
                >
                  <Smile className="h-4 w-4 text-gray-500" />
                </Button>
              </div>
              
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="h-11 w-11 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
                size="icon"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>}
    </DialogContent>
  </Dialog>;
};
export default MessagesModal;
