
import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, MapPin, Calendar, ExternalLink } from 'lucide-react';
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
  bookingUrl?: string; // For OpenTable/Booking.com integration
}

interface StoriesViewerProps {
  stories: Story[];
  initialStoryIndex: number;
  onClose: () => void;
  onStoryViewed: (storyId: string) => void;
}

const StoriesViewer = ({ stories, initialStoryIndex, onClose, onStoryViewed }: StoriesViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showLocationDetails, setShowLocationDetails] = useState(false);

  const currentStory = stories[currentIndex];
  const storyDuration = 5000; // 5 seconds per story

  useEffect(() => {
    if (!currentStory || isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextStory();
          return 0;
        }
        return prev + (100 / (storyDuration / 100));
      });
    }, 100);

    // Mark story as viewed
    if (!currentStory.isViewed) {
      onStoryViewed(currentStory.id);
    }

    return () => clearInterval(interval);
  }, [currentIndex, isPaused, currentStory]);

  const nextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const prevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const handleBooking = () => {
    if (currentStory.bookingUrl) {
      window.open(currentStory.bookingUrl, '_blank');
    }
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
        {stories.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{ 
                width: index < currentIndex ? '100%' : 
                       index === currentIndex ? `${progress}%` : '0%' 
              }}
            />
          </div>
        ))}
      </div>

      {/* User info */}
      <div className="absolute top-12 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700">
              {currentStory.userName[0]}
            </span>
          </div>
          <div>
            <p className="text-white font-medium text-sm">{currentStory.userName}</p>
            <p className="text-white/70 text-xs">{currentStory.timestamp}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-5 h-5 text-white" />
        </Button>
      </div>

      {/* Navigation areas */}
      <div className="absolute left-0 top-0 w-1/3 h-full z-10" onClick={prevStory} />
      <div className="absolute right-0 top-0 w-1/3 h-full z-10" onClick={nextStory} />
      
      {/* Pause on press */}
      <div 
        className="absolute inset-0 z-10"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      />

      {/* Media content */}
      <div className="w-full h-full flex items-center justify-center">
        {currentStory.mediaType === 'video' ? (
          <video 
            src={currentStory.mediaUrl} 
            className="max-w-full max-h-full object-contain"
            autoPlay
            muted
            loop
          />
        ) : (
          <img 
            src={currentStory.mediaUrl} 
            alt="Story" 
            className="max-w-full max-h-full object-contain"
          />
        )}
      </div>

      {/* Location tag */}
      <div 
        className="absolute bottom-20 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 cursor-pointer"
        onClick={() => setShowLocationDetails(!showLocationDetails)}
      >
        <div className="flex items-center gap-2 text-white">
          <MapPin className="w-4 h-4" />
          <div>
            <p className="font-medium">{currentStory.locationName}</p>
            <p className="text-sm text-white/70">{currentStory.locationAddress}</p>
          </div>
        </div>

        {/* Booking option */}
        {showLocationDetails && currentStory.bookingUrl && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <Button 
              onClick={handleBooking}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Book Now
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20"
          onClick={prevStory}
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
      )}
      
      {currentIndex < stories.length - 1 && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20"
          onClick={nextStory}
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      )}
    </div>
  );
};

export default StoriesViewer;
