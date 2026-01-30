import React, { useRef, useEffect, memo, useCallback, useState } from 'react';
import { X, Video, Camera } from 'lucide-react';
import addPostButton from '@/assets/add-post-button.png';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import addPageHero from '@/assets/add-hero-cards.png';
import { haptics } from '@/utils/haptics';
import { SocialImportTutorial } from './SocialImportTutorial';
import { GoogleMapsImportModal } from '@/components/list/GoogleMapsImportModal';
import { toast } from 'sonner';

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
  const [showSocialTutorial, setShowSocialTutorial] = useState(false);
  const [showGoogleMapsModal, setShowGoogleMapsModal] = useState(false);
  
  const handleGoogleMapsImport = (places: any[]) => {
    // Navigate to create-list with imported places
    toast.success(t('placesImported', { ns: 'createList', count: places.length, defaultValue: '{{count}} places imported' }));
    navigate('/create-list');
  };
  
  return (
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

        {/* Primary CTA - Create Post */}
        <div className="w-full pt-4 animate-fade-in-up-delay-2">
          <Button
            onClick={() => {
              haptics.impact('medium');
              onSelectFiles();
            }}
            size="lg"
            className="w-full h-14 rounded-2xl bg-gray-200/60 dark:bg-slate-800/70 backdrop-blur-md border border-border/50 shadow-sm hover:bg-gray-300/60 dark:hover:bg-slate-700/70 text-foreground font-semibold text-base transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <span>{t('createPost', { ns: 'add' })}</span>
          </Button>
        </div>

        {/* Import/Create Section - Horizontal Cards */}
        <div className="w-full pt-2 animate-fade-in-up-delay-2">
          <div className="grid grid-cols-3 gap-3">
            {/* Import from Instagram/TikTok */}
            <button
              onClick={() => {
                haptics.impact('light');
                setShowSocialTutorial(true);
              }}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all active:scale-[0.97]"
            >
              <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center relative overflow-hidden">
                {/* Instagram gradient icon */}
                <svg viewBox="0 0 24 24" className="w-8 h-8 absolute -left-0.5">
                  <defs>
                    <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#FFDC80" />
                      <stop offset="50%" stopColor="#F56040" />
                      <stop offset="100%" stopColor="#833AB4" />
                    </linearGradient>
                  </defs>
                  <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#instagram-gradient)" />
                  <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.5" fill="none" />
                  <circle cx="17.5" cy="6.5" r="1.5" fill="white" />
                </svg>
                {/* TikTok icon */}
                <svg viewBox="0 0 24 24" className="w-7 h-7 absolute -right-1 top-1">
                  <rect x="2" y="2" width="20" height="20" rx="5" fill="#000" />
                  <path d="M16.5 8.5c-1.5 0-2.5-1-2.5-2.5V5h-2v9c0 1.4-1.1 2.5-2.5 2.5S7 15.4 7 14s1.1-2.5 2.5-2.5c.3 0 .5 0 .8.1v-2c-.3 0-.5-.1-.8-.1C7 9.5 5 11.5 5 14s2 4.5 4.5 4.5S14 16.5 14 14V9.5c.8.5 1.8.8 2.8.8h.2V8.5h-.5z" fill="#25F4EE"/>
                  <path d="M15.5 8.5c-1.5 0-2.5-1-2.5-2.5V5h-2v9c0 1.4-1.1 2.5-2.5 2.5S6 15.4 6 14s1.1-2.5 2.5-2.5c.3 0 .5 0 .8.1v-2c-.3 0-.5-.1-.8-.1C6 9.5 4 11.5 4 14s2 4.5 4.5 4.5S13 16.5 13 14V9.5c.8.5 1.8.8 2.8.8h.2V8.5h-.5z" fill="#FE2C55"/>
                </svg>
              </div>
              <span className="text-xs font-medium text-center leading-tight text-muted-foreground">
                {t('importIgTiktok', { ns: 'add', defaultValue: 'import ig & tiktok' })}
              </span>
            </button>

            {/* Import from Google Maps */}
            <button
              onClick={() => {
                haptics.impact('light');
                setShowGoogleMapsModal(true);
              }}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all active:scale-[0.97]"
            >
              <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center">
                <svg viewBox="0 0 48 48" className="w-10 h-10">
                  <path fill="#48b564" d="M35.76,26.36h0.01c0,0-3.77,5.53-6.94,9.64c-2.74,3.55-3.54,6.59-3.77,8.06C24.97,44.6,24.53,45,24,45s-0.97-0.4-1.06-0.94c-0.23-1.47-1.03-4.51-3.77-8.06c-0.42-0.55-0.85-1.12-1.28-1.7L28.24,22l8.33-9.88C37.49,14.05,38,16,38,18C38,21.09,37.2,23.97,35.76,26.36z"/>
                  <path fill="#fcc60e" d="M28.24,22L17.89,34.3c-2.82-3.78-5.66-7.94-5.66-7.94h0.01c-0.3-0.48-0.57-0.97-0.8-1.48L19.76,15c-0.79,0.95-1.26,2.17-1.26,3.5c0,3.04,2.46,5.5,5.5,5.5C25.71,24,27.24,23.22,28.24,22z"/>
                  <path fill="#2c85eb" d="M28.4,4.74l-8.57,10.18L13.27,9.2C15.83,6.02,19.69,4,24,4C25.54,4,27.02,4.26,28.4,4.74z"/>
                  <path fill="#ed5748" d="M19.83,14.92L28.4,4.74c3.84,1.29,7.01,4.09,8.76,7.7c0.21,0.44,0.4,0.88,0.56,1.34L24,24c-3.04,0-5.5-2.46-5.5-5.5C18.5,17.09,18.97,15.87,19.76,14.92z"/>
                </svg>
              </div>
              <span className="text-xs font-medium text-center leading-tight text-muted-foreground">
                {t('importGmaps', { ns: 'add', defaultValue: 'import gmaps list' })}
              </span>
            </button>

            {/* Make a List */}
            <button
              onClick={() => {
                haptics.impact('light');
                navigate('/create-list');
              }}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all active:scale-[0.97]"
            >
              <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center relative overflow-hidden">
                {/* Two overlapping list card images */}
                <div className="absolute w-8 h-10 rounded-md bg-gradient-to-br from-amber-200 to-amber-400 -left-0.5 top-0.5 rotate-[-8deg] shadow-sm" style={{ backgroundImage: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)' }}>
                  <div className="absolute bottom-1 left-1 right-1 text-[5px] font-bold text-amber-800 truncate">matcha</div>
                </div>
                <div className="absolute w-8 h-10 rounded-md bg-gradient-to-br from-blue-200 to-blue-500 right-0 bottom-0.5 rotate-[6deg] shadow-sm" style={{ backgroundImage: 'linear-gradient(135deg, #93C5FD 0%, #3B82F6 100%)' }}>
                  <div className="absolute bottom-1 left-1 right-1 text-[5px] font-bold text-blue-900 truncate">tokyo</div>
                </div>
              </div>
              <span className="text-xs font-medium text-center leading-tight text-muted-foreground">
                {t('makeAList', { ns: 'add', defaultValue: 'make a list' })}
              </span>
            </button>
          </div>
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

      {/* Social Import Tutorial Modal */}
      <SocialImportTutorial 
        open={showSocialTutorial} 
        onClose={() => setShowSocialTutorial(false)} 
      />

      {/* Google Maps Import Modal */}
      <GoogleMapsImportModal 
        isOpen={showGoogleMapsModal}
        onClose={() => setShowGoogleMapsModal(false)}
        onImport={handleGoogleMapsImport}
      />
    </div>
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
