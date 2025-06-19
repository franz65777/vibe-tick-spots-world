
import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Globe, Users, MapPin, Check } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

const PrivacySettings = () => {
  const { profile, updateProfile } = useProfile();
  const [isPrivateProfile, setIsPrivateProfile] = useState(false);
  const [defaultLocationPrivacy, setDefaultLocationPrivacy] = useState<'private' | 'followers' | 'public'>('followers');
  const [loading, setLoading] = useState(false);

  // Update local state when profile loads
  useEffect(() => {
    if (profile) {
      setIsPrivateProfile(profile.is_private || false);
      setDefaultLocationPrivacy((profile.default_location_privacy as 'private' | 'followers' | 'public') || 'followers');
    }
  }, [profile]);

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await updateProfile({
        is_private: isPrivateProfile,
        default_location_privacy: defaultLocationPrivacy
      });
      toast.success('Privacy settings updated successfully!');
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      toast.error('Failed to update privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const privacyOptions = [
    {
      value: 'private' as const,
      icon: Lock,
      title: 'Private',
      description: 'Only you can see your saved locations',
    },
    {
      value: 'followers' as const,
      icon: Users,
      title: 'Followers Only',
      description: 'Only your followers can see your saved locations',
    },
    {
      value: 'public' as const,
      icon: Globe,
      title: 'Public',
      description: 'Anyone can see your saved locations',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 z-10">
          <h1 className="text-xl font-semibold text-gray-900">Privacy Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Control who can see your profile and activity</p>
        </div>

        {/* Content */}
        <div className="px-4 py-6 space-y-6">
          {/* Profile Privacy */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Lock className="w-5 h-5 text-gray-600" />
                Profile Privacy
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                When your account is private, only approved followers can see your posts and saved locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium text-gray-900">Private Account</div>
                  <div className="text-sm text-gray-500">
                    Require approval for new followers
                  </div>
                </div>
                <Switch
                  checked={isPrivateProfile}
                  onCheckedChange={setIsPrivateProfile}
                />
              </div>
            </CardContent>
          </Card>

          {/* Location Sharing */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <MapPin className="w-5 h-5 text-gray-600" />
                Location Sharing
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Choose your default privacy setting for saved locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {privacyOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      defaultLocationPrivacy === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    onClick={() => setDefaultLocationPrivacy(option.value)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        defaultLocationPrivacy === option.value
                          ? 'bg-blue-100'
                          : 'bg-gray-100'
                      }`}>
                        <option.icon className={`w-5 h-5 ${
                          defaultLocationPrivacy === option.value
                            ? 'text-blue-600'
                            : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-900">{option.title}</div>
                          {defaultLocationPrivacy === option.value && (
                            <Check className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1 leading-relaxed">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="sticky bottom-0 bg-white pt-4 pb-6">
            <Button
              onClick={handleSaveSettings}
              disabled={loading}
              className="w-full py-3 text-base font-medium"
              size="lg"
            >
              {loading ? 'Saving...' : 'Save Privacy Settings'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;
