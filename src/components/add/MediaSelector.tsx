import React, { useRef } from 'react';
import { Image as ImageIcon, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { useTranslation } from 'react-i18next';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const categories = ['restaurant', 'cafe', 'bar', 'hotel', 'entertainment', 'bakery', 'museum'];

  if (selectedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center bg-background p-6 pt-8 relative overflow-hidden min-h-screen">
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
              const delay = index * 0.15;
              
              return (
                <div
                  key={category}
                  className="absolute opacity-60 animate-bounce"
                  style={{
                    top: `calc(50% + ${y}px - 1.75rem)`,
                    left: `calc(50% + ${x}px - 1.75rem)`,
                    animationDelay: `${delay}s`,
                    animationDuration: '2.5s'
                  }}
                >
                  <CategoryIcon category={category} className="w-14 h-14 drop-shadow-lg" />
                </div>
              );
            })}
            
            {/* Center Photo Icon */}
            <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center shadow-lg relative z-10">
              <ImageIcon className="w-14 h-14 text-primary" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{t('shareExperience', { ns: 'add' })}</h2>
            <p className="text-muted-foreground">
              {t('addPhotosVideos', { ns: 'add' })}
            </p>
          </div>

          <Button 
            onClick={handleClick}
            size="lg"
            className="w-full h-12 rounded-xl"
          >
            <ImageIcon className="w-5 h-5 mr-2" />
            {t('chooseFromLibrary', { ns: 'add' })}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => e.target.files && onFilesSelect(e.target.files)}
            className="hidden"
          />

          <p className="text-xs text-muted-foreground">
            {t('selectUpTo', { ns: 'add' })} {maxFiles} {t('photosOrVideos', { ns: 'add' })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
