
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { MapPin, Heart, Bookmark, Users, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type SortBy = 'proximity' | 'likes' | 'saves' | 'following' | 'recent';

interface SearchFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSort: SortBy;
  onSortChange: (sort: SortBy) => void;
  selectedFilters: string[];
  onFiltersChange: (filters: string[]) => void;
}

const SearchFiltersModal = ({
  isOpen,
  onClose,
  selectedSort,
  onSortChange,
  selectedFilters,
  onFiltersChange
}: SearchFiltersModalProps) => {
  const { t } = useTranslation();
  
  const sortOptions = [
    { value: 'proximity' as const, label: t('distance', { ns: 'explore' }), icon: MapPin, description: t('closestToYou', { ns: 'explore' }) },
    { value: 'likes' as const, label: t('mostLiked', { ns: 'explore' }), icon: Heart, description: t('popularLocations', { ns: 'explore' }) },
    { value: 'saves' as const, label: t('mostSaved', { ns: 'explore' }), icon: Bookmark, description: t('frequentlyBookmarked', { ns: 'explore' }) },
    { value: 'following' as const, label: t('savedByFriends', { ns: 'explore' }), icon: Users, description: t('fromPeopleYouFollow', { ns: 'explore' }) },
    { value: 'recent' as const, label: t('recentlyAdded', { ns: 'explore' }), icon: Clock, description: t('newestLocations', { ns: 'explore' }) }
  ];

  const filterOptions = [
    { value: 'new', label: t('newLocations', { ns: 'explore' }), description: t('addedInLast7Days', { ns: 'explore' }) },
    { value: 'trending', label: t('trending', { ns: 'explore' }), description: t('popularThisWeek', { ns: 'explore' }) },
    { value: 'verified', label: t('verified', { ns: 'explore' }), description: t('confirmedByMultipleUsers', { ns: 'explore' }) },
    { value: 'photos', label: t('hasPhotos', { ns: 'explore' }), description: t('locationsWithImages', { ns: 'explore' }) }
  ];

  const handleFilterToggle = (filterValue: string) => {
    const newFilters = selectedFilters.includes(filterValue)
      ? selectedFilters.filter(f => f !== filterValue)
      : [...selectedFilters, filterValue];
    onFiltersChange(newFilters);
  };

  const handleApply = () => {
    onClose();
  };

  const handleReset = () => {
    onSortChange('proximity');
    onFiltersChange([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('filterSort', { ns: 'explore' })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sort Options */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">{t('sortBy', { ns: 'explore' })}</h3>
            <RadioGroup value={selectedSort} onValueChange={onSortChange}>
              <div className="space-y-3">
                {sortOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-3">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label htmlFor={option.value} className="flex items-center gap-3 flex-1 cursor-pointer">
                      <option.icon className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.description}</div>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Filter Options */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">{t('filters', { ns: 'explore' })}</h3>
            <div className="space-y-3">
              {filterOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id={option.value}
                    checked={selectedFilters.includes(option.value)}
                    onChange={() => handleFilterToggle(option.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              {t('reset', { ns: 'explore' })}
            </Button>
            <Button onClick={handleApply} className="flex-1">
              {t('applyFilters', { ns: 'explore' })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchFiltersModal;
