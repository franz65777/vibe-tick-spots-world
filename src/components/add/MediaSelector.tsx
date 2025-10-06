import React, { useRef } from 'react';
import { Image as ImageIcon, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/common/CategoryIcon';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const categories = ['restaurant', 'cafe', 'bar', 'hotel', 'entertainment', 'bakery', 'museum'];

  if (selectedFiles.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 relative overflow-hidden">
        {/* Floating Category Icons - Bigger and 2 Rows */}
        <div className="absolute top-12 left-0 right-0 z-0 pointer-events-none">
          <div className="relative h-64 max-w-2xl mx-auto">
            {categories.map((category, index) => {
              // Arrange in 2 rows: 4 on top, 3 on bottom
              const positions = [
                { top: '15%', left: '8%' },   // row 1
                { top: '15%', left: '30%' },
                { top: '15%', left: '52%' },
                { top: '15%', left: '74%' },
                { top: '55%', left: '18%' },  // row 2
                { top: '55%', left: '44%' },
                { top: '55%', left: '70%' }
              ];
              const pos = positions[index];
              const delay = index * 0.15;
              
              return (
                <div
                  key={category}
                  className="absolute opacity-30 animate-bounce"
                  style={{
                    top: pos.top,
                    left: pos.left,
                    animationDelay: `${delay}s`,
                    animationDuration: '2.5s'
                  }}
                >
                  <CategoryIcon category={category} className="w-16 h-16" />
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center space-y-6 max-w-sm relative z-10 mt-8">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <ImageIcon className="w-12 h-12 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Share Your Experience</h2>
            <p className="text-muted-foreground">
              Add photos or videos from your favorite places
            </p>
          </div>

          <Button 
            onClick={handleClick}
            size="lg"
            className="w-full h-12"
          >
            <ImageIcon className="w-5 h-5 mr-2" />
            Choose from Library
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
            Select up to {maxFiles} photos or videos
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
            <span className="text-sm text-muted-foreground">Add more</span>
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
