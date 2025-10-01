import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, MessageCircle, Users, MapPin, Trophy } from 'lucide-react';

interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

export const NotificationPreferences = () => {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([
    {
      id: 'friend_activity',
      label: 'Friend Activity',
      description: 'Get notified when friends save places or post reviews',
      icon: <Users className="w-5 h-5" />,
      enabled: true,
    },
    {
      id: 'messages',
      label: 'Messages',
      description: 'Notifications for new direct messages',
      icon: <MessageCircle className="w-5 h-5" />,
      enabled: true,
    },
    {
      id: 'nearby_places',
      label: 'Nearby Places',
      description: 'Discover popular places near your location',
      icon: <MapPin className="w-5 h-5" />,
      enabled: false,
    },
    {
      id: 'challenges',
      label: 'Challenges & Rewards',
      description: 'Updates on challenges and earned badges',
      icon: <Trophy className="w-5 h-5" />,
      enabled: true,
    },
    {
      id: 'weekly_digest',
      label: 'Weekly Digest',
      description: 'Summary of activity from the past week',
      icon: <Bell className="w-5 h-5" />,
      enabled: false,
    },
  ]);

  const togglePreference = (id: string) => {
    setPreferences((prev) =>
      prev.map((pref) =>
        pref.id === id ? { ...pref, enabled: !pref.enabled } : pref
      )
    );
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Bell className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Notification Preferences</h3>
          <p className="text-sm text-muted-foreground">
            Manage how you receive notifications
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {preferences.map((pref) => (
          <div
            key={pref.id}
            className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
          >
            <div className="p-2 bg-primary/10 rounded-lg text-primary flex-shrink-0">
              {pref.icon}
            </div>
            <div className="flex-1 min-w-0">
              <Label
                htmlFor={pref.id}
                className="text-sm font-semibold cursor-pointer"
              >
                {pref.label}
              </Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                {pref.description}
              </p>
            </div>
            <Switch
              id={pref.id}
              checked={pref.enabled}
              onCheckedChange={() => togglePreference(pref.id)}
              aria-label={`Toggle ${pref.label}`}
            />
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Push notifications require browser permissions.
          Make sure to allow notifications when prompted.
        </p>
      </div>
    </Card>
  );
};
