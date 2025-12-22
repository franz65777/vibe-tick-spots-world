import React from 'react';
import { Clock, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';

interface UserSearchResultsProps {
  searchQuery: string;
  userResults: any[];
  recentSearches: any[];
  suggestedUsers: any[];
  onUserClick: (userId: string) => void;
  onFollowUser: (userId: string) => void;
  onRecentSearchClick: (query: string) => void;
}

const UserSearchResults = ({
  searchQuery,
  userResults,
  recentSearches,
  suggestedUsers,
  onUserClick,
  onFollowUser,
  onRecentSearchClick,
}: UserSearchResultsProps) => {
  const { t } = useTranslation();
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderUserCard = (user: any, showFollowButton: boolean = true) => (
    <div
      key={user.id}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => onUserClick(user.id)}
    >
      <div className="flex items-center gap-3 flex-1">
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.avatar_url || user.avatar} alt={user.username || user.name} />
          <AvatarFallback>{getInitials(user.username || user.name || 'U')}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-foreground truncate">
            {user.username || user.name}
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span>{user.follower_count || 0} followers</span>
            {user.bio && <span className="truncate">• {user.bio}</span>}
          </div>
        </div>
      </div>

      {showFollowButton && (
        <Button
          variant={user.is_following ? 'outline' : 'default'}
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onFollowUser(user.id);
          }}
          className="ml-2"
        >
          {user.is_following ? 'Following' : 'Follow'}
        </Button>
      )}
    </div>
  );

  if (searchQuery && userResults.length > 0) {
    return (
      <div className="px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          {userResults.length} user{userResults.length !== 1 ? 's' : ''} found
        </h3>
        <div className="space-y-1">
          {userResults.map((user) => renderUserCard(user))}
        </div>
      </div>
    );
  }

  if (searchQuery && userResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <Users className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground text-center">{t('noUsersFound', { ns: 'common' })}</p>
        <p className="text-sm text-muted-foreground text-center mt-1">
          {t('tryDifferentUsername', { ns: 'explore' })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-3">
      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Recent Searches</h3>
          </div>
          <div className="space-y-1">
            {recentSearches.map((search) => (
              <button
                key={search.id}
                onClick={() => onRecentSearchClick(search.search_query)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
              >
                <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-foreground">{search.search_query}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Users */}
      {suggestedUsers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Suggested Users</h3>
          </div>
          <div className="space-y-1">
            {suggestedUsers.map((user) => renderUserCard(user))}
          </div>
        </div>
      )}

      {recentSearches.length === 0 && suggestedUsers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Users className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-center">Start searching for people</p>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Find friends and discover new profiles
          </p>
        </div>
      )}
    </div>
  );
};

export default UserSearchResults;
