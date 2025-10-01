import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Bell, CheckCheck, Settings, Heart, MessageCircle, UserPlus, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationItem from '@/components/notifications/NotificationItem';
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationsModal = ({ isOpen, onClose }: NotificationsModalProps) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead([notificationId]);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'follow':
      case 'friend_accepted':
        if (notification.data?.user_id) {
          navigate(`/user/${notification.data.user_id}`);
        }
        break;
      case 'like':
      case 'comment':
        if (notification.data?.post_id) {
          navigate(`/profile`); // Could be enhanced to open specific post modal
        }
        break;
      case 'location_recommendation':
      case 'business_offer':
        if (notification.data?.location_id) {
          // Could open location detail modal
          console.log('Navigate to location:', notification.data.location_id);
        }
        break;
      default:
        break;
    }

    onClose();
  };

  // Categorize notifications
  const categorizedNotifications = {
    all: notifications,
    followers: notifications.filter(n => ['follow', 'friend_accepted'].includes(n.type)),
    engagement: notifications.filter(n => ['like', 'comment'].includes(n.type)),
    business: notifications.filter(n => ['business_offer', 'location_recommendation'].includes(n.type)),
  };

  const getCategoryCount = (category: keyof typeof categorizedNotifications) => {
    return categorizedNotifications[category].filter(n => !n.is_read).length;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md h-[70vh] overflow-hidden flex flex-col shadow-2xl border border-gray-100">
        {/* Enhanced Header */}
        <div className="relative p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100 flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                {unreadCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center p-0 animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </div>
              <div>
                <h3 className="font-bold text-xl text-gray-900">Notifications</h3>
                <p className="text-sm text-gray-500">
                  {unreadCount > 0 ? `${unreadCount} new` : 'All caught up!'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  onClick={handleMarkAllAsRead}
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs font-medium px-3 py-2 rounded-lg"
                >
                  <CheckCheck className="w-4 h-4 mr-1" />
                  Mark all
                </Button>
              )}
              
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="rounded-xl hover:bg-gray-100 transition-colors"
                aria-label="Close notifications"
              >
                <X className="w-5 h-5 text-gray-600" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        {showSettings ? (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <NotificationPreferences />
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-4 mx-4 mt-4 mb-2">
              <TabsTrigger value="all" className="text-xs">
                All
                {unreadCount > 0 && (
                  <Badge className="ml-1 h-4 px-1.5 text-[10px]" variant="secondary">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="followers" className="text-xs">
                <UserPlus className="w-3 h-3 mr-1" />
                {getCategoryCount('followers') > 0 && (
                  <Badge className="ml-1 h-4 px-1.5 text-[10px]" variant="secondary">
                    {getCategoryCount('followers')}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="engagement" className="text-xs">
                <Heart className="w-3 h-3 mr-1" />
                {getCategoryCount('engagement') > 0 && (
                  <Badge className="ml-1 h-4 px-1.5 text-[10px]" variant="secondary">
                    {getCategoryCount('engagement')}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="business" className="text-xs">
                <Briefcase className="w-3 h-3 mr-1" />
                {getCategoryCount('business') > 0 && (
                  <Badge className="ml-1 h-4 px-1.5 text-[10px]" variant="secondary">
                    {getCategoryCount('business')}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-600">Loading...</span>
                  </div>
                </div>
              ) : (
                <>
                  <TabsContent value="all" className="mt-0">
                    {categorizedNotifications.all.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                          <Bell className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2 text-lg">All caught up!</h3>
                        <p className="text-gray-500 text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {categorizedNotifications.all.map((notification) => (
                          <div key={notification.id} onClick={() => handleNotificationClick(notification)} className="cursor-pointer">
                            <NotificationItem
                              notification={notification}
                              onMarkAsRead={handleMarkAsRead}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="followers" className="mt-0">
                    {categorizedNotifications.followers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <UserPlus className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 text-sm">No follower notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {categorizedNotifications.followers.map((notification) => (
                          <div key={notification.id} onClick={() => handleNotificationClick(notification)} className="cursor-pointer">
                            <NotificationItem
                              notification={notification}
                              onMarkAsRead={handleMarkAsRead}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="engagement" className="mt-0">
                    {categorizedNotifications.engagement.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <Heart className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 text-sm">No engagement notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {categorizedNotifications.engagement.map((notification) => (
                          <div key={notification.id} onClick={() => handleNotificationClick(notification)} className="cursor-pointer">
                            <NotificationItem
                              notification={notification}
                              onMarkAsRead={handleMarkAsRead}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="business" className="mt-0">
                    {categorizedNotifications.business.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <Briefcase className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 text-sm">No business notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {categorizedNotifications.business.map((notification) => (
                          <div key={notification.id} onClick={() => handleNotificationClick(notification)} className="cursor-pointer">
                            <NotificationItem
                              notification={notification}
                              onMarkAsRead={handleMarkAsRead}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </>
              )}
            </ScrollArea>
          </Tabs>
        )}

        {/* Footer with settings */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="w-full text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
            aria-label={showSettings ? 'View notifications' : 'Open notification settings'}
          >
            <Settings className="w-4 h-4 mr-2" />
            {showSettings ? 'Back to Notifications' : 'Notification Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationsModal;
