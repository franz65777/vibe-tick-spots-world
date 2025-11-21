import { useState, useEffect, useRef } from 'react';
import { X, Send, MapPin, Heart, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';

interface TripChatModalProps {
  tripId: string;
  tripName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  user_id: string;
  content: string;
  message_type: string;
  location_id?: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string;
  };
  locations?: {
    name: string;
    city: string;
    image_url: string;
  };
}

const TripChatModal = ({ tripId, tripName, isOpen, onClose }: TripChatModalProps) => {
  const { user } = useAuth();
  const { t } = useTranslation('profile');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadMessages();
      loadParticipants();
      
      // Subscribe to new messages
      const channel = supabase
        .channel(`trip_${tripId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'trip_messages',
            filter: `trip_id=eq.${tripId}`
          },
          (payload) => {
            loadMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, tripId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const { data: messagesData, error } = await supabase
        .from('trip_messages')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Load profiles and locations separately
      const userIds = [...new Set(messagesData?.map(m => m.user_id) || [])];
      const locationIds = messagesData?.filter(m => m.location_id).map(m => m.location_id) || [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const { data: locations } = await supabase
        .from('locations')
        .select('id, name, city, image_url')
        .in('id', locationIds);

      // Combine data
      const messagesWithData = messagesData?.map(msg => ({
        ...msg,
        profiles: profiles?.find(p => p.id === msg.user_id),
        locations: msg.location_id ? locations?.find(l => l.id === msg.location_id) : undefined
      })) || [];

      setMessages(messagesWithData as Message[]);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_participants')
        .select(`
          *,
          profiles (id, username, avatar_url)
        `)
        .eq('trip_id', tripId);

      if (error) throw error;
      setParticipants(data?.map((p: any) => p.profiles).filter(Boolean) || []);
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('trip_messages')
        .insert({
          trip_id: tripId,
          user_id: user.id,
          content: newMessage.trim(),
          message_type: 'text'
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-background rounded-t-3xl h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold">{tripName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div className="flex -space-x-2">
                {participants.slice(0, 3).map((p) => (
                  <Avatar key={p.id} className="w-6 h-6 border-2 border-background">
                    <AvatarImage src={p.avatar_url} />
                    <AvatarFallback>{p.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {participants.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{participants.length - 3}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => {
            const isOwn = message.user_id === user?.id;
            const isSystem = message.message_type === 'system';

            if (isSystem) {
              return (
                <div key={message.id} className="text-center">
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {message.content}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={message.id}
                className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={message.profiles?.avatar_url} />
                  <AvatarFallback>
                    {message.profiles?.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                  <span className="text-xs text-muted-foreground mb-1">
                    {message.profiles?.username}
                  </span>

                  {message.message_type === 'location' && message.locations ? (
                    <div className="bg-muted rounded-2xl p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{message.locations.name}</p>
                          <p className="text-xs text-muted-foreground">{message.locations.city}</p>
                        </div>
                      </div>
                      {message.locations.image_url && (
                        <img
                          src={message.locations.image_url}
                          alt={message.locations.name}
                          className="w-full aspect-video object-cover rounded-lg"
                        />
                      )}
                      <p className="text-sm">{message.content}</p>
                    </div>
                  ) : (
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                  )}

                  <span className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="sticky bottom-0 bg-background border-t border-border p-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('trips.sendMessage')}
              className="flex-1 rounded-xl"
              disabled={loading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || loading}
              size="icon"
              className="rounded-xl"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripChatModal;
