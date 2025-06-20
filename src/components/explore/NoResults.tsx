
import React from 'react';
import { MapPin, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NoResultsProps {
  searchMode: 'locations' | 'users';
  searchQuery: string;
  onAddLocation?: () => void;
}

const NoResults = ({ searchMode, searchQuery, onAddLocation }: NoResultsProps) => {
  const messages = {
    locations: {
      title: "No spots found",
      description: searchQuery 
        ? `No results for "${searchQuery}". Try searching a different city or category!`
        : "No places found. Try adjusting your filters or search for a different location.",
      icon: MapPin,
      actionText: "Add New Location",
      actionIcon: Plus
    },
    users: {
      title: "No users found",
      description: searchQuery
        ? `No users found for "${searchQuery}". Try searching with different keywords.`
        : "No users found. Try searching with usernames or full names.",
      icon: Users,
      actionText: "Invite Friends",
      actionIcon: Users
    }
  };

  const config = messages[searchMode];
  const Icon = config.icon;
  const ActionIcon = config.actionIcon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-gray-400" />
      </div>
      
      <h3 className="font-semibold text-gray-900 mb-3 text-lg">
        {config.title}
      </h3>
      
      <p className="text-gray-500 text-center text-sm mb-8 max-w-sm leading-relaxed">
        {config.description}
      </p>

      {searchMode === 'locations' && onAddLocation && (
        <Button
          onClick={onAddLocation}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <ActionIcon className="w-5 h-5" />
          {config.actionText}
        </Button>
      )}

      {searchMode === 'users' && (
        <div className="space-y-3">
          <Button
            variant="outline"
            className="flex items-center gap-2 px-6 py-3 rounded-full font-medium min-h-[44px]"
          >
            <ActionIcon className="w-5 h-5" />
            {config.actionText}
          </Button>
          
          <p className="text-xs text-gray-400 text-center">
            Connect with friends to discover amazing places together
          </p>
        </div>
      )}
    </div>
  );
};

export default NoResults;
