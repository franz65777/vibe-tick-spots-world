
import React, { useState } from 'react';
import { Bell, BellOff, MapPin, Volume2, VolumeX, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface BusinessNotificationSetting {
  businessId: string;
  businessName: string;
  locationName: string;
  category: string;
  isMuted: boolean;
  allowedTypes: string[];
  savedDate: string;
}

const NotificationSettings = () => {
  const { t } = useTranslation();
  const [globalSettings, setGlobalSettings] = useState({
    allNotifications: true,
    geographicRadius: 25, // miles
    vacationMode: false,
  });

  const [businessSettings, setBusinessSettings] = useState<BusinessNotificationSetting[]>([
    {
      businessId: '1',
      businessName: 'Osteria del Teatro',
      locationName: 'Rome, Italy',
      category: 'restaurant',
      isMuted: false,
      allowedTypes: ['event', 'discount'],
      savedDate: '2024-01-15'
    },
    {
      businessId: '2',
      businessName: 'Hotel Splendido',
      locationName: 'Portofino, Italy',
      category: 'hotel',
      isMuted: true,
      allowedTypes: [],
      savedDate: '2024-01-10'
    },
    {
      businessId: '3',
      businessName: 'Central Perk Cafe',
      locationName: 'New York, USA',
      category: 'cafe',
      isMuted: false,
      allowedTypes: ['event', 'discount', 'announcement'],
      savedDate: '2024-01-20'
    }
  ]);

  const handleToggleMute = (businessId: string) => {
    setBusinessSettings(prev => prev.map(setting => {
      if (setting.businessId === businessId) {
        const newMuted = !setting.isMuted;
        toast.success(
          newMuted 
            ? t('mutedNotificationsFrom', { ns: 'notifications', name: setting.businessName, defaultValue: 'Muted notifications from {{name}}' })
            : t('unmutedNotificationsFrom', { ns: 'notifications', name: setting.businessName, defaultValue: 'Unmuted notifications from {{name}}' })
        );
        return { ...setting, isMuted: newMuted };
      }
      return setting;
    }));
  };

  const handleNotificationTypeToggle = (businessId: string, type: string) => {
    setBusinessSettings(prev => prev.map(setting => {
      if (setting.businessId === businessId) {
        const newTypes = setting.allowedTypes.includes(type)
          ? setting.allowedTypes.filter(t => t !== type)
          : [...setting.allowedTypes, type];
        return { ...setting, allowedTypes: newTypes };
      }
      return setting;
    }));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'restaurant': return '🍽️';
      case 'hotel': return '🏨';
      case 'cafe': return '☕';
      case 'bar': return '🍺';
      default: return '📍';
    }
  };

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case 'event': return '📅';
      case 'discount': return '💰';
      case 'announcement': return '📢';
      default: return '🔔';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notification Settings</h1>
          <p className="text-gray-600">Manage how you receive notifications from businesses</p>
        </div>

        {/* Global Settings */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Global Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium text-gray-900">All Notifications</Label>
                <p className="text-sm text-gray-600">Receive notifications from all saved businesses</p>
              </div>
              <Switch
                checked={globalSettings.allNotifications}
                onCheckedChange={(checked) => 
                  setGlobalSettings(prev => ({ ...prev, allNotifications: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium text-gray-900">Vacation Mode</Label>
                <p className="text-sm text-gray-600">Temporarily pause all business notifications</p>
              </div>
              <Switch
                checked={globalSettings.vacationMode}
                onCheckedChange={(checked) => 
                  setGlobalSettings(prev => ({ ...prev, vacationMode: checked }))
                }
              />
            </div>

            <div>
              <Label className="text-base font-medium text-gray-900 mb-2 block">
                Geographic Radius: {globalSettings.geographicRadius} miles
              </Label>
              <p className="text-sm text-gray-600 mb-3">
                Only receive notifications from businesses within this distance
              </p>
              <input
                type="range"
                min="5"
                max="100"
                value={globalSettings.geographicRadius}
                onChange={(e) => 
                  setGlobalSettings(prev => ({ ...prev, geographicRadius: parseInt(e.target.value) }))
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>5 miles</span>
                <span>100+ miles</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business-Specific Settings */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Business Notifications
            </CardTitle>
            <p className="text-sm text-gray-600">
              Control notifications from each business you've saved
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {businessSettings.map((setting) => (
                <div key={setting.businessId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{getCategoryIcon(setting.category)}</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{setting.businessName}</h3>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {setting.locationName}
                        </p>
                        <p className="text-xs text-gray-500">Saved on {new Date(setting.savedDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleToggleMute(setting.businessId)}
                      variant={setting.isMuted ? "outline" : "ghost"}
                      size="sm"
                      className={setting.isMuted ? "border-red-200 text-red-600" : ""}
                    >
                      {setting.isMuted ? (
                        <>
                          <VolumeX className="w-4 h-4 mr-1" />
                          Muted
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4 mr-1" />
                          Active
                        </>
                      )}
                    </Button>
                  </div>

                  {!setting.isMuted && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Notification Types
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {['event', 'discount', 'announcement'].map((type) => (
                          <button
                            key={type}
                            onClick={() => handleNotificationTypeToggle(setting.businessId, type)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                              setting.allowedTypes.includes(type)
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}
                          >
                            {getTypeEmoji(type)} {type.charAt(0).toUpperCase() + type.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setBusinessSettings(prev => prev.map(setting => ({ ...setting, isMuted: false })));
                  toast.success(t('unmutedAllBusinesses', { ns: 'notifications', defaultValue: 'Unmuted all businesses' }));
                }}
              >
                <Bell className="w-4 h-4 mr-2" />
                {t('unmuteAll', { ns: 'notifications', defaultValue: 'Unmute All' })}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setBusinessSettings(prev => prev.map(setting => ({ ...setting, isMuted: true })));
                  toast.success(t('mutedAllBusinesses', { ns: 'notifications', defaultValue: 'Muted all businesses' }));
                }}
              >
                <BellOff className="w-4 h-4 mr-2" />
                {t('muteAll', { ns: 'notifications', defaultValue: 'Mute All' })}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setBusinessSettings(prev => prev.map(setting => ({ 
                    ...setting, 
                    allowedTypes: ['event', 'discount', 'announcement'] 
                  })));
                  toast.success(t('enabledAllTypes', { ns: 'notifications', defaultValue: 'Enabled all notification types' }));
                }}
              >
                {t('enableAllTypes', { ns: 'notifications', defaultValue: 'Enable All Types' })}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationSettings;
