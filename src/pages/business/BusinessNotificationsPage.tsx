import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { Button } from '@/components/ui/button';
import MobileNotificationItem from '@/components/notifications/MobileNotificationItem';
import { ArrowLeft, Bell, Check, MapPin, Star, Users, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface BusinessNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

const BusinessNotificationsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { businessProfile } = useBusinessProfile();
  const [notifications, setNotifications] = useState<BusinessNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && businessProfile) {
      fetchBusinessNotifications();
    }
  }, [user, businessProfile]);

  const fetchBusinessNotifications = async () => {
    try {
      setLoading(true);
      
      // Fetch ONLY business-specific notifications
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .in('type', ['business_post', 'business_review', 'location_save', 'business_mention'])
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching business notifications:', error);
      toast.error(t('failedLoadNotifications', { ns: 'business' }));
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      toast.success(t('allMarkedAsRead', { ns: 'business' }));
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error(t('failedMarkAsRead', { ns: 'business' }));
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'business_post':
        return <MapPin className="w-5 h-5 text-primary" />;
      case 'business_review':
        return <Star className="w-5 h-5 text-accent" />;
      case 'location_save':
        return <Users className="w-5 h-5 text-chart-2" />;
      case 'business_mention':
        return <TrendingUp className="w-5 h-5 text-chart-3" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-screen-sm mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/business')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-bold text-foreground">{t('businessNotifications', { ns: 'business' })}</h1>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-sm"
              >
                {t('markAllRead', { ns: 'notifications' })}
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('noNotificationsYet', { ns: 'business' })}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('notificationsDescription', { ns: 'business' })}
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <MobileNotificationItem
                key={notification.id}
                notification={notification as any}
                onMarkAsRead={(id) => markAsRead(id)}
                onAction={(n) => !n.is_read && markAsRead(n.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessNotificationsPage;
