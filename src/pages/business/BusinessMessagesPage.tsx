import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { messageService, MessageThread } from '@/services/messageService';

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

  useEffect(() => {
    if (user && businessProfile) {
      fetchBusinessMessages();
    }
  }, [user, businessProfile]);

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
    } catch (error) {
      console.error('Error fetching business messages:', error);
      toast.error(t('failedLoadMessages', { ns: 'business' }));
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-screen-sm mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
          <div className="flex items-center gap-3 p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/business')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">{t('businessMessages', { ns: 'business' })}</h1>
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
          ) : (
            messages.map((message) => (
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
                  <Avatar className="w-12 h-12 flex-shrink-0 border-2 border-background">
                    <AvatarImage src={message.profiles?.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {message.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <h4 className="font-semibold text-foreground text-[15px] truncate">
                        {message.profiles?.username || 'Unknown User'}
                      </h4>
                      <span className="text-muted-foreground text-[12px] flex-shrink-0">
                        {formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: true,
                        }).replace('about ', '')}
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
      </div>
    </div>
  );
};

export default BusinessMessagesPage;
