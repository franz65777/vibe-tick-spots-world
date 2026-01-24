import React, { useRef, useEffect, memo, useCallback, useState } from 'react';
import { X, Video, Camera, ListPlus } from 'lucide-react';
import addPostButton from '@/assets/add-post-button.png';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import addPageHero from '@/assets/add-hero-cards.png';
import { lazy, Suspense } from 'react';
import { AddPageOnboarding } from './AddPageOnboarding';

// Lazy load the social import tutorial (rarely used)
const SocialImportTutorial = lazy(() => 
  import('./SocialImportTutorial').then(m => ({ default: m.SocialImportTutorial }))
);

interface MediaSelectorProps {
  selectedFiles: File[];
  previewUrls: string[];
  onFilesSelect: (files: FileList) => void;
  onRemoveFile: (index: number) => void;
  maxFiles?: number;
}

// Memoized media preview item
const MediaPreviewItem = memo(({ 
  url, 
  index, 
  isVideo, 
  onRemove 
}: { 
  url: string; 
  index: number; 
  isVideo: boolean; 
  onRemove: (index: number) => void;
}) => {
  const handleRemove = useCallback(() => onRemove(index), [index, onRemove]);
  
  return (
    <div className="relative w-40 h-40 flex-shrink-0 rounded-xl overflow-hidden bg-muted">
      {isVideo ? (
        <video src={url} className="w-full h-full object-cover" controls={false} />
      ) : (
        <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
      )}
      
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
            <Video className="w-5 h-5 text-white" />
          </div>
        </div>
      )}
      
      <button 
        onClick={handleRemove} 
        className="absolute top-2 right-2 w-8 h-8 bg-black/70 hover:bg-black rounded-full flex items-center justify-center transition-colors"
      >
        <X className="w-5 h-5 text-white" />
      </button>
    </div>
  );
});

MediaPreviewItem.displayName = 'MediaPreviewItem';

// Empty state component with enhanced UI
const EmptyState = memo(({ 
  onSelectFiles, 
  fileInputRef 
}: { 
  onSelectFiles: () => void; 
  fileInputRef: React.RefObject<HTMLInputElement>;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // First-visit onboarding
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenAddPageOnboarding');
    return !hasSeenOnboarding;
  });

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem('hasSeenAddPageOnboarding', 'true');
    setShowOnboarding(false);
  }, []);
  
  return (
    <>
      {showOnboarding && <AddPageOnboarding onComplete={handleOnboardingComplete} />}
      
      <div 
        className="flex flex-col items-center justify-center bg-background px-6 pt-6 pb-24 relative overflow-hidden min-h-screen" 
        data-photo-selection="true"
      >
        <div className="text-center space-y-6 max-w-sm relative z-10">
          {/* Hero Image with floating animation */}
          <div className="relative w-full flex items-center justify-center animate-fade-in-up">
            <div className="w-80 h-52 flex items-center justify-center animate-hero-float">
              <img 
                src={addPageHero} 
                alt="Share experience" 
                className="w-full h-full object-contain drop-shadow-xl" 
              />
            </div>
          </div>
          
          {/* Typography with improved hierarchy */}
          <div className="space-y-2 animate-fade-in-up-delay-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {t('shareExperience', { ns: 'add' })}
            </h2>
            <p className="text-muted-foreground/80 text-sm">
              {t('addPhotosVideos', { ns: 'add' })}
            </p>
          </div>

          {/* Action buttons with clear hierarchy */}
          <div className="space-y-3 w-full pt-4 animate-fade-in-up-delay-2">
            {/* Primary CTA - Create Post */}
            <Button
              onClick={onSelectFiles}
              size="lg"
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-lg shadow-xl shadow-blue-500/25 transition-all duration-300 active:scale-[0.97] flex items-center justify-center gap-3"
            >
              <Camera className="w-6 h-6" />
              <span>{t('createPost', { ns: 'add' })}</span>
            </Button>

            {/* Secondary CTA - Create List */}
            <Button
              onClick={() => navigate('/create-list')}
              variant="ghost"
              size="lg"
              className="w-full h-12 rounded-2xl bg-muted/50 hover:bg-muted text-foreground font-medium text-base border border-border/50 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <ListPlus className="w-5 h-5 text-muted-foreground" />
              <span className="text-muted-foreground">{t('createAList', { ns: 'add' })}</span>
            </Button>
          </div>

          <input 
            ref={fileInputRef} 
            type="file" 
            accept="image/*,video/*" 
            multiple 
            onChange={e => e.target.files && (e.target as HTMLInputElement).form?.dispatchEvent(new Event('filesSelected', { bubbles: true }))}
            className="hidden" 
          />
        </div>
      </div>
    </>
  );
});

EmptyState.displayName = 'EmptyState';

export const MediaSelector = memo(({
  selectedFiles,
  previewUrls,
  onFilesSelect,
  onRemoveFile,
  maxFiles = 5
}: MediaSelectorProps) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesSelect(e.target.files);
    }
  }, [onFilesSelect]);

  // Auto-scroll to show add button when new photo is added
  useEffect(() => {
    if (selectedFiles.length >= 2 && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollWidth,
        behavior: 'smooth'
      });
    }
  }, [selectedFiles.length]);

  if (selectedFiles.length === 0) {
    return (
      <>
        <EmptyState onSelectFiles={handleClick} fileInputRef={fileInputRef} />
        <input 
          ref={fileInputRef} 
          type="file" 
          accept="image/*,video/*" 
          multiple 
          onChange={handleFileChange}
          className="hidden" 
        />
      </>
    );
  }

  return (
    <div className="space-y-3" data-photo-selection="false">
      {/* All items in horizontal scroll */}
      <div ref={scrollContainerRef} className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 items-center">
          {previewUrls.map((url, index) => {
            const file = selectedFiles[index];
            const isVideo = file?.type.startsWith('video/');
            return (
              <MediaPreviewItem
                key={`${url}-${index}`}
                url={url}
                index={index}
                isVideo={isVideo}
                onRemove={onRemoveFile}
              />
            );
          })}
          
          {/* Add more button - green + icon */}
          {selectedFiles.length < maxFiles && (
            <button onClick={handleClick} className="flex-shrink-0 ml-1">
              <img src={addPostButton} alt="Add" className="w-12 h-12 object-contain" />
            </button>
          )}
        </div>
      </div>

      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*,video/*" 
        multiple 
        onChange={handleFileChange}
        className="hidden" 
      />
    </div>
  );
});

MediaSelector.displayName = 'MediaSelector';
