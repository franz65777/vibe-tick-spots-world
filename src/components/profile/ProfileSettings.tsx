
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileSettings = ({ isOpen, onClose }: ProfileSettingsProps) => {
  const { profile, updateProfile } = useProfile();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [isLoading, setIsLoading] = useState(false);

  // Calculate if user can change username (90 days since last change)
  const canChangeUsername = () => {
    // For demo purposes, we'll assume users can change username
    // In a real app, you'd check the last username change date
    return true;
  };

  const daysUntilNextUsernameChange = () => {
    // For demo purposes, return 0
    // In a real app, calculate days remaining
    return 0;
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      await updateProfile({
        full_name: fullName,
        bio: bio,
        username: username,
      });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/welcome');
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Settings
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Input
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Travel enthusiast, Food lover, etc."
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={!canChangeUsername()}
            />
            {!canChangeUsername() && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="w-4 h-4" />
                <span>
                  You can change your username in {daysUntilNextUsernameChange()} days
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <Button 
              onClick={handleSaveChanges} 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
            
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
            
            <Button 
              onClick={onClose}
              variant="ghost"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileSettings;
