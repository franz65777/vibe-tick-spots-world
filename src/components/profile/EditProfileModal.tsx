
import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: any;
}

const EditProfileModal = ({ isOpen, onClose, currentProfile }: EditProfileModalProps) => {
  const { updateProfile } = useProfile();
  const { user } = useAuth();
  const [username, setUsername] = useState(currentProfile?.username || user?.user_metadata?.username || 'user');
  const [bio, setBio] = useState(currentProfile?.bio || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateProfile({
        username: username.trim(),
        bio: bio.trim()
      });
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl w-full max-w-md shadow-xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Edit Profile</h2>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter username"
              maxLength={30}
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium mb-2">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Tell us about yourself..."
              maxLength={150}
            />
            <div className="text-xs text-muted-foreground mt-1 text-right">
              {bio.length}/150
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={isLoading || (!username.trim() && !bio.trim())}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </div>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
