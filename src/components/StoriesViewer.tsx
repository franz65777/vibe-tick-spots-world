
import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  locationId: string;
  locationName: string;
  locationAddress: string;
  timestamp: string;
  isViewed: boolean;
  bookingUrl?: string;
}

interface StoriesViewerProps {
  stories: Story[];
  initialStoryIndex: number;
  onClose: () => void;
  onStoryViewed: (storyId: string) => void;
}

const StoriesViewer = ({ stories, initialStoryIndex, onClose, onStoryViewed }: StoriesViewerProps) => {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentStory = stories[currentStoryIndex];

  useEffect(() => {
    if (!currentStory) return;

    // Mark story as viewed when it starts
    onStoryViewed(currentStory.id);
  }, [currentStory?.id, onStoryViewed]);

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextStory();
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [currentStoryIndex, isPaused]);

  const nextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const previousStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  const handlePause = () => setIsPaused(true);
  const handleResume = () => setIsPaused(false);

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
        {stories.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: index < currentStoryIndex ? '100%' : index === currentStoryIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
      >
        <X className="w-6 h-6" />
      </Button>

      {/* User info */}
      <div className="absolute top-16 left-4 right-4 flex items-center gap-3 z-10">
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-xs font-medium">{currentStory.userName[0]}</span>
        </div>
        <div>
          <p className="text-white font-medium text-sm">{currentStory.userName}</p>
          <p className="text-white/70 text-xs">{currentStory.timestamp}</p>
        </div>
      </div>

      {/* Navigation areas */}
      <div 
        className="absolute left-0 top-0 w-1/3 h-full z-10 cursor-pointer"
        onClick={previousStory}
        onMouseDown={handlePause}
        onMouseUp={handleResume}
        onTouchStart={handlePause}
        onTouchEnd={handleResume}
      />
      <div 
        className="absolute right-0 top-0 w-1/3 h-full z-10 cursor-pointer"
        onClick={nextStory}
        onMouseDown={handlePause}
        onMouseUp={handleResume}
        onTouchStart={handlePause}
        onTouchEnd={handleResume}
      />

      {/* Story content */}
      <div className="w-full h-full flex items-center justify-center">
        <img
          src={currentStory.mediaUrl}
          alt="Story"
          className="max-w-full max-h-full object-contain"
          onMouseDown={handlePause}
          onMouseUp={handleResume}
        />
      </div>

      {/* Location info */}
      <div className="absolute bottom-20 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <MapPin className="w-5 h-5 text-white" />
          <div>
            <h3 className="text-white font-medium">{currentStory.locationName}</h3>
            <p className="text-white/70 text-sm">{currentStory.locationAddress}</p>
          </div>
        </div>
        
        {currentStory.bookingUrl && (
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => window.open(currentStory.bookingUrl, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Book Now
          </Button>
        )}
      </div>

      {/* Navigation arrows */}
      {currentStoryIndex > 0 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={previousStory}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
      )}
      
      {currentStoryIndex < stories.length - 1 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={nextStory}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      )}
    </div>
  );
};

export default StoriesViewer;
