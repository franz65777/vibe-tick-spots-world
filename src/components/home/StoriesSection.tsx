import { Plus } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  isViewed: boolean;
  allUserStoriesViewed?: boolean;
}

interface StoriesSectionProps {
  stories: Story[];
  onCreateStory?: () => void;
  onStoryClick?: (index: number) => void;
}

const StoriesSection = ({ stories = [], onCreateStory, onStoryClick }: StoriesSectionProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Group stories by user
  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.userId]) {
      acc[story.userId] = [];
    }
    acc[story.userId].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  // Get user's own stories
  const myStories = user ? groupedStories[user.id] || [] : [];
  const hasMyStories = myStories.length > 0;
  const myStoriesAllViewed = myStories.every(s => s.isViewed);
  
  // Get other users' stories (one representative per user)
  const otherUserStories = Object.entries(groupedStories)
    .filter(([userId]) => userId !== user?.id)
    .map(([userId, userStories]) => {
      const allViewed = userStories.every(s => s.isViewed);
      return { ...userStories[0], allUserStoriesViewed: allViewed };
    });
  
  return (
    <div className="flex gap-4 px-[10px] pt-3 pb-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory bg-transparent">
      {/* User's Own Story or Create Story Button */}
      {hasMyStories ? (
        <button
          onClick={() => onStoryClick && onStoryClick(0)}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 relative snap-start"
          aria-label="View your story"
        >
          <div className={cn(
            "relative rounded-full p-[2px] border-2",
            myStoriesAllViewed ? "border-gray-300 dark:border-gray-600" : "border-blue-500 dark:border-blue-400"
          )}>
            <Avatar className="w-[52px] h-[52px]">
              <AvatarImage src={myStories[0].userAvatar} alt="Your story" />
              <AvatarFallback className="bg-transparent text-gray-700 dark:text-gray-200 text-sm font-semibold">
                {myStories[0].userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Add more stories button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateStory && onCreateStory();
              }}
              className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-primary border-2 border-white dark:border-gray-800 flex items-center justify-center"
              aria-label="Add another story"
            >
              <Plus className="w-3 h-3 text-white" />
            </button>
          </div>
          <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">{t('yourStory', { ns: 'home' })}</span>
        </button>
      ) : (
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
      )}

      {/* Other Users' Stories - 52px with viewed/unviewed state */}
      {otherUserStories.map((story) => {
        const storyIndex = stories.findIndex(s => s.id === story.id);
        return (
          <button
            key={story.id}
            onClick={() => onStoryClick && onStoryClick(storyIndex)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 relative snap-start"
            aria-label={`View ${story.userName}'s story`}
          >
            <div className={cn(
              "relative rounded-full p-[2px] border-2",
              story.allUserStoriesViewed ? "border-gray-300 dark:border-gray-600" : "border-blue-500 dark:border-blue-400"
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
        );
      })}
    </div>
  );
};

export default StoriesSection;
