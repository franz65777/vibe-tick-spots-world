
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
  onCreateStory?: () => void;
  onStoryClick?: (index: number) => void;
}

// Generate profile picture based on user name
const getProfilePicture = (userName: string) => {
  const profilePics = [
    'photo-1507003211169-0a1dd7228f2d',
    'photo-1494790108755-2616b5a5c75b',
    'photo-1527980965255-d3b416303d12',
    'photo-1438761681033-6461ffad8d80',
    'photo-1500648767791-00dcc994a43e',
    'photo-1534528741775-53994a69daeb',
    'photo-1552058544-f2b08422138a',
    'photo-1487412720507-e7ab37603c6f',
  ];
  
  // Safe fallback for undefined userName
  if (!userName || typeof userName !== 'string') {
    return profilePics[0];
  }
  
  const index = userName.charCodeAt(0) % profilePics.length;
  return profilePics[index];
};

const getCategoryIcon = (category: string) => {
  switch (category?.toLowerCase()) {
    case 'restaurant':
    case 'cafe':
      return <Utensils className="w-2.5 h-2.5 text-white" />;
    case 'hotel':
      return <Hotel className="w-2.5 h-2.5 text-white" />;
    case 'bar':
    case 'nightlife':
      return <Wine className="w-2.5 h-2.5 text-white" />;
    default:
      return <Utensils className="w-2.5 h-2.5 text-white" />;
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
    <div className="flex gap-3 px-1 py-1">
      {/* Add Story Button */}
      <div className="flex flex-col items-center gap-1.5 min-w-[60px]">
        <div className="relative">
          <div 
            className="w-14 h-14 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-300 hover:scale-105"
            onClick={onCreateStory}
          >
            <Plus className="w-5 h-5 text-gray-400" />
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
        const profilePic = getProfilePicture(mainStory.userName);
        
        return (
          <div key={userId} className="flex flex-col items-center gap-1.5 min-w-[60px]">
            <div className="relative">
              {/* Main Story Circle */}
              <div 
                className={`w-14 h-14 rounded-full p-0.5 cursor-pointer transition-all duration-300 hover:scale-105 relative ${
                  mainStory.isViewed 
                    ? 'bg-gradient-to-br from-gray-300 to-gray-400' 
                    : 'bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500'
                }`}
                onClick={() => onStoryClick && onStoryClick(stories.findIndex(s => s.id === mainStory.id))}
              >
                <div className="w-full h-full rounded-full bg-white p-0.5">
                  <Avatar className="w-full h-full rounded-full">
                    <AvatarImage 
                      src={`https://images.unsplash.com/${profilePic}?w=60&h=60&fit=crop&crop=face`} 
                      alt={mainStory.userName || 'User'}
                      className="object-cover rounded-full"
                    />
                    <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-blue-100 to-purple-100 rounded-full">
                      {(mainStory.userName && mainStory.userName[0]) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                {/* Category Icons at bottom right */}
                <div className="absolute -bottom-0.5 -right-0.5 flex items-end">
                  {displayCategories.map((category, index) => (
                    <div 
                      key={category}
                      className={`w-5 h-5 bg-gradient-to-br ${getCategoryColor(category || '')} rounded-full flex items-center justify-center shadow-lg border border-white`}
                      style={{
                        marginLeft: index > 0 ? '-6px' : '0',
                        zIndex: displayCategories.length - index
                      }}
                    >
                      {getCategoryIcon(category || '')}
                    </div>
                  ))}
                  
                  {/* More indicator */}
                  {hasMoreCategories && (
                    <div 
                      className="w-5 h-5 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center shadow-lg border border-white"
                      style={{
                        marginLeft: '-6px',
                        zIndex: 0
                      }}
                    >
                      <MoreHorizontal className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <span className="text-xs text-gray-700 font-semibold text-center truncate max-w-[60px]">
              {mainStory.userName || 'User'}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default StoriesSection;
