
import { useState, useEffect } from 'react';
import { X, Heart, Send, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { ShareModal } from '@/components/social/ShareModal';
import { messageService } from '@/services/messageService';
import { CategoryIcon } from '@/components/common/CategoryIcon';

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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  const { t } = useTranslation();
  const { user } = useAuth();
  const currentStory = stories[currentStoryIndex];
  const [isLocationSaved, setIsLocationSaved] = useState(false);

  // Check if location is saved
  useEffect(() => {
    const checkIfSaved = async () => {
      if (!currentStory?.locationId || !user) return;
      
      const { data } = await supabase
        .from('user_saved_locations')
        .select('id')
        .eq('user_id', user.id)
        .eq('location_id', currentStory.locationId)
        .maybeSingle();
      
      setIsLocationSaved(!!data);
    };
    
    checkIfSaved();
  }, [currentStory?.locationId, user]);

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
    if (isPaused || isTyping || isSharing) return;

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
  }, [currentStoryIndex, isPaused, isTyping, isSharing]);

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
          
          // Create notification for story owner with proper user data
          if (currentStory.userId !== user.id) {
            try {
              // Fetch sender's profile data
              const { data: senderProfile } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', user.id)
                .single();
              
              const senderUsername = senderProfile?.username || 'Someone';
              
              await supabase
                .from('notifications')
                .insert({
                  user_id: currentStory.userId,
                  type: 'story_like',
                  title: t('likedYourStory', { ns: 'notifications' }),
                  message: senderUsername,
                  is_read: false,
                  data: { 
                    story_id: currentStory.id, 
                    user_id: user.id,
                    user_name: senderUsername,
                    user_avatar: senderProfile?.avatar_url
                  }
                });
            } catch (notifError) {
              console.log('Notification not sent:', notifError);
            }
          }
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
      if (isLocationSaved) {
        // Unsave
        await supabase
          .from('user_saved_locations')
          .delete()
          .eq('user_id', user.id)
          .eq('location_id', currentStory.locationId);
        
        setIsLocationSaved(false);
        toast.success(t('common:removed'));
      } else {
        // Save
        await supabase
          .from('user_saved_locations')
          .insert({
            user_id: user.id,
            location_id: currentStory.locationId
          });
        
        setIsLocationSaved(true);
        toast.success(t('locationSaved', { ns: 'common' }));
      }
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error(t('failedToSave', { ns: 'common' }));
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !user || !currentStory) return;
    
    setIsTyping(false); // Resume story after sending
    try {
      await messageService.sendStoryReply(currentStory.userId, currentStory.id, message);
      setMessage('');
      toast.success(t('messageSent', { ns: 'common' }));
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleShare = async (recipientIds: string[]) => {
    if (!currentStory) return false;
    
    try {
      const storyData = {
        story_id: currentStory.id,
        media_url: currentStory.mediaUrl,
        media_type: currentStory.mediaType,
        location_name: currentStory.locationName,
        user_name: currentStory.userName
      };

      await Promise.all(
        recipientIds.map(recipientId => 
          supabase.from('direct_messages').insert({
            sender_id: user!.id,
            receiver_id: recipientId,
            message_type: 'story_share',
            shared_content: storyData
          })
        )
      );

      toast.success(t('shared', { ns: 'common' }));
      setIsSharing(false);
      return true;
    } catch (error) {
      console.error('Error sharing story:', error);
      toast.error('Failed to share story');
      return false;
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
      {/* Progress bars - Enhanced horizontal indicator with category icon */}
      <div className="absolute top-12 left-4 right-4 flex gap-1.5 z-10">
        {stories.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: index < currentStoryIndex ? '100%' : index === currentStoryIndex ? `${progress}%` : '0%'
              }}
            />
            {/* Category icon that moves along the progress bar for current story */}
            {index === currentStoryIndex && currentStory.locationCategory && (
              <div 
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-100 -mt-4 z-20"
                style={{
                  left: `calc(${progress}% - 12px)` // Center the icon on the progress
                }}
              >
                <CategoryIcon 
                  category={currentStory.locationCategory} 
                  className="w-7 h-7 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-12 right-2 z-10 text-white hover:bg-white/20 h-10 w-10"
      >
        <X className="w-6 h-6" />
      </Button>

      {/* User info - Moved down for mobile safe area */}
      <div className="absolute top-20 left-4 z-10">
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

      {/* Story content - Full screen covering entire width */}
      <div className="absolute inset-0 pt-14 pb-28">
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          {currentStory.mediaType === 'video' ? (
            <video
              src={currentStory.mediaUrl}
              className="w-full h-full object-contain"
              onMouseDown={handlePause}
              onMouseUp={handleResume}
              autoPlay
              loop
              playsInline
            />
          ) : (
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              className="w-full h-full object-contain"
              onMouseDown={handlePause}
              onMouseUp={handleResume}
            />
          )}
          
          {/* Location tag - Centered at bottom, larger with rounded corners */}
          {currentStory.locationName && currentStory.locationId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onLocationClick) {
                  onLocationClick(currentStory.locationId);
                  onClose(); // Close stories viewer to show map
                }
              }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/80 backdrop-blur-md rounded-2xl px-6 py-3.5 hover:bg-black/90 transition-all shadow-2xl border border-white/10"
            >
              <MapPin className="w-5 h-5 text-white" />
              <span className="text-white text-base font-semibold">{currentStory.locationName}</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom interaction bar - Only for other users' stories */}
      {currentStory.userId !== user?.id && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-16 pb-safe">
          <div className="px-4 pb-6">
            {/* Single row with message input and action buttons */}
            <div className="flex items-center gap-2">
              {/* Message input bar */}
              <div className="flex-1 flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-3">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setIsTyping(e.target.value.length > 0);
                  }}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(message.length > 0)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={t('sendMessage', { ns: 'common' })}
                  className="flex-1 bg-transparent text-white text-sm placeholder:text-white/60 outline-none"
                />
                {message.trim() && (
                  <button
                    onClick={handleSendMessage}
                    className="text-white hover:text-white/80 transition-colors shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Action buttons */}
              <button
                onClick={handleLike}
                className="transition-all active:scale-90 p-2 shrink-0"
                aria-label={liked ? "Unlike story" : "Like story"}
              >
                <Heart 
                  className={`w-6 h-6 transition-all ${
                    liked ? 'fill-red-500 text-red-500' : 'text-white'
                  }`} 
                />
              </button>

              <button
                onClick={() => {
                  setIsSharing(true);
                  setIsShareModalOpen(true);
                }}
                className="transition-all active:scale-90 p-2 shrink-0"
                aria-label="Share story"
              >
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-white"
                >
                  <path 
                    d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" 
                    fill="currentColor"
                  />
                </svg>
              </button>

              <button
                onClick={handleSaveLocation}
                disabled={saving}
                className="transition-all active:scale-90 p-2 shrink-0"
                aria-label={isLocationSaved ? "Location saved" : "Save location"}
              >
                <MapPin 
                  className={`w-6 h-6 ${isLocationSaved ? 'fill-blue-500 text-blue-500' : 'text-white'}`} 
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal with higher z-index */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[2100]">
          <ShareModal
            isOpen={isShareModalOpen}
            onClose={() => {
              setIsShareModalOpen(false);
              setIsSharing(false);
            }}
            onShare={handleShare}
            postId={currentStory.id}
          />
        </div>
      )}
    </div>
  );
};

export default StoriesViewer;
