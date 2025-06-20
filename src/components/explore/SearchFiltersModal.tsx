
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { MapPin, Heart, Bookmark, Users, Clock } from 'lucide-react';

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
  const sortOptions = [
    { value: 'proximity' as const, label: 'Distance', icon: MapPin, description: 'Closest to you' },
    { value: 'likes' as const, label: 'Most Liked', icon: Heart, description: 'Popular locations' },
    { value: 'saves' as const, label: 'Most Saved', icon: Bookmark, description: 'Frequently bookmarked' },
    { value: 'following' as const, label: 'Saved by Friends', icon: Users, description: 'From people you follow' },
    { value: 'recent' as const, label: 'Recently Added', icon: Clock, description: 'Newest locations' }
  ];

  const filterOptions = [
    { value: 'new', label: 'New Locations', description: 'Added in the last 7 days' },
    { value: 'trending', label: 'Trending', description: 'Popular this week' },
    { value: 'verified', label: 'Verified', description: 'Confirmed by multiple users' },
    { value: 'photos', label: 'Has Photos', description: 'Locations with images' }
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
          <DialogTitle>Filter & Sort</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sort Options */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Sort by</h3>
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
            <h3 className="font-medium text-gray-900 mb-3">Filters</h3>
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
              Reset
            </Button>
            <Button onClick={handleApply} className="flex-1">
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchFiltersModal;
