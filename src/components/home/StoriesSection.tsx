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
      return <Utensils className="w-2 h-2 text-white" />;
    case 'hotel':
    case 'lodging':
      return <Hotel className="w-2 h-2 text-white" />;
    case 'bar':
    case 'nightlife':
      return <Wine className="w-2 h-2 text-white" />;
    case 'shopping':
      return <ShoppingBag className="w-2 h-2 text-white" />;
    case 'tourist_attraction':
    case 'museum':
      return <Camera className="w-2 h-2 text-white" />;
    case 'airport':
      return <Plane className="w-2 h-2 text-white" />;
    default:
      return <MapPin className="w-2 h-2 text-white" />;
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
    <div className="flex gap-3 px-1 py-1">
      {/* Add Story Button - Compact */}
      <div className="flex flex-col items-center gap-1 min-w-[50px] snap-start">
        <div className="relative">
          <div 
            className="w-11 h-11 border-2 border-dashed border-blue-300 dark:border-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/70 dark:hover:bg-blue-900/30 transition-all duration-300 hover:scale-110 bg-white dark:bg-gray-800 shadow-lg active:scale-95"
            onClick={onCreateStory}
          >
            <Plus className="w-5 h-5 text-blue-500" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-gray-800">
            <Plus className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
        <span className="text-[9px] text-gray-700 dark:text-gray-300 font-semibold text-center">Add</span>
      </div>

      {/* User Stories - Compact */}
      {Object.entries(groupedStories).map(([userId, userStories]) => {
        const mainStory = userStories[0];
        const hasUnviewed = userStories.some(s => !s.isViewed);
        const isNew = isNewStory(mainStory.timestamp);
        
        return (
          <div key={userId} className="flex flex-col items-center gap-1 min-w-[50px] snap-start">
            <div className="relative">
              {/* New Story Indicator */}
              {isNew && (
                <div className="absolute -top-1.5 -right-0.5 z-20">
                  <Badge className="bg-gradient-to-r from-pink-500 to-orange-500 text-white text-[7px] px-1 py-0 shadow-lg">
                    NEW
                  </Badge>
                </div>
              )}
              
              {/* Main Story Circle - Compact */}
              <div 
                className={`w-11 h-11 rounded-full p-[2px] cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg ${
                  hasUnviewed
                    ? 'bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500'
                    : 'bg-gradient-to-tr from-gray-300 dark:from-gray-600 to-gray-400 dark:to-gray-700'
                } ${isNew && hasUnviewed ? 'ring-2 ring-pink-300 ring-offset-2' : ''}`}
                onClick={() => onStoryClick && onStoryClick(stories.findIndex(s => s.id === mainStory.id))}
              >
                <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 p-[1.5px]">
                  <Avatar className="w-full h-full ring-1 ring-white dark:ring-gray-800">
                    <AvatarImage 
                      src={mainStory.userAvatar} 
                      alt={mainStory.userName}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900">
                      {getInitials(mainStory.userName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              
              {/* Category Badge - Compact */}
              {mainStory.locationCategory && (
                <div 
                  className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gradient-to-br ${getCategoryColor(mainStory.locationCategory)} rounded-full flex items-center justify-center shadow-md border border-white dark:border-gray-800`}
                >
                  <div className="w-2 h-2 flex items-center justify-center">
                    {getCategoryIcon(mainStory.locationCategory)}
                  </div>
                </div>
              )}
            </div>
            <span className="text-[9px] text-gray-800 dark:text-gray-200 font-semibold text-center truncate max-w-[50px]">
              {mainStory.userName}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default StoriesSection;
