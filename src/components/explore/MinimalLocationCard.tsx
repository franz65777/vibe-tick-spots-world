import React from 'react';
import { Button } from '@/components/ui/button';
import { Bookmark } from 'lucide-react';
import { CategoryIcon } from '@/components/common/CategoryIcon';
interface MinimalLocationCardProps {
  place: {
    id: string;
    name: string;
    category: string;
    city: string;
    savedCount?: number;
    postsCount?: number;
  };
  onCardClick: () => void;
  isSaved?: boolean;
  onSaveToggle?: (e: React.MouseEvent) => void;
}
const MinimalLocationCard = ({
  place,
  onCardClick,
  isSaved,
  onSaveToggle
}: MinimalLocationCardProps) => {
  return <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200" onClick={onCardClick}>
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          <CategoryIcon category={place.category} className="w-12 h-12" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-sm truncate mb-0.5">
            {place.name}
          </h3>
          <p className="text-xs text-gray-500">
            {place.city} • {place.postsCount || 0} {place.postsCount === 1 ? 'post' : 'posts'}
          </p>
        </div>
        
        {onSaveToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSaveToggle}
            className="shrink-0"
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current text-primary' : ''}`} />
          </Button>
        )}
      </div>
    </div>;
};
export default MinimalLocationCard;