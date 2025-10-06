import React from 'react';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MediaSelector } from './MediaSelector';
import { LocationSelector } from './LocationSelector';
import { UserTagSelector } from './UserTagSelector';
import { useNavigate } from 'react-router-dom';
import { CategoryIcon } from '@/components/common/CategoryIcon';

interface PostEditorProps {
  selectedFiles: File[];
  previewUrls: string[];
  caption: string;
  selectedLocation: any;
  selectedCategory: string;
  taggedUsers: any[];
  isUploading: boolean;
  onFilesSelect: (files: FileList) => void;
  onRemoveFile: (index: number) => void;
  onCaptionChange: (caption: string) => void;
  onLocationSelect: (location: any) => void;
  onCategoryChange: (category: string) => void;
  onUserTagged: (user: any) => void;
  onUserRemoved: (userId: string) => void;
  onSubmit: () => void;
}

export const PostEditor: React.FC<PostEditorProps> = ({
  selectedFiles,
  previewUrls,
  caption,
  selectedLocation,
  selectedCategory,
  taggedUsers,
  isUploading,
  onFilesSelect,
  onRemoveFile,
  onCaptionChange,
  onLocationSelect,
  onCategoryChange,
  onUserTagged,
  onUserRemoved,
  onSubmit
}) => {
  const navigate = useNavigate();
  
  const canSubmit = 
    selectedFiles.length > 0 && 
    selectedLocation && 
    selectedCategory && 
    !isUploading;

  if (selectedFiles.length === 0) {
    return (
      <MediaSelector
        selectedFiles={selectedFiles}
        previewUrls={previewUrls}
        onFilesSelect={onFilesSelect}
        onRemoveFile={onRemoveFile}
        maxFiles={5}
      />
    );
  }

  const categories = ['restaurant', 'cafe', 'bar', 'hotel', 'entertainment', 'bakery', 'museum'];
  
  return (
    <div className="flex flex-col h-screen bg-background relative">
      {/* Floating Category Icons */}
      <div className="absolute top-16 left-0 right-0 z-0 pointer-events-none">
        <div className="relative h-32 max-w-2xl mx-auto">
          {categories.map((category, index) => {
            const positions = [
              { top: '10%', left: '5%' },
              { top: '5%', left: '25%' },
              { top: '15%', left: '45%' },
              { top: '8%', left: '65%' },
              { top: '18%', left: '85%' },
              { top: '25%', left: '15%' },
              { top: '22%', left: '75%' }
            ];
            const pos = positions[index];
            const delay = index * 0.2;
            
            return (
              <div
                key={category}
                className="absolute opacity-20 animate-bounce"
                style={{
                  top: pos.top,
                  left: pos.left,
                  animationDelay: `${delay}s`,
                  animationDuration: '3s'
                }}
              >
                <CategoryIcon category={category} className="w-10 h-10" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">New Post</h1>
        <div className="w-9" /> {/* Spacer for centering */}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 space-y-6">
          {/* Media Preview */}
          <MediaSelector
            selectedFiles={selectedFiles}
            previewUrls={previewUrls}
            onFilesSelect={onFilesSelect}
            onRemoveFile={onRemoveFile}
            maxFiles={5}
          />

          {/* Caption */}
          <div className="space-y-2">
            <Textarea
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              placeholder="Write a caption..."
              className="min-h-[60px] resize-none border-border text-sm"
              rows={2}
            />
          </div>

          {/* User Tag Selector */}
          <UserTagSelector
            taggedUsers={taggedUsers}
            onUserTagged={onUserTagged}
            onUserRemoved={onUserRemoved}
          />

          {/* Location Selector - MANDATORY */}
          <LocationSelector
            selectedLocation={selectedLocation}
            onLocationSelect={onLocationSelect}
            selectedCategory={selectedCategory}
            onCategoryChange={onCategoryChange}
          />
        </div>
      </div>

      {/* Share Button */}
      <div className="sticky bottom-0 bg-background border-t border-border p-4">
        <Button
          onClick={onSubmit}
          disabled={!canSubmit}
          variant="default"
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-sm"
          size="lg"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Sharing...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Share
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
