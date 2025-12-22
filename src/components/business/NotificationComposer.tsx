import React, { useState } from 'react';
import { Send, Users, Calendar, Eye, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface NotificationComposerProps {
  locationId: string;
  savedByCount: number;
}

const NotificationComposer = ({ locationId, savedByCount }: NotificationComposerProps) => {
  const { t } = useTranslation();
  const [notificationData, setNotificationData] = useState({
    title: '',
    message: '',
    type: 'announcement' as 'event' | 'discount' | 'announcement',
    scheduledTime: '',
  });
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSendNotification = async () => {
    if (!notificationData.title || !notificationData.message) {
      toast.error(t('fillAllFields', { ns: 'business' }));
      return;
    }

    setSending(true);
    try {
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(t('notificationSentToUsers', { ns: 'business', count: savedByCount, defaultValue: 'Notification sent to {{count}} users!' }));
      setNotificationData({
        title: '',
        message: '',
        type: 'announcement',
        scheduledTime: '',
      });
      setShowPreview(false);
    } catch (error) {
      toast.error(t('failedToSendNotification', { ns: 'business', defaultValue: 'Failed to send notification' }));
    } finally {
      setSending(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'event': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'discount': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-purple-100 text-purple-700 border-purple-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'event': return '📅';
      case 'discount': return '💰';
      default: return '📢';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Composer */}
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            Compose Notification
          </CardTitle>
          <p className="text-sm text-gray-600">
            Send to {savedByCount} users who have saved your location
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="type" className="text-sm font-medium text-gray-700">
              Notification Type
            </Label>
            <select
              id="type"
              value={notificationData.type}
              onChange={(e) => setNotificationData(prev => ({ 
                ...prev, 
                type: e.target.value as 'event' | 'discount' | 'announcement' 
              }))}
              className="mt-1 h-12 w-full border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="announcement">📢 Announcement</option>
              <option value="event">📅 Event</option>
              <option value="discount">💰 Discount/Offer</option>
            </select>
          </div>

          <div>
            <Label htmlFor="title" className="text-sm font-medium text-gray-700">
              {t('notificationTitle', { ns: 'business' })} *
            </Label>
            <Input
              id="title"
              value={notificationData.title}
              onChange={(e) => setNotificationData(prev => ({ ...prev, title: e.target.value }))}
              placeholder={t('enterNotificationTitle', { ns: 'business' })}
              className="mt-1"
              maxLength={50}
            />
            <p className="text-xs text-gray-500 mt-1">
              {notificationData.title.length}/50 {t('characters', { ns: 'common' })}
            </p>
          </div>

          <div>
            <Label htmlFor="message" className="text-sm font-medium text-gray-700">
              {t('message', { ns: 'business' })} *
            </Label>
            <Textarea
              id="message"
              value={notificationData.message}
              onChange={(e) => setNotificationData(prev => ({ ...prev, message: e.target.value }))}
              placeholder={t('enterYourMessage', { ns: 'business' })}
              className="mt-1 min-h-[100px]"
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">
              {notificationData.message.length}/200 characters
            </p>
          </div>

          <div>
            <Label htmlFor="scheduledTime" className="text-sm font-medium text-gray-700">
              Schedule for later (optional)
            </Label>
            <Input
              id="scheduledTime"
              type="datetime-local"
              value={notificationData.scheduledTime}
              onChange={(e) => setNotificationData(prev => ({ ...prev, scheduledTime: e.target.value }))}
              className="mt-1"
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? 'Hide Preview' : 'Preview'}
            </Button>
            <Button
              onClick={handleSendNotification}
              disabled={sending || !notificationData.title || !notificationData.message}
              className="flex-1"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {notificationData.scheduledTime ? 'Schedule' : 'Send Now'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview & Info */}
      <div className="space-y-6">
        {/* Preview */}
        {showPreview && (
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-green-600" />
                Notification Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">
                    {getTypeIcon(notificationData.type)}
                  </div>
                  <div className="flex-1">
                    <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${getTypeColor(notificationData.type)}`}>
                      {notificationData.type.charAt(0).toUpperCase() + notificationData.type.slice(1)}
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {notificationData.title || 'Notification title...'}
                    </h4>
                    <p className="text-gray-700 text-sm">
                      {notificationData.message || 'Your message will appear here...'}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      From: Your Business • Just now
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Guidelines */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Best Practices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                Keep titles under 50 characters for better readability
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                Include clear value proposition (discount %, event details)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                Limit notifications to 2-3 per week to avoid spam
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                Schedule during optimal hours (10AM-8PM local time)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                Use emojis sparingly for better engagement
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Notification Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total recipients</span>
                <span className="font-semibold">{savedByCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Sent this month</span>
                <span className="font-semibold">8</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average open rate</span>
                <span className="font-semibold text-green-600">78%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationComposer;
