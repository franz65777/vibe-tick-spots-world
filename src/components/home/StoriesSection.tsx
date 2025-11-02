import { Plus } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  
  // Separate user's own story from others
  const userStory = stories.find(story => story.userId === story.userId); // Will be replaced with actual user check
  const otherStories = stories.filter(story => story.userId !== story.userId);
  
  return (
    <div className="flex gap-4 px-4 py-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory bg-transparent">
      {/* Add/View Own Story Button - Always first */}
      <button
        onClick={onCreateStory}
        className="flex flex-col items-center gap-1.5 flex-shrink-0 snap-start bg-transparent"
        aria-label="Create new story"
      >
        <div className="relative bg-transparent">
          <div className="w-[52px] h-[52px] rounded-full border-2 border-primary flex items-center justify-center bg-white dark:bg-gray-800">
            <Plus className="w-5 h-5 text-primary" />
          </div>
        </div>
        <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">{t('yourStory', { ns: 'home' })}</span>
      </button>

      {/* User Stories - 52px with viewed/unviewed state */}
      {stories.map((story, index) => (
        <button
          key={story.id}
          onClick={() => onStoryClick && onStoryClick(index)}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 relative snap-start"
          aria-label={`View ${story.userName}'s story`}
        >
          <div className={cn(
            "relative rounded-full p-[2px] border-2",
            story.isViewed ? "border-gray-300 dark:border-gray-600" : "border-blue-500 dark:border-blue-400"
          )}>
            <Avatar className="w-[52px] h-[52px]">
              <AvatarImage src={story.userAvatar} alt={story.userName} />
              <AvatarFallback className="bg-transparent text-gray-700 dark:text-gray-200 text-sm font-semibold">
                {story.userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
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
