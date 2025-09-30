
import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, MapPin, ExternalLink, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  locationCategory?: string;
  timestamp: string;
  isViewed: boolean;
  bookingUrl?: string;
}

interface StoriesViewerProps {
  stories: Story[];
  initialStoryIndex: number;
  onClose: () => void;
  onStoryViewed: (storyId: string) => void;
  onLocationClick?: (locationId: string) => void;
}

const getInitials = (name: string) => {
  if (!name || typeof name !== 'string') return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name[0]?.toUpperCase() || 'U';
};

const StoriesViewer = ({ stories, initialStoryIndex, onClose, onStoryViewed, onLocationClick }: StoriesViewerProps) => {
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
      {/* Progress bars - Enhanced horizontal indicator */}
      <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-10">
        {stories.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden shadow-sm">
            <div
              className="h-full bg-gradient-to-r from-white to-blue-100 transition-all duration-100 rounded-full"
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

      {/* User info - Enhanced with better visibility */}
      <div className="absolute top-16 left-4 right-4 flex items-center gap-3 z-10 bg-black/40 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-xl">
        <div className="w-11 h-11 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
          {currentStory.userAvatar ? (
            <img 
              src={currentStory.userAvatar} 
              alt={currentStory.userName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-sm font-bold text-gray-700">{getInitials(currentStory.userName)}</span>
          )}
        </div>
        <div className="flex-1">
          <p className="text-white font-bold text-sm drop-shadow-lg">{currentStory.userName}</p>
          <p className="text-white/90 text-xs drop-shadow font-medium">
            {new Date(currentStory.timestamp).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })}
          </p>
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

      {/* Location info - Enhanced card */}
      <div className="absolute bottom-6 left-4 right-4 bg-black/80 backdrop-blur-lg rounded-3xl p-5 shadow-2xl border border-white/20">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-lg mb-1.5 leading-tight">{currentStory.locationName}</h3>
            <p className="text-white/80 text-sm mb-2.5 leading-snug">{currentStory.locationAddress}</p>
            {currentStory.locationCategory && (
              <Badge className="bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-white border-white/40 text-xs font-semibold px-3 py-1 backdrop-blur">
                {currentStory.locationCategory}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-3">
          {onLocationClick && currentStory.locationId && (
            <Button
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold shadow-lg transition-all active:scale-95"
              onClick={() => onLocationClick(currentStory.locationId)}
            >
              <Navigation className="w-4 h-4 mr-2" />
              View on Map
            </Button>
          )}
          
          {currentStory.bookingUrl && (
            <Button
              className="flex-1 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold backdrop-blur border border-white/30 transition-all active:scale-95"
              onClick={() => window.open(currentStory.bookingUrl, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Details
            </Button>
          )}
        </div>
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
