
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Globe, Users, MapPin } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';

const PrivacySettings = () => {
  const { profile, updateProfile } = useProfile();
  const [isPrivateProfile, setIsPrivateProfile] = useState(profile?.is_private || false);
  const [defaultLocationPrivacy, setDefaultLocationPrivacy] = useState<'private' | 'followers' | 'public'>(
    (profile?.default_location_privacy as 'private' | 'followers' | 'public') || 'followers'
  );
  const [loading, setLoading] = useState(false);

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await updateProfile({
        is_private: isPrivateProfile,
        default_location_privacy: defaultLocationPrivacy
      });
      alert('Privacy settings updated successfully!');
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      alert('Failed to update privacy settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Profile Privacy
          </CardTitle>
          <CardDescription>
            Control who can see your profile and activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">Private Account</div>
              <div className="text-sm text-gray-500">
                When your account is private, only approved followers can see your posts and saved locations
              </div>
            </div>
            <Switch
              checked={isPrivateProfile}
              onCheckedChange={setIsPrivateProfile}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location Sharing
          </CardTitle>
          <CardDescription>
            Choose your default privacy setting for saved locations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div 
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                defaultLocationPrivacy === 'private' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => setDefaultLocationPrivacy('private')}
            >
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="font-medium">Private</div>
                  <div className="text-sm text-gray-500">Only you can see your saved locations</div>
                </div>
              </div>
            </div>

            <div 
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                defaultLocationPrivacy === 'followers' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => setDefaultLocationPrivacy('followers')}
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="font-medium">Followers Only</div>
                  <div className="text-sm text-gray-500">Only your followers can see your saved locations</div>
                </div>
              </div>
            </div>

            <div 
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                defaultLocationPrivacy === 'public' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => setDefaultLocationPrivacy('public')}
            >
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="font-medium">Public</div>
                  <div className="text-sm text-gray-500">Anyone can see your saved locations</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={handleSaveSettings} 
        disabled={loading}
        className="w-full"
      >
        {loading ? 'Saving...' : 'Save Privacy Settings'}
      </Button>
    </div>
  );
};

export default PrivacySettings;
