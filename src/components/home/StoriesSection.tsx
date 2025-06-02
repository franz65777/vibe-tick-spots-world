
import { Plus, Utensils, Hotel, Coffee, Wine, Building, MapPin } from 'lucide-react';
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
      return <Utensils className="w-4 h-4 text-white" />;
    case 'hotel':
      return <Hotel className="w-4 h-4 text-white" />;
    case 'cafe':
      return <Coffee className="w-4 h-4 text-white" />;
    case 'bar':
      return <Wine className="w-4 h-4 text-white" />;
    case 'museum':
      return <Building className="w-4 h-4 text-white" />;
    default:
      return <MapPin className="w-4 h-4 text-white" />;
  }
};

const StoriesSection = ({ stories, onCreateStory, onStoryClick }: StoriesSectionProps) => {
  return (
    <div className="flex gap-4 mb-2">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div 
            className="w-20 h-20 border-3 border-dashed border-gray-300 rounded-3xl flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300 hover:scale-105"
            onClick={onCreateStory}
          >
            <Plus className="w-7 h-7 text-gray-400" />
          </div>
        </div>
        <span className="text-xs text-gray-500 font-medium">Add Story</span>
      </div>
      {stories.map((story, index) => (
        <div key={story.id} className="flex flex-col items-center gap-3">
          <div className="relative">
            {/* Category Icon */}
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                {getCategoryIcon(story.locationCategory || '')}
              </div>
            </div>
            
            <div 
              className={`w-20 h-20 rounded-3xl p-1 cursor-pointer transition-all duration-300 hover:scale-105 ${
                story.isViewed 
                  ? 'bg-gradient-to-br from-gray-300 to-gray-400 shadow-lg' 
                  : 'bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 shadow-xl shadow-purple-500/30'
              }`}
              onClick={() => onStoryClick(index)}
            >
              <div className="w-full h-full rounded-3xl bg-white p-1">
                <Avatar className="w-full h-full">
                  <AvatarImage 
                    src={`https://images.unsplash.com/photo-${story.userAvatar}?w=80&h=80&fit=crop&crop=face`} 
                    alt={story.userName}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-blue-100 to-purple-100">
                    {story.userName[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
          <span className="text-xs text-gray-700 font-semibold">{story.userName}</span>
        </div>
      ))}
    </div>
  );
};

export default StoriesSection;
