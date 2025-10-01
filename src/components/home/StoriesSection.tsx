import { Plus } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  isViewed: boolean;
}

interface StoriesSectionProps {
  stories: Story[];
  onCreateStory?: () => void;
  onStoryClick?: (index: number) => void;
}

const StoriesSection = ({ stories = [], onCreateStory, onStoryClick }: StoriesSectionProps) => {
  return (
    <div className="flex gap-4 px-4 py-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
      {/* Add Story Button - 52px */}
      <button
        onClick={onCreateStory}
        className="flex flex-col items-center gap-1.5 flex-shrink-0 snap-start"
        aria-label="Create new story"
      >
        <div className="relative">
          <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
            <Plus className="w-5 h-5 text-white" />
          </div>
        </div>
        <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">Your Story</span>
      </button>

      {/* User Stories - 52px with NEW badge */}
      {stories.map((story, index) => (
        <button
          key={story.id}
          onClick={() => onStoryClick && onStoryClick(index)}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 relative snap-start"
          aria-label={`View ${story.userName}'s story`}
        >
          <div className={cn(
            "relative rounded-full p-[2px]",
            story.isViewed ? "bg-gray-300 dark:bg-gray-600" : "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
          )}>
            <Avatar className="w-[52px] h-[52px] ring-2 ring-white dark:ring-gray-800">
              <AvatarImage src={story.userAvatar} alt={story.userName} />
              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-sm font-semibold">
                {story.userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {!story.isViewed && (
              <div className="absolute -top-1 -right-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg animate-pulse">
                NEW
              </div>
            )}
          </div>
          <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 truncate max-w-[56px]">
            {story.userName}
          </span>
        </button>
      ))}
    </div>
  );
};

export default StoriesSection;
