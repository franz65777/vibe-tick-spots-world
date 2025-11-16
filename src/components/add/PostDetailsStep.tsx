import React from 'react';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LocationSelector } from './LocationSelector';
import { UserTagSelector } from './UserTagSelector';
import { useTranslation } from 'react-i18next';

interface PostDetailsStepProps {
  caption: string;
  selectedLocation: any;
  selectedCategory: string;
  taggedUsers: any[];
  rating?: number;
  isUploading: boolean;
  onCaptionChange: (caption: string) => void;
  onLocationSelect: (location: any) => void;
  onCategoryChange: (category: string) => void;
  onUserTagged: (user: any) => void;
  onUserRemoved: (userId: string) => void;
  onRatingChange?: (rating: number | undefined) => void;
  onSubmit: () => void;
  onBack: () => void;
  isBusinessAccount?: boolean;
  previewUrl?: string;
}

export const PostDetailsStep: React.FC<PostDetailsStepProps> = ({
  caption,
  selectedLocation,
  selectedCategory,
  taggedUsers,
  rating,
  isUploading,
  onCaptionChange,
  onLocationSelect,
  onCategoryChange,
  onUserTagged,
  onUserRemoved,
  onRatingChange,
  onSubmit,
  onBack,
  isBusinessAccount = false,
  previewUrl
}) => {
  const { t } = useTranslation();
  
  const canSubmit = 
    selectedLocation !== null && 
    selectedCategory !== '' && 
    !isUploading;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="px-4 py-6 pt-8">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 hover:bg-muted rounded-lg transition-colors -ml-2"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold text-left flex-1 ml-4">
            {t('newPost', { ns: 'add' })}
          </h1>
          <div className="w-9" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 space-y-4">
          {/* Preview Thumbnail */}
          {previewUrl && (
            <div className="flex gap-3 items-start">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {previewUrl.includes('video') ? (
                  <video src={previewUrl} className="w-full h-full object-cover" />
                ) : (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                )}
              </div>
            </div>
          )}

          {/* Caption */}
          <div className="space-y-2">
            <Textarea
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              placeholder={t('captionPlaceholder', { ns: 'add' })}
              className="min-h-[100px] resize-none border-border"
            />
          </div>

          {/* Tag Users */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <span className="text-primary">👥</span>
              {t('tagPeople', { ns: 'add' })}
            </label>
            <UserTagSelector
              taggedUsers={taggedUsers}
              onUserTagged={onUserTagged}
              onUserRemoved={onUserRemoved}
            />
          </div>

          {/* Location Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <span className="text-destructive">📍</span>
              {t('addLocation', { ns: 'add' })}
              <span className="text-destructive ml-1">{t('required', { ns: 'common' })}</span>
            </label>
            <LocationSelector
              selectedLocation={selectedLocation}
              selectedCategory={selectedCategory}
              onLocationSelect={onLocationSelect}
              onCategoryChange={onCategoryChange}
              disabled={isBusinessAccount}
            />
          </div>

          {/* Location Required Notice */}
          {!selectedLocation && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <span className="text-amber-500 text-lg mt-0.5">⚠️</span>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {t('locationRequired', { ns: 'add' })}
              </p>
            </div>
          )}

          {/* Rating (only for personal accounts) */}
          {!isBusinessAccount && onRatingChange && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('ratePlace', { ns: 'add' })} ({t('optional', { ns: 'add' })})
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                  <button
                    key={value}
                    onClick={() => onRatingChange(rating === value ? undefined : value)}
                    className={`
                      w-10 h-10 rounded-lg font-medium transition-all
                      ${rating === value 
                        ? 'bg-primary text-primary-foreground shadow-lg scale-110' 
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'}
                    `}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="p-4 border-t border-border bg-background">
        <Button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="w-full h-12 text-base font-semibold"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {t('posting', { ns: 'add' })}
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              {t('share', { ns: 'common' })}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
