
import React, { useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

interface ProfilePictureEditorProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string;
}

const ProfilePictureEditor: React.FC<ProfilePictureEditorProps> = ({
  isOpen,
  onClose,
  currentAvatarUrl
}) => {
  const { user } = useAuth();
  const { updateProfile } = useProfile();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!user || !selectedFile) return;

    setUploading(true);
    try {
      // Create unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/avatar/avatar.${fileExt}`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, selectedFile, {
          upsert: true // Replace existing file
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(uploadData.path);

      // Update profile with new avatar URL
      await updateProfile({ avatar_url: publicUrl });

      onClose();
      setPreviewUrl(null);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!user) return;

    setUploading(true);
    try {
      await updateProfile({ avatar_url: null });
      onClose();
      setPreviewUrl(null);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error removing avatar:', error);
      alert('Failed to remove profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Profile Picture</h2>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Current/Preview Image */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden">
                {previewUrl || currentAvatarUrl ? (
                  <img 
                    src={previewUrl || currentAvatarUrl} 
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Camera className="w-8 h-8" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="space-y-4">
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="avatar-upload"
              />
              <label
                htmlFor="avatar-upload"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <Upload className="w-5 h-5 text-gray-500" />
                <span className="text-gray-600">Choose a photo</span>
              </label>
            </div>

            <div className="text-xs text-gray-500 text-center">
              JPG, PNG, or GIF. Max file size 5MB.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-200">
          {currentAvatarUrl && (
            <Button
              variant="outline"
              onClick={handleRemove}
              disabled={uploading}
              className="flex-1"
            >
              Remove
            </Button>
          )}
          <Button
            onClick={onClose}
            variant="outline"
            disabled={uploading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="flex-1"
          >
            {uploading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Uploading...
              </div>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePictureEditor;
