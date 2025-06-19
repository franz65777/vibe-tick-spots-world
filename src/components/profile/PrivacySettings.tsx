
import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Lock, Globe, Users, MapPin, Check, ArrowLeft } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

const PrivacySettings = () => {
  const { profile, updateProfile } = useProfile();
  const [isPrivateProfile, setIsPrivateProfile] = useState(false);
  const [defaultLocationPrivacy, setDefaultLocationPrivacy] = useState<'private' | 'followers' | 'public'>('followers');
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Update local state when profile loads
  useEffect(() => {
    if (profile) {
      setIsPrivateProfile(profile.is_private || false);
      setDefaultLocationPrivacy((profile.default_location_privacy as 'private' | 'followers' | 'public') || 'followers');
    }
  }, [profile]);

  // Track changes
  useEffect(() => {
    if (profile) {
      const originalPrivate = profile.is_private || false;
      const originalLocationPrivacy = (profile.default_location_privacy as 'private' | 'followers' | 'public') || 'followers';
      
      setHasChanges(
        isPrivateProfile !== originalPrivate || 
        defaultLocationPrivacy !== originalLocationPrivacy
      );
    }
  }, [profile, isPrivateProfile, defaultLocationPrivacy]);

  const handleSaveSettings = async () => {
    if (!hasChanges) {
      toast.info('No changes to save');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        is_private: isPrivateProfile,
        default_location_privacy: defaultLocationPrivacy
      });
      toast.success('Privacy settings updated successfully!');
      setHasChanges(false);
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      toast.error('Failed to update privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/profile';
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
      <div className="max-w-lg mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Privacy Settings</h1>
              <p className="text-sm text-gray-500">Control who can see your content</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6 space-y-6">
          {/* Profile Privacy */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                <Lock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 mb-1">Profile Privacy</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  When your account is private, only approved followers can see your posts and saved locations
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm">Private Account</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Require approval for new followers
                </div>
              </div>
              <Switch
                checked={isPrivateProfile}
                onCheckedChange={setIsPrivateProfile}
                className="flex-shrink-0"
              />
            </div>
          </div>

          {/* Location Sharing */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-green-50 rounded-lg flex-shrink-0">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 mb-1">Location Sharing</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Choose your default privacy setting for saved locations
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {privacyOptions.map((option) => (
                <button
                  key={option.value}
                  className={`w-full p-3 border-2 rounded-lg transition-all text-left ${
                    defaultLocationPrivacy === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  onClick={() => setDefaultLocationPrivacy(option.value)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md flex-shrink-0 ${
                      defaultLocationPrivacy === option.value
                        ? 'bg-blue-100'
                        : 'bg-gray-100'
                    }`}>
                      <option.icon className={`w-4 h-4 ${
                        defaultLocationPrivacy === option.value
                          ? 'text-blue-600'
                          : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-gray-900 text-sm">{option.title}</div>
                        {defaultLocationPrivacy === option.value && (
                          <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {option.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <Button
              onClick={handleSaveSettings}
              disabled={loading || !hasChanges}
              className={`w-full py-3 text-base font-medium transition-all ${
                hasChanges 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              size="lg"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </div>
              ) : hasChanges ? (
                'Save Privacy Settings'
              ) : (
                'No Changes to Save'
              )}
            </Button>
          </div>

          {/* Info text */}
          <div className="text-center text-xs text-gray-500 px-4">
            Changes will take effect immediately after saving
          </div>
        </div>

        {/* Bottom padding for mobile navigation */}
        <div className="h-20"></div>
      </div>
    </div>
  );
};

export default PrivacySettings;
