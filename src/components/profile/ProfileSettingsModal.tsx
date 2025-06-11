
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { LogOut, User, Edit3, Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileSettingsModal = ({ isOpen, onClose }: ProfileSettingsModalProps) => {
  const { user, signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  // Calculate if username can be changed (90 days rule)
  const canChangeUsername = () => {
    const lastUsernameChange = localStorage.getItem('lastUsernameChange');
    if (!lastUsernameChange) return true;
    
    const daysSinceChange = Math.floor((Date.now() - parseInt(lastUsernameChange)) / (1000 * 60 * 60 * 24));
    return daysSinceChange >= 90;
  };

  const daysUntilUsernameChange = () => {
    const lastUsernameChange = localStorage.getItem('lastUsernameChange');
    if (!lastUsernameChange) return 0;
    
    const daysSinceChange = Math.floor((Date.now() - parseInt(lastUsernameChange)) / (1000 * 60 * 60 * 24));
    return Math.max(0, 90 - daysSinceChange);
  };

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const updates: any = {
        full_name: fullName.trim(),
        bio: bio.trim()
      };

      // Only update username if it changed and user can change it
      if (username !== profile.username && canChangeUsername()) {
        updates.username = username.trim();
        localStorage.setItem('lastUsernameChange', Date.now().toString());
      }

      await updateProfile(updates);

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });

      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/welcome');
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Profile Picture Section */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 p-1">
              <div className="w-full h-full rounded-full bg-white p-1">
                <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.username || 'User'}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-gray-600">
                      {profile?.username?.substring(0, 2).toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{profile?.username}</h3>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          <Separator />

          {/* Edit Profile Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                Full Name
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="username" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Username
                {!canChangeUsername() && (
                  <span className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Can change in {daysUntilUsernameChange()} days
                  </span>
                )}
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={!canChangeUsername()}
                className="mt-1"
              />
              {!canChangeUsername() && (
                <p className="text-xs text-gray-500 mt-1">
                  Usernames can only be changed once every 90 days
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Travel Enthusiast | Food Lover | Photographer"
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleSave} 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileSettingsModal;
