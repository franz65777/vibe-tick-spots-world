
import { Plus, Utensils, Hotel, Wine, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  isViewed: boolean;
  locationId: string;
  locationName: string;
  locationCategory?: string;
}

interface StoriesSectionProps {
  stories: Story[];
  onCreateStory: () => void;
  onStoryClick: (index: number) => void;
}

const getCategoryIcon = (category: string) => {
  switch (category?.toLowerCase()) {
    case 'restaurant':
    case 'cafe':
      return <Utensils className="w-3 h-3 text-white" />;
    case 'hotel':
      return <Hotel className="w-3 h-3 text-white" />;
    case 'bar':
    case 'nightlife':
      return <Wine className="w-3 h-3 text-white" />;
    default:
      return <Utensils className="w-3 h-3 text-white" />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category?.toLowerCase()) {
    case 'restaurant':
    case 'cafe':
      return 'from-orange-500 to-red-500';
    case 'hotel':
      return 'from-blue-500 to-indigo-500';
    case 'bar':
    case 'nightlife':
      return 'from-purple-500 to-pink-500';
    default:
      return 'from-orange-500 to-red-500';
  }
};

const StoriesSection = ({ stories, onCreateStory, onStoryClick }: StoriesSectionProps) => {
  // Group stories by user
  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.userId]) {
      acc[story.userId] = [];
    }
    acc[story.userId].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  return (
    <div className="flex gap-4 px-2 py-1">
      {/* Add Story Button */}
      <div className="flex flex-col items-center gap-2 min-w-[70px]">
        <div className="relative">
          <div 
            className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-300 hover:scale-105"
            onClick={onCreateStory}
          >
            <Plus className="w-6 h-6 text-gray-400" />
          </div>
        </div>
        <span className="text-xs text-gray-500 font-medium text-center">Add</span>
      </div>

      {/* User Stories */}
      {Object.entries(groupedStories).map(([userId, userStories]) => {
        const mainStory = userStories[0];
        const uniqueCategories = [...new Set(userStories.map(story => story.locationCategory))];
        const displayCategories = uniqueCategories.slice(0, 2);
        const hasMoreCategories = uniqueCategories.length > 2;
        
        return (
          <div key={userId} className="flex flex-col items-center gap-2 min-w-[70px]">
            <div className="relative">
              {/* Main Story Circle */}
              <div 
                className={`w-16 h-16 rounded-xl p-0.5 cursor-pointer transition-all duration-300 hover:scale-105 relative ${
                  mainStory.isViewed 
                    ? 'bg-gradient-to-br from-gray-300 to-gray-400' 
                    : 'bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500'
                }`}
                onClick={() => onStoryClick(stories.findIndex(s => s.id === mainStory.id))}
              >
                <div className="w-full h-full rounded-xl bg-white p-0.5">
                  <Avatar className="w-full h-full rounded-xl">
                    <AvatarImage 
                      src={`https://images.unsplash.com/photo-${mainStory.userAvatar}?w=80&h=80&fit=crop&crop=face`} 
                      alt={mainStory.userName}
                      className="object-cover rounded-xl"
                    />
                    <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl">
                      {mainStory.userName[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                {/* Category Icons at bottom right */}
                <div className="absolute -bottom-1 -right-1 flex items-end">
                  {displayCategories.map((category, index) => (
                    <div 
                      key={category}
                      className={`w-6 h-6 bg-gradient-to-br ${getCategoryColor(category || '')} rounded-full flex items-center justify-center shadow-lg border-2 border-white`}
                      style={{
                        marginLeft: index > 0 ? '-8px' : '0',
                        zIndex: displayCategories.length - index
                      }}
                    >
                      {getCategoryIcon(category || '')}
                    </div>
                  ))}
                  
                  {/* More indicator */}
                  {hasMoreCategories && (
                    <div 
                      className="w-6 h-6 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
                      style={{
                        marginLeft: '-8px',
                        zIndex: 0
                      }}
                    >
                      <MoreHorizontal className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <span className="text-xs text-gray-700 font-semibold text-center">{mainStory.userName}</span>
          </div>
        );
      })}
    </div>
  );
};

export default StoriesSection;
