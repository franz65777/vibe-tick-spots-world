
import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, MapPin, Heart, Share2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import pinIcon from '@/assets/pin-icon.png';

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
  onReplyToStory?: (storyId: string, userId: string, message: string) => void;
}

const getInitials = (name: string) => {
  if (!name || typeof name !== 'string') return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name[0]?.toUpperCase() || 'U';
};

const StoriesViewer = ({ stories, initialStoryIndex, onClose, onStoryViewed, onLocationClick, onReplyToStory }: StoriesViewerProps) => {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const { t } = useTranslation();
  const { user } = useAuth();
  const { savedPlaces, savePlace } = useSavedPlaces();
  const currentStory = stories[currentStoryIndex];
  
  // Check if location is already saved
  const allSavedPlaces = Object.values(savedPlaces).flat();
  const isLocationSaved = currentStory?.locationId ? 
    allSavedPlaces.some(place => place.id === currentStory.locationId) : 
    false;

  useEffect(() => {
    if (!currentStory || !user) return;

    // Mark story as viewed when it starts
    const markAsViewed = async () => {
      try {
        await supabase
          .from('story_views' as any)
          .insert({
            story_id: currentStory.id,
            user_id: user.id
          })
          .then(() => {
            onStoryViewed(currentStory.id);
          });
      } catch (error) {
        console.error('Error marking story as viewed:', error);
      }
    };

    markAsViewed();
  }, [currentStory?.id, user, onStoryViewed]);

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

  const handleLike = async () => {
    if (!user || !currentStory) return;
    
    try {
      if (liked) {
        // Unlike
        const { error } = await supabase
          .from('story_likes' as any)
          .delete()
          .eq('story_id', currentStory.id)
          .eq('user_id', user.id);
        if (!error) setLiked(false);
      } else {
        // Like
        const { error } = await supabase
          .from('story_likes' as any)
          .insert({
            story_id: currentStory.id,
            user_id: user.id
          });
        if (!error) {
          setLiked(true);
          toast.success('Story liked!');
        }
      }
    } catch (error) {
      console.error('Error liking story:', error);
    }
  };

  const handleSaveLocation = async () => {
    if (!user || !currentStory || !currentStory.locationId || saving) return;
    
    setSaving(true);
    try {
      await savePlace({
        id: currentStory.locationId,
        name: currentStory.locationName,
        address: currentStory.locationAddress,
        category: currentStory.locationCategory || 'restaurant',
        coordinates: { lat: 0, lng: 0 }, // These would need to be included in story data
        city: currentStory.locationAddress.split(',').pop()?.trim() || ''
      });
      toast.success(t('locationSaved', { ns: 'common' }));
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error(t('failedToSave', { ns: 'common' }));
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !user || !currentStory) return;
    
    if (onReplyToStory) {
      await onReplyToStory(currentStory.id, currentStory.userId, message);
      setMessage('');
      toast.success(t('messageSent', { ns: 'common' }));
    }
  };

  const handleShare = async () => {
    if (!currentStory) return;
    
    const shareData = {
      title: `${currentStory.userName}'s story`,
      text: `Check out ${currentStory.userName}'s story at ${currentStory.locationName}`,
      url: `${window.location.origin}/story/${currentStory.id}`
    };
    
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success(t('storyShared', { ns: 'common' }));
      } else {
        // Fallback: copy link
        await navigator.clipboard.writeText(shareData.url);
        toast.success(t('linkCopied', { ns: 'common' }));
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Check if user has liked this story
  useEffect(() => {
    const checkLiked = async () => {
      if (!user || !currentStory) return;
      
      try {
        const { data } = await supabase
          .from('story_likes' as any)
          .select('id')
          .eq('story_id', currentStory.id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        setLiked(!!data);
      } catch (error) {
        console.error('Error checking liked status:', error);
      }
    };
    
    checkLiked();
  }, [currentStory?.id, user]);

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 bg-black z-[2000] flex items-center justify-center">
      {/* Progress bars - Enhanced horizontal indicator */}
      <div className="absolute top-2 left-4 right-4 flex gap-1.5 z-10">
        {stories.map((_, index) => (
          <div key={index} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
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
        className="absolute top-2 right-2 z-10 text-white hover:bg-white/20 h-10 w-10"
      >
        <X className="w-6 h-6" />
      </Button>

      {/* User info - Instagram style aligned left */}
      <div className="absolute top-12 left-4 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden shadow-lg">
            {currentStory.userAvatar ? (
              <img 
                src={currentStory.userAvatar} 
                alt={currentStory.userName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-700">{getInitials(currentStory.userName)}</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-white font-semibold text-sm drop-shadow-lg">{currentStory.userName}</p>
            <p className="text-white/90 text-xs drop-shadow-md">
              {(() => {
                const now = new Date();
                const storyTime = new Date(currentStory.timestamp);
                const diffMs = now.getTime() - storyTime.getTime();
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                
                if (diffMinutes < 1) {
                  return t('now', { ns: 'common' });
                } else if (diffMinutes < 60) {
                  return `${diffMinutes}${t('minutesShort', { ns: 'common' })}`;
                } else {
                  return `${diffHours}${t('hoursShort', { ns: 'common' })}`;
                }
              })()}
            </p>
          </div>
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

      {/* Story content - Full screen with minimal padding */}
      <div className="absolute inset-0 pt-24 pb-28 flex items-center justify-center">
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={currentStory.mediaUrl}
            alt="Story"
            className="max-w-full max-h-full object-contain"
            onMouseDown={handlePause}
            onMouseUp={handleResume}
          />
          
          {/* Location tag - Bottom right of image */}
          {currentStory.locationName && (
            <button
              onClick={() => onLocationClick && onLocationClick(currentStory.locationId)}
              className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-black/60 backdrop-blur-md rounded-md px-3 py-2 hover:bg-black/80 transition-all shadow-lg"
            >
              <MapPin className="w-3.5 h-3.5 text-white" />
              <span className="text-white text-xs font-medium">{currentStory.locationName}</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom interaction bar - Instagram style */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-8 pb-6 px-4">
        <div className="flex items-center gap-3">
          {/* Message input */}
          <div className="flex-1 flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2.5">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={t('sendMessage', { ns: 'common' })}
              className="flex-1 bg-transparent text-white text-sm placeholder:text-white/60 outline-none"
            />
            {message.trim() && (
              <button
                onClick={handleSendMessage}
                className="text-white hover:text-white/80 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Like button */}
          <button
            onClick={handleLike}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90"
            aria-label={liked ? "Unlike story" : "Like story"}
          >
            <Heart 
              className={`w-7 h-7 transition-all ${
                liked ? 'fill-red-500 text-red-500' : 'text-white'
              }`} 
            />
          </button>

          {/* Share button */}
          <button
            onClick={handleShare}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90"
            aria-label="Share story"
          >
            <Share2 className="w-6 h-6 text-white" />
          </button>

          {/* Save location button */}
          <button
            onClick={handleSaveLocation}
            disabled={saving}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90"
            aria-label={isLocationSaved ? "Location saved" : "Save location"}
          >
            <img 
              src={pinIcon} 
              alt="Save" 
              className="w-7 h-7"
              style={{
                filter: isLocationSaved 
                  ? 'brightness(0) saturate(100%) invert(45%) sepia(93%) saturate(2466%) hue-rotate(198deg) brightness(101%) contrast(101%)' 
                  : 'brightness(0) invert(1)'
              }}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoriesViewer;
