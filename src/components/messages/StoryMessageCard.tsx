import React from 'react';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';

interface StoryMessageCardProps {
  storyData: {
    story_id: string;
    media_url: string;
    media_type: 'image' | 'video';
    location_name?: string;
    user_name?: string;
  };
  content?: string;
}

const StoryMessageCard = ({ storyData, content }: StoryMessageCardProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col">
      {/* Story preview with image/video thumbnail */}
      <div className="relative w-full aspect-[9/16] max-w-[200px] rounded-lg overflow-hidden bg-muted">
        {storyData.media_type === 'video' ? (
          <>
            <img 
              src={storyData.media_url} 
              alt="Story preview" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="w-6 h-6 text-black ml-0.5" fill="currentColor" />
              </div>
            </div>
          </>
        ) : (
          <img 
            src={storyData.media_url} 
            alt="Story preview" 
            className="w-full h-full object-cover"
          />
        )}
      </div>
      
      {/* Message text */}
      {content && (
        <p className="text-sm text-foreground mt-2 px-1">
          {content}
        </p>
      )}
    </div>
  );
};

export default StoryMessageCard;
