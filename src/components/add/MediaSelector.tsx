import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Video, X, MapPin as Map, FolderPlus, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import addPageHero from '@/assets/add-page-hero.png';
import { SocialImportTutorial } from './SocialImportTutorial';

interface MediaSelectorProps {
  selectedFiles: File[];
  previewUrls: string[];
  onFilesSelect: (files: FileList) => void;
  onRemoveFile: (index: number) => void;
  maxFiles?: number;
}

export const MediaSelector: React.FC<MediaSelectorProps> = ({
  selectedFiles,
  previewUrls,
  onFilesSelect,
  onRemoveFile,
  maxFiles = 5
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSocialImport, setShowSocialImport] = useState(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const categories = ['restaurant', 'cafe', 'bar', 'hotel', 'entertainment', 'bakery', 'museum'];

  if (selectedFiles.length === 0) {
    return (
      <div 
        className="flex flex-col items-center justify-center bg-background p-6 -mt-[30px] relative overflow-hidden min-h-screen"
        data-photo-selection="true"
      >
        <div className="text-center space-y-6 max-w-sm relative z-10">
          {/* Floating Category Icons - Arranged in Circle */}
          <div className="relative w-full h-64 flex items-center justify-center mb-4">
            {categories.map((category, index) => {
              // Position icons in a circle around the center (radius: 120px)
              const angle = (index * 360) / categories.length;
              const radius = 120;
              const radian = (angle * Math.PI) / 180;
              const x = Math.cos(radian) * radius;
              const y = Math.sin(radian) * radius;
              
              return (
                <div
                  key={category}
                  className="absolute opacity-70 transition-opacity hover:opacity-100"
                  style={{
                    top: `calc(50% + ${y}px - 1.75rem)`,
                    left: `calc(50% + ${x}px - 1.75rem)`
                  }}
                >
                  <CategoryIcon category={category} className="w-14 h-14 drop-shadow-lg" />
                </div>
              );
            })}
            
            {/* Center Hero Image */}
            <div className="w-36 h-36 flex items-center justify-center relative z-10">
              <img src={addPageHero} alt="Share experience" className="w-full h-full object-contain" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{t('shareExperience', { ns: 'add' })}</h2>
            <p className="text-muted-foreground">
              {t('addPhotosVideos', { ns: 'add' })}
            </p>
          </div>

          <div className="space-y-3 w-full">
            <Button 
              onClick={handleClick}
              size="lg"
              className="w-full h-12 rounded-2xl bg-background/40 backdrop-blur-2xl border-2 border-primary/20 hover:border-primary/30 hover:bg-background/50 text-foreground transition-all duration-200 shadow-sm"
            >
              <ImageIcon className="w-5 h-5 mr-2 text-primary" />
              {t('chooseFromLibrary', { ns: 'add' })}
            </Button>

            {/* Import from Instagram */}
            <Button 
              onClick={() => setShowSocialImport(true)}
              size="lg"
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-pink-500/20 to-purple-500/20 backdrop-blur-2xl border-2 border-pink-500/30 hover:border-pink-500/50 hover:from-pink-500/30 hover:to-purple-500/30 text-foreground transition-all duration-200 shadow-sm"
            >
              <Instagram className="w-5 h-5 mr-2 text-pink-500" />
              {t('importFromInstagram', { ns: 'add', defaultValue: 'Import from Instagram' })}
            </Button>

            <div className="flex gap-3 w-full">
              <Button 
                onClick={() => navigate('/save-location')}
                size="lg"
                className="flex-1 h-12 rounded-2xl bg-background/40 backdrop-blur-2xl border-2 border-primary/20 hover:border-primary/30 hover:bg-background/50 text-foreground transition-all duration-200 shadow-sm px-3"
              >
                <Map className="w-5 h-5 mr-2 text-primary flex-shrink-0" />
                <span className="whitespace-nowrap">{t('addLocation', { ns: 'add' })}</span>
              </Button>

              <Button 
                onClick={() => navigate('/create-list')}
                size="lg"
                className="flex-1 h-12 rounded-2xl bg-background/40 backdrop-blur-2xl border-2 border-primary/20 hover:border-primary/30 hover:bg-background/50 text-foreground transition-all duration-200 shadow-sm px-3"
              >
                <FolderPlus className="w-5 h-5 mr-2 text-primary flex-shrink-0" />
                <span className="whitespace-nowrap">{t('createList', { ns: 'add' })}</span>
              </Button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => e.target.files && onFilesSelect(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Social Import Tutorial */}
        <SocialImportTutorial
          open={showSocialImport}
          onClose={() => setShowSocialImport(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3" data-photo-selection="false">
      <div className="grid grid-cols-2 gap-3">
        {previewUrls.map((url, index) => {
          const file = selectedFiles[index];
          const isVideo = file?.type.startsWith('video/');
          
          return (
            <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
              {isVideo ? (
                <video 
                  src={url}
                  className="w-full h-full object-cover"
                  controls={false}
                />
              ) : (
                <img 
                  src={url} 
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
              
              {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                    <Video className="w-6 h-6 text-white" />
                  </div>
                </div>
              )}
              
              <button
                onClick={() => onRemoveFile(index)}
                className="absolute top-2 right-2 w-8 h-8 bg-black/70 hover:bg-black rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          );
        })}
        
        {selectedFiles.length < maxFiles && (
          <button 
            onClick={handleClick}
            className="aspect-square border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">{t('addMore', { ns: 'add' })}</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={(e) => e.target.files && onFilesSelect(e.target.files)}
        className="hidden"
      />
    </div>
  );
};
