import { memo } from 'react';
import StoriesSection from './StoriesSection';

interface HomeStoriesSectionProps {
  stories: any[];
  onCreateStory: () => void;
  onStoryClick: (index: number) => void;
}

const HomeStoriesSection = memo(({ stories, onCreateStory, onStoryClick }: HomeStoriesSectionProps) => {
  return (
    <div className="h-[90px] flex-shrink-0">
      <StoriesSection
        stories={stories}
        onCreateStory={onCreateStory}
        onStoryClick={onStoryClick}
      />
    </div>
  );
});

HomeStoriesSection.displayName = 'HomeStoriesSection';

export default HomeStoriesSection;
