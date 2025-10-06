import React from 'react';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MediaSelector } from './MediaSelector';
import { LocationSelector } from './LocationSelector';
import { useNavigate } from 'react-router-dom';

interface PostEditorProps {
  selectedFiles: File[];
  previewUrls: string[];
  caption: string;
  selectedLocation: any;
  selectedCategory: string;
  isUploading: boolean;
  onFilesSelect: (files: FileList) => void;
  onRemoveFile: (index: number) => void;
  onCaptionChange: (caption: string) => void;
  onLocationSelect: (location: any) => void;
  onCategoryChange: (category: string) => void;
  onSubmit: () => void;
}

export const PostEditor: React.FC<PostEditorProps> = ({
  selectedFiles,
  previewUrls,
  caption,
  selectedLocation,
  selectedCategory,
  isUploading,
  onFilesSelect,
  onRemoveFile,
  onCaptionChange,
  onLocationSelect,
  onCategoryChange,
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

  return (
    <div className="flex flex-col h-screen bg-background">
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
              className="min-h-[100px] resize-none border-border"
            />
          </div>

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
          className="w-full h-12"
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
              Share Post
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
