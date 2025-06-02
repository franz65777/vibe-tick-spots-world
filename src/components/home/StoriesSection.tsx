
import { Plus } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  isViewed: boolean;
}

interface StoriesSectionProps {
  stories: Story[];
  onCreateStory: () => void;
  onStoryClick: (index: number) => void;
}

const StoriesSection = ({ stories, onCreateStory, onStoryClick }: StoriesSectionProps) => {
  return (
    <div className="flex gap-4 mb-2">
      <div className="flex flex-col items-center gap-3">
        <div 
          className="w-20 h-20 border-3 border-dashed border-gray-300 rounded-3xl flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300 hover:scale-105"
          onClick={onCreateStory}
        >
          <Plus className="w-7 h-7 text-gray-400" />
        </div>
        <span className="text-xs text-gray-500 font-medium">Add Story</span>
      </div>
      {stories.map((story, index) => (
        <div key={story.id} className="flex flex-col items-center gap-3">
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
          <span className="text-xs text-gray-700 font-semibold">{story.userName}</span>
        </div>
      ))}
    </div>
  );
};

export default StoriesSection;
