
import { Plus } from 'lucide-react';

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
    <div className="flex gap-3 mb-4">
      <div className="flex flex-col items-center gap-2">
        <div 
          className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center cursor-pointer"
          onClick={onCreateStory}
        >
          <Plus className="w-6 h-6 text-gray-400" />
        </div>
        <span className="text-xs text-gray-500">Add Story</span>
      </div>
      {stories.map((story, index) => (
        <div key={story.id} className="flex flex-col items-center gap-2">
          <div 
            className={`w-16 h-16 rounded-full p-0.5 cursor-pointer ${
              story.isViewed 
                ? 'bg-gray-300' 
                : 'bg-gradient-to-r from-pink-500 to-purple-500'
            }`}
            onClick={() => onStoryClick(index)}
          >
            <div className="w-full h-full rounded-full bg-white p-0.5">
              <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-xs font-medium">{story.userName[0]}</span>
              </div>
            </div>
          </div>
          <span className="text-xs text-gray-700 font-medium">{story.userName}</span>
        </div>
      ))}
    </div>
  );
};

export default StoriesSection;
