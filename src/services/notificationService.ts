
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'location' | 'share';
  recipient_id: string;
  sender_id: string;
  message: string;
  related_id?: string;
  metadata?: any;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

class NotificationService {
  async sendNotification(
    type: 'like' | 'comment' | 'follow' | 'location' | 'share',
    recipientId: string,
    senderId: string,
    message: string,
    relatedId?: string,
    metadata?: any
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          type,
          recipientId,
          senderId,
          message,
          relatedId,
          metadata
        }
      });

      if (error) {
        console.error('Error sending notification:', error);
        return false;
      }

      console.log('Notification sent successfully:', data);
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  async getNotifications(): Promise<Notification[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session found, returning mock notifications');
        return this.getMockNotifications();
      }

      const { data, error } = await supabase.functions.invoke('get-notifications', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Error fetching notifications:', error);
        return this.getMockNotifications();
      }

      return data.notifications || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return this.getMockNotifications();
    }
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session found');
        return false;
      }

      const { data, error } = await supabase.functions.invoke('mark-notification-read', {
        body: { notificationId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  private getMockNotifications(): Notification[] {
    return [
      {
        id: '1',
        type: 'like',
        recipient_id: 'current-user',
        sender_id: 'mock-user-1',
        message: 'liked your story',
        created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        is_read: false,
        sender: {
          id: 'mock-user-1',
          username: 'emma_lifestyle',
          full_name: 'Emma Wilson',
          avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face'
        }
      },
      {
        id: '2',
        type: 'follow',
        recipient_id: 'current-user',
        sender_id: 'mock-user-2',
        message: 'started following you',
        created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        is_read: false,
        sender: {
          id: 'mock-user-2',
          username: 'michael_explorer',
          full_name: 'Michael Chen',
          avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
        }
      },
      {
        id: '3',
        type: 'location',
        recipient_id: 'current-user',
        sender_id: 'mock-user-3',
        message: 'saved',
        related_id: 'place-1',
        metadata: { locationName: 'Golden Gate Cafe' },
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        is_read: true,
        sender: {
          id: 'mock-user-3',
          username: 'sophia_wanderer',
          full_name: 'Sophia Rodriguez',
          avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b5a5c75b?w=100&h=100&fit=crop&crop=face'
        }
      },
      {
        id: '4',
        type: 'comment',
        recipient_id: 'current-user',
        sender_id: 'mock-user-4',
        message: 'commented on your location',
        related_id: 'place-2',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        is_read: true,
        sender: {
          id: 'mock-user-4',
          username: 'james_traveler',
          full_name: 'James Wilson',
          avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
        }
      },
      {
        id: '5',
        type: 'share',
        recipient_id: 'current-user',
        sender_id: 'mock-user-5',
        message: 'suggested a place to you',
        related_id: 'place-3',
        metadata: { locationName: 'Ocean View Restaurant' },
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        is_read: false,
        sender: {
          id: 'mock-user-5',
          username: 'alex_foodie',
          full_name: 'Alex Martinez',
          avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face'
        }
      }
    ];
  }
}

export const notificationService = new NotificationService();
