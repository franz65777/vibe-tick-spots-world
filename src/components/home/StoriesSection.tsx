import { Plus, Utensils, Hotel, Wine, MapPin, Plane, ShoppingBag, Camera, Sparkles } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  isViewed: boolean;
  locationId: string;
  locationName: string;
  locationAddress?: string;
  locationCategory?: string;
  timestamp?: string;
}

interface StoriesSectionProps {
  stories: Story[];
  onCreateStory?: () => void;
  onStoryClick?: (index: number) => void;
}

const getCategoryIcon = (category: string) => {
  switch (category?.toLowerCase()) {
    case 'restaurant':
    case 'cafe':
    case 'food':
      return <Utensils className="w-2.5 h-2.5 text-white" />;
    case 'hotel':
    case 'lodging':
      return <Hotel className="w-2.5 h-2.5 text-white" />;
    case 'bar':
    case 'nightlife':
      return <Wine className="w-2.5 h-2.5 text-white" />;
    case 'shopping':
      return <ShoppingBag className="w-2.5 h-2.5 text-white" />;
    case 'tourist_attraction':
    case 'museum':
      return <Camera className="w-2.5 h-2.5 text-white" />;
    case 'airport':
      return <Plane className="w-2.5 h-2.5 text-white" />;
    default:
      return <MapPin className="w-2.5 h-2.5 text-white" />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category?.toLowerCase()) {
    case 'restaurant':
    case 'cafe':
    case 'food':
      return 'from-orange-400 to-red-500';
    case 'hotel':
    case 'lodging':
      return 'from-blue-400 to-indigo-500';
    case 'bar':
    case 'nightlife':
      return 'from-purple-400 to-pink-500';
    case 'shopping':
      return 'from-pink-400 to-rose-500';
    case 'tourist_attraction':
    case 'museum':
      return 'from-green-400 to-emerald-500';
    case 'airport':
      return 'from-cyan-400 to-blue-500';
    default:
      return 'from-gray-400 to-gray-500';
  }
};

const getInitials = (name: string) => {
  if (!name || typeof name !== 'string') return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name[0]?.toUpperCase() || 'U';
};

const StoriesSection = ({ stories = [], onCreateStory, onStoryClick }: StoriesSectionProps) => {
  // Group stories by user
  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.userId]) {
      acc[story.userId] = [];
    }
    acc[story.userId].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  // Check if story is new (less than 1 hour old)
  const isNewStory = (timestamp?: string) => {
    if (!timestamp) return false;
    const storyTime = new Date(timestamp).getTime();
    const now = new Date().getTime();
    const hourInMs = 60 * 60 * 1000;
    return (now - storyTime) < hourInMs;
  };

  return (
    <div className="flex gap-4 px-2 py-1">
      {/* Add Story Button */}
      <div className="flex flex-col items-center gap-1.5 min-w-[70px] snap-start">
        <div className="relative">
          <div 
            className="w-[56px] h-[56px] border-2 border-dashed border-blue-300 rounded-full flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/70 transition-all duration-300 hover:scale-110 bg-white shadow-md active:scale-95"
            onClick={onCreateStory}
          >
            <Plus className="w-7 h-7 text-blue-500" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md border-2 border-white">
            <Plus className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
        <span className="text-[10px] text-gray-700 font-semibold text-center">Add</span>
      </div>

      {/* User Stories */}
      {Object.entries(groupedStories).map(([userId, userStories]) => {
        const mainStory = userStories[0];
        const hasUnviewed = userStories.some(s => !s.isViewed);
        const isNew = isNewStory(mainStory.timestamp);
        
        return (
          <div key={userId} className="flex flex-col items-center gap-1.5 min-w-[70px] snap-start">
            <div className="relative">
              {/* New Story Indicator */}
              {isNew && (
                <div className="absolute -top-0.5 -right-0.5 z-10 animate-bounce">
                  <Badge className="bg-gradient-to-r from-pink-500 to-orange-500 text-white text-[9px] px-1 py-0 shadow-md">
                    <Sparkles className="w-2 h-2 mr-0.5" />
                    NEW
                  </Badge>
                </div>
              )}
              
              {/* Main Story Circle with Enhanced Gradient Border */}
              <div 
                className={`w-[56px] h-[56px] rounded-full p-[2.5px] cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg ${
                  hasUnviewed
                    ? 'bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500'
                    : 'bg-gradient-to-tr from-gray-300 to-gray-400'
                } ${isNew && hasUnviewed ? 'animate-pulse' : ''}`}
                onClick={() => onStoryClick && onStoryClick(stories.findIndex(s => s.id === mainStory.id))}
              >
                <div className="w-full h-full rounded-full bg-white p-[2px]">
                  <Avatar className="w-full h-full ring-2 ring-white">
                    <AvatarImage 
                      src={mainStory.userAvatar} 
                      alt={mainStory.userName}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-blue-100 to-purple-100">
                      {getInitials(mainStory.userName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              
              {/* Category Badge - Always show with location */}
              {mainStory.locationCategory && (
                <div 
                  className={`absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-gradient-to-br ${getCategoryColor(mainStory.locationCategory)} rounded-full flex items-center justify-center shadow-md border-2 border-white`}
                >
                  {getCategoryIcon(mainStory.locationCategory)}
                </div>
              )}
            </div>
            <span className="text-[10px] text-gray-800 font-semibold text-center truncate max-w-[70px]">
              {mainStory.userName}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default StoriesSection;
