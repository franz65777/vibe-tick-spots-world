import React, { useRef, useState, useEffect } from 'react';
import { X, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface MediaGalleryStepProps {
  selectedFiles: File[];
  previewUrls: string[];
  onFilesSelect: (files: FileList) => void;
  onRemoveFile: (index: number) => void;
  onContinue: () => void;
  maxFiles?: number;
}

export const MediaGalleryStep: React.FC<MediaGalleryStepProps> = ({
  selectedFiles,
  previewUrls,
  onFilesSelect,
  onRemoveFile,
  onContinue,
  maxFiles = 10
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  
  // Pinch-to-zoom state
  const [scale, setScale] = useState(1);
  const [lastDistance, setLastDistance] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = getDistance(e.touches[0], e.touches[1]);
      setLastDistance(distance);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const distance = getDistance(e.touches[0], e.touches[1]);
      if (lastDistance > 0) {
        const delta = distance - lastDistance;
        const newScale = Math.max(1, Math.min(3, scale + delta * 0.01));
        setScale(newScale);
      }
      setLastDistance(distance);
    }
  };

  const handleTouchEnd = () => {
    setLastDistance(0);
  };

  useEffect(() => {
    // Reset zoom when switching images
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  }, [previewUrls[0]]);

  if (selectedFiles.length === 0) {
    return (
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <div className="px-4 py-6 pt-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-muted rounded-lg transition-colors -ml-2"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-semibold text-left flex-1 ml-4">
              {t('newPost', { ns: 'add' })}
            </h1>
          </div>
        </div>

        {/* File Input */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-6">
            <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Plus className="w-16 h-16 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">{t('shareExperience', { ns: 'add' })}</h2>
              <p className="text-muted-foreground">{t('addPhotosVideos', { ns: 'add' })}</p>
            </div>
            <Button onClick={handleFileSelect} size="lg" className="w-full max-w-xs">
              {t('chooseFromLibrary', { ns: 'add' })}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t('selectUpTo', { ns: 'add' })} {maxFiles} {t('photosOrVideos', { ns: 'add' })}
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          capture="environment"
          onChange={(e) => e.target.files && onFilesSelect(e.target.files)}
          className="hidden"
        />
      </div>
    );
  }

  const mainFile = selectedFiles[0];
  const isVideo = mainFile?.type.startsWith('video/');

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="px-4 py-6 pt-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-lg transition-colors -ml-2"
          >
            <X className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold text-left flex-1 ml-4">
            {t('newPost', { ns: 'add' })}
          </h1>
          <Button
            onClick={onContinue}
            variant="ghost"
            className="text-primary font-semibold"
          >
            {t('continue', { ns: 'add' })}
          </Button>
        </div>
      </div>

      {/* Main Image/Video Preview with Pinch-to-Zoom */}
      <div className="flex-1 bg-black relative overflow-hidden">
        <div
          ref={imageRef}
          className="w-full h-full flex items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {isVideo ? (
            <video
              src={previewUrls[0]}
              controls
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <img
              src={previewUrls[0]}
              alt="Preview"
              className="max-w-full max-h-full object-contain transition-transform"
              style={{
                transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
                touchAction: 'none'
              }}
            />
          )}
        </div>
      </div>

      {/* Thumbnail Gallery */}
      <div className="bg-background p-4 border-t border-border">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {previewUrls.map((url, index) => {
            const file = selectedFiles[index];
            const isVideo = file?.type.startsWith('video/');
            
            return (
              <div
                key={index}
                className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted"
              >
                {isVideo ? (
                  <video src={url} className="w-full h-full object-cover" />
                ) : (
                  <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                )}
                <button
                  onClick={() => onRemoveFile(index)}
                  className="absolute top-1 right-1 bg-background/80 rounded-full p-1 hover:bg-background transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
          
          {selectedFiles.length < maxFiles && (
            <button
              onClick={handleFileSelect}
              className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Plus className="w-6 h-6 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        capture="environment"
        onChange={(e) => e.target.files && onFilesSelect(e.target.files)}
        className="hidden"
      />
    </div>
  );
};
