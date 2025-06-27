import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Send, ArrowLeft, Phone, Video, MoreHorizontal } from 'lucide-react';
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
    <DialogContent className="max-w-full h-full md:max-w-2xl md:h-[80vh] p-0 overflow-hidden">
      {/* Mobile-first header */}
      <DialogHeader className="p-4 border-b bg-white/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          {view === 'threads' ? <DialogTitle className="text-lg font-semibold">Messages</DialogTitle> : selectedThread && <div className="flex items-center gap-3 flex-1">
              <Avatar className="h-8 w-8">
                <AvatarImage src={getOtherParticipant(selectedThread)?.avatar_url} />
                <AvatarFallback>
                  {getOtherParticipant(selectedThread)?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base font-medium truncate">
                  {getOtherParticipant(selectedThread)?.full_name || getOtherParticipant(selectedThread)?.username}
                </DialogTitle>
                <p className="text-xs text-gray-500">Active now</p>
              </div>
              <div className="flex gap-1">
                
                
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>}
        </div>
      </DialogHeader>

      {view === 'threads' ? <div className="flex-1 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Search messages" className="pl-9 h-10 bg-gray-50 border-gray-200 rounded-full" />
            </div>
          </div>

          {/* Threads list */}
          <ScrollArea className="flex-1">
            {loading ? <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div> : threads.length === 0 ? <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Send className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">No messages yet</h3>
                <p className="text-sm text-gray-500">Start a conversation with someone!</p>
              </div> : <div className="divide-y">
                {threads.map(thread => {
                  const otherParticipant = getOtherParticipant(thread);
                  return <button key={thread.id} onClick={() => handleThreadSelect(thread)} className="w-full p-4 text-left hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={otherParticipant?.avatar_url} />
                        <AvatarFallback>
                          {otherParticipant?.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-medium text-gray-900 truncate">
                            {otherParticipant?.full_name || otherParticipant?.username}
                          </h3>
                          <span className="text-xs text-gray-500 ml-2">
                            {thread.last_message_at && formatMessageTime(thread.last_message_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {thread.last_message?.content || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </button>;
                })}
              </div>}
          </ScrollArea>
        </div> : <div className="flex-1 flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map(message => {
                  const isOwn = message.sender_id === user?.id;
                  const bubbleClasses = isOwn ? 'bg-blue-600 text-white ml-auto' : 'bg-gray-100 text-gray-900';
                  return (
                    <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      {(['place_share', 'post_share'].includes(message.message_type) && message.shared_content) ? (
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${bubbleClasses}`}>
                          {message.content && (
                            <p className={`text-sm mb-2 ${isOwn ? 'text-white' : 'text-gray-900'}`}>{message.content}</p>
                          )}
                          {message.message_type === 'place_share' && (
                            <PlaceMessageCard placeData={message.shared_content} onViewPlace={() => {}} />
                          )}
                          {message.message_type === 'post_share' && (
                            <PostMessageCard postData={message.shared_content} />
                          )}
                        </div>
                      ) : (
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${bubbleClasses}`}>
                          <p className="text-sm leading-relaxed">{message.content}</p>
                          <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
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

          {/* Message input */}
          <div className="p-4 border-t bg-white">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." className="min-h-[44px] rounded-full border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 resize-none" onKeyPress={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }} />
              </div>
              <Button onClick={handleSendMessage} disabled={!newMessage.trim()} className="h-11 w-11 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>}
    </DialogContent>
  </Dialog>;
};
export default MessagesModal;
