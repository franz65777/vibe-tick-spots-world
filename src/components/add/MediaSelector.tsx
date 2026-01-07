import React, { useRef, useState, useEffect } from 'react';
import { X, Video, Camera } from 'lucide-react';
import addPostButton from '@/assets/add-post-button.png';
import listIcon from '@/assets/list-icon.png';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import addPageHero from '@/assets/add-hero-cards.png';
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
  const { t, i18n } = useTranslation();
   const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSocialImport, setShowSocialImport] = useState(false);
  const handleClick = () => {
    fileInputRef.current?.click();
  };
  if (selectedFiles.length === 0) {
    return <div className="flex flex-col items-center justify-center bg-background p-6 -mt-[30px] relative overflow-hidden min-h-screen" data-photo-selection="true">
        <div className="text-center space-y-6 max-w-sm relative z-10">
          {/* Hero Image with 5 photo cards */}
          <div className="relative w-full flex items-center justify-center mb-4">
            <div className="w-72 h-48 flex items-center justify-center">
              <img src={addPageHero} alt="Share experience" className="w-full h-full object-contain" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{t('shareExperience', {
              ns: 'add'
            })}</h2>
            <p className="text-muted-foreground">
              {t('addPhotosVideos', {
              ns: 'add'
            })}
            </p>
          </div>

          <div className="space-y-3 w-full">
             <div className="flex flex-col gap-3 w-full">
              <Button
                 onClick={handleClick}
                 size="lg"
                 className="w-full h-12 rounded-2xl bg-background/40 backdrop-blur-2xl border-2 border-primary/20 hover:border-primary/30 hover:bg-background/50 text-foreground transition-all duration-200 shadow-sm"
               >
                  <span className="mr-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/80 ring-1 ring-border/60">
                    <Camera className="h-5 w-5" />
                  </span>
                 <span className="whitespace-nowrap">
                   {t('createPost', { ns: 'add' })}
                 </span>
               </Button>
 
               <Button
                 onClick={() => navigate('/create-list')}
                 size="lg"
                 className="w-full h-12 rounded-2xl bg-background/40 backdrop-blur-2xl border-2 border-primary/20 hover:border-primary/30 hover:bg-background/50 text-foreground transition-all duration-200 shadow-sm"
               >
                 <img src={listIcon} alt="List" className="w-6 h-6 mr-2" />
                 <span className="whitespace-nowrap">
                   {t('createAList', { ns: 'add' })}
                 </span>
               </Button>
             </div>
           </div>

          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={e => e.target.files && onFilesSelect(e.target.files)} className="hidden" />
        </div>

        {/* Social Import Tutorial */}
        <SocialImportTutorial open={showSocialImport} onClose={() => setShowSocialImport(false)} />
      </div>;
  }
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to show add button when new photo is added
  useEffect(() => {
    if (selectedFiles.length >= 2 && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollWidth,
        behavior: 'smooth'
      });
    }
  }, [selectedFiles.length]);

  return <div className="space-y-3" data-photo-selection="false">
      {/* All items in horizontal scroll */}
      <div ref={scrollContainerRef} className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 items-center">
          {previewUrls.map((url, index) => {
            const file = selectedFiles[index];
            const isVideo = file?.type.startsWith('video/');
            return <div key={index} className="relative w-40 h-40 flex-shrink-0 rounded-xl overflow-hidden bg-muted">
              {isVideo ? <video src={url} className="w-full h-full object-cover" controls={false} /> : <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />}
              
              {isVideo && <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                  <Video className="w-5 h-5 text-white" />
                </div>
              </div>}
              
              <button onClick={() => onRemoveFile(index)} className="absolute top-2 right-2 w-8 h-8 bg-black/70 hover:bg-black rounded-full flex items-center justify-center transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>;
          })}
          
          {/* Add more button - green + icon */}
          {selectedFiles.length < maxFiles && (
            <button onClick={handleClick} className="flex-shrink-0 ml-1">
              <img src={addPostButton} alt="Add" className="w-12 h-12 object-contain" />
            </button>
          )}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={e => e.target.files && onFilesSelect(e.target.files)} className="hidden" />
    </div>;
};