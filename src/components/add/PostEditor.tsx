import React, { memo, useCallback, useMemo } from 'react';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MediaSelector } from './MediaSelector';
import { LocationSelector } from './LocationSelector';
import { UserTagSelector } from './UserTagSelector';
import { useNavigate } from 'react-router-dom';
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

// Memoized rating button
const RatingButton = memo(({ 
  value, 
  isSelected, 
  onClick 
}: { 
  value: number; 
  isSelected: boolean; 
  onClick: (value: number) => void;
}) => {
  const handleClick = useCallback(() => onClick(value), [value, onClick]);
  
  const getButtonGradient = () => {
    if (!isSelected) return 'bg-muted text-muted-foreground hover:bg-muted/80';
    if (value <= 2) return 'bg-red-500 text-white';
    if (value <= 3) return 'bg-red-400 text-white';
    if (value <= 4) return 'bg-orange-500 text-white';
    if (value <= 5) return 'bg-orange-400 text-white';
    if (value <= 6) return 'bg-amber-500 text-white';
    if (value <= 7) return 'bg-yellow-500 text-black';
    if (value <= 8) return 'bg-lime-500 text-black';
    if (value <= 9) return 'bg-green-500 text-white';
    return 'bg-green-600 text-white';
  };
  
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-10 h-10 rounded-lg font-semibold transition-all ${getButtonGradient()}`}
    >
      {value}
    </button>
  );
});

RatingButton.displayName = 'RatingButton';

// Memoized rating selector
const RatingSelector = memo(({ 
  rating, 
  onRatingChange 
}: { 
  rating?: number; 
  onRatingChange: (rating: number | undefined) => void;
}) => {
  const { t } = useTranslation();
  
  const handleRatingClick = useCallback((value: number) => {
    onRatingChange(rating === value ? undefined : value);
  }, [rating, onRatingChange]);
  
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{t('ratePlace', { ns: 'add' })}</label>
      <div className="flex gap-2">
        {[...Array(10)].map((_, i) => {
          const ratingNum = i + 1;
          return (
            <RatingButton
              key={i}
              value={ratingNum}
              isSelected={rating !== undefined && rating >= ratingNum}
              onClick={handleRatingClick}
            />
          );
        })}
      </div>
      {rating && (
        <p className="text-xs text-muted-foreground">
          {t('youRated', { ns: 'add' })} {rating}/10
        </p>
      )}
    </div>
  );
});

RatingSelector.displayName = 'RatingSelector';

export const PostEditor = memo(({
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
}: PostEditorProps) => {
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
  
  const canSubmit = useMemo(() => 
    selectedFiles.length > 0 && 
    selectedLocation !== null && 
    selectedCategory !== '' && 
    !isUploading,
    [selectedFiles.length, selectedLocation, selectedCategory, isUploading]
  );

  const handleBack = useCallback(() => navigate(-1), [navigate]);
  
  const handleCaptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onCaptionChange(e.target.value);
  }, [onCaptionChange]);

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
    <div className="flex flex-col h-full bg-background pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background px-4 py-3 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">{t('newPost', { ns: 'add' })}</h1>
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
              onChange={handleCaptionChange}
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
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-2xl shadow-sm"
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
            <RatingSelector rating={rating} onRatingChange={onRatingChange} />
          )}
        </div>
      </div>
    </div>
  );
});

PostEditor.displayName = 'PostEditor';
