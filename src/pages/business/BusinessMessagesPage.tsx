import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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
      
      // Fetch business-specific messages (messages related to the business location)
      const { data: messagesData, error: messagesError } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('receiver_id', user?.id)
        .eq('message_context', 'business')
        .not('location_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (messagesError) throw messagesError;

      if (!messagesData || messagesData.length === 0) {
        setMessages([]);
        return;
      }

      // Fetch profiles for senders
      const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', senderIds);

      if (profilesError) throw profilesError;

      // Map profiles to messages
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const messagesWithProfiles = messagesData.map(message => ({
        ...message,
        profiles: profilesMap.get(message.sender_id) || {
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-24">
      <div className="max-w-screen-sm mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/business')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-foreground">{t('businessMessages', { ns: 'business' })}</h1>
                {unreadCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {unreadCount} {t('unreadMessages', { count: unreadCount, ns: 'business' })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : messages.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t('noMessagesYet', { ns: 'business' })}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('customerInquiries', { ns: 'business' })}
                </p>
              </CardContent>
            </Card>
          ) : (
            messages.map((message) => (
              <Card
                key={message.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  !message.is_read ? 'border-l-4 border-l-primary bg-primary/5' : ''
                }`}
                onClick={() => {
                  // Navigate to message detail or mark as read
                  console.log('Message clicked:', message.id);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={message.profiles?.avatar_url} />
                      <AvatarFallback>
                        {message.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <h4 className="font-semibold text-foreground text-sm">
                            {message.profiles?.username || 'Unknown User'}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(message.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        {!message.is_read && (
                          <Badge variant="secondary" className="text-xs">
                            {t('new', { ns: 'messages' })}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessMessagesPage;
