import React from 'react';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MediaSelector } from './MediaSelector';
import { LocationSelector } from './LocationSelector';
import { UserTagSelector } from './UserTagSelector';
import { useNavigate } from 'react-router-dom';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { useTranslation } from 'react-i18next';

interface PostEditorProps {
  selectedFiles: File[];
  previewUrls: string[];
  caption: string;
  selectedLocation: any;
  selectedCategory: string;
  taggedUsers: any[];
  rating?: number;
  isUploading: boolean;
  onFilesSelect: (files: FileList) => void;
  onRemoveFile: (index: number) => void;
  onCaptionChange: (caption: string) => void;
  onLocationSelect: (location: any) => void;
  onCategoryChange: (category: string) => void;
  onUserTagged: (user: any) => void;
  onUserRemoved: (userId: string) => void;
  onRatingChange?: (rating: number | undefined) => void;
  onSubmit: () => void;
  isBusinessAccount?: boolean;
}

export const PostEditor: React.FC<PostEditorProps> = ({
  selectedFiles,
  previewUrls,
  caption,
  selectedLocation,
  selectedCategory,
  taggedUsers,
  rating,
  isUploading,
  onFilesSelect,
  onRemoveFile,
  onCaptionChange,
  onLocationSelect,
  onCategoryChange,
  onUserTagged,
  onUserRemoved,
  onRatingChange,
  onSubmit,
  isBusinessAccount = false
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Hide bottom navigation while editing (after media selected)
  React.useEffect(() => {
    const editing = selectedFiles.length > 0;
    window.dispatchEvent(new CustomEvent(editing ? 'ui:overlay-open' : 'ui:overlay-close'));
    return () => {
      window.dispatchEvent(new CustomEvent('ui:overlay-close'));
    };
  }, [selectedFiles.length]);
  
  const canSubmit = 
    selectedFiles.length > 0 && 
    selectedLocation !== null && 
    selectedCategory !== '' && 
    !isUploading;

  console.log('PostEditor canSubmit:', {
    filesCount: selectedFiles.length,
    hasLocation: !!selectedLocation,
    hasCategory: !!selectedCategory,
    category: selectedCategory,
    isUploading,
    canSubmit
  });
  
  const handleBack = () => {
    const targetPath = isBusinessAccount ? '/business/add' : '/add';
    navigate(targetPath);
  };

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
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background px-4 py-3 flex items-center justify-between">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">{t('newPost', { ns: 'add' })}</h1>
        <div className="w-9" /> {/* Spacer for centering */}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-2xl mx-auto p-2 space-y-2">
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
              placeholder={t('captionPlaceholder', { ns: 'add' })}
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
            disabled={isBusinessAccount}
          />

          {/* Share Button - Below Location */}
          <div className="pt-2">
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
                  {t('sharing', { ns: 'add' })}
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  {t('share', { ns: 'common' })}
                </>
              )}
            </Button>
          </div>

          {/* Optional Rating - Only for personal accounts */}
          {onRatingChange && !isBusinessAccount && (
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('ratePlace', { ns: 'add' })}</label>
              <div className="flex gap-2">
                {[...Array(10)].map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onRatingChange(rating === i + 1 ? undefined : i + 1)}
                    className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                      rating && rating >= i + 1
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              {rating && (
                <p className="text-xs text-muted-foreground">
                  {t('youRated', { ns: 'add' })} {rating}/10
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
