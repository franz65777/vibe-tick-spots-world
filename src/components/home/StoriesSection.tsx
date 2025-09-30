import { Plus, Utensils, Hotel, Wine, MapPin, Plane, ShoppingBag, Camera } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

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
      return <Utensils className="w-3 h-3 text-white" />;
    case 'hotel':
    case 'lodging':
      return <Hotel className="w-3 h-3 text-white" />;
    case 'bar':
    case 'nightlife':
      return <Wine className="w-3 h-3 text-white" />;
    case 'shopping':
      return <ShoppingBag className="w-3 h-3 text-white" />;
    case 'tourist_attraction':
    case 'museum':
      return <Camera className="w-3 h-3 text-white" />;
    case 'airport':
      return <Plane className="w-3 h-3 text-white" />;
    default:
      return <MapPin className="w-3 h-3 text-white" />;
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

  return (
    <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-2 py-2">
      {/* Add Story Button */}
      <div className="flex flex-col items-center gap-2 min-w-[72px] snap-start">
        <div className="relative">
          <div 
            className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all duration-300 hover:scale-105 bg-white shadow-sm"
            onClick={onCreateStory}
          >
            <Plus className="w-6 h-6 text-gray-400" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
            <Plus className="w-4 h-4 text-white" />
          </div>
        </div>
        <span className="text-[11px] text-gray-600 font-medium text-center">Your Story</span>
      </div>

      {/* User Stories */}
      {Object.entries(groupedStories).map(([userId, userStories]) => {
        const mainStory = userStories[0];
        const hasUnviewed = userStories.some(s => !s.isViewed);
        
        return (
          <div key={userId} className="flex flex-col items-center gap-2 min-w-[72px] snap-start">
            <div className="relative">
              {/* Main Story Circle with Gradient Border */}
              <div 
                className={`w-16 h-16 rounded-full p-[2px] cursor-pointer transition-all duration-300 hover:scale-105 ${
                  hasUnviewed
                    ? 'bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500'
                    : 'bg-gray-300'
                }`}
                onClick={() => onStoryClick && onStoryClick(stories.findIndex(s => s.id === mainStory.id))}
              >
                <div className="w-full h-full rounded-full bg-white p-[2px]">
                  <Avatar className="w-full h-full">
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
              
              {/* Category Badge */}
              {mainStory.locationCategory && (
                <div 
                  className={`absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br ${getCategoryColor(mainStory.locationCategory)} rounded-full flex items-center justify-center shadow-lg border-2 border-white`}
                >
                  {getCategoryIcon(mainStory.locationCategory)}
                </div>
              )}
            </div>
            <span className="text-[11px] text-gray-700 font-semibold text-center truncate max-w-[72px]">
              {mainStory.userName}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default StoriesSection;
