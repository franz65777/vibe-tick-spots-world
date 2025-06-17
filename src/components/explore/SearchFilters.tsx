import { Navigation, Heart, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
interface SearchFiltersProps {
  sortBy: 'proximity' | 'likes' | 'followers';
  onSortChange: (sortBy: 'proximity' | 'likes' | 'followers') => void;
  showFilters: boolean;
}
const SearchFilters = ({
  sortBy,
  onSortChange,
  showFilters
}: SearchFiltersProps) => {
  if (!showFilters) return null;
  return;
};
export default SearchFilters;