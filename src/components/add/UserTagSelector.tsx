import React, { useState, useCallback, memo, useDeferredValue } from 'react';
import { UserPlus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface UserTagSelectorProps {
  taggedUsers: any[];
  onUserTagged: (user: any) => void;
  onUserRemoved: (userId: string) => void;
}

// Memoized tagged user chip
const TaggedUserChip = memo(({ 
  user, 
  onRemove 
}: { 
  user: any; 
  onRemove: (id: string) => void;
}) => {
  const handleRemove = useCallback(() => onRemove(user.id), [user.id, onRemove]);
  
  return (
    <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm">
      <Avatar className="w-5 h-5">
        <AvatarImage src={user.avatar_url} />
        <AvatarFallback className="text-xs">
          {user.username?.[0] || 'U'}
        </AvatarFallback>
      </Avatar>
      <span className="font-medium">{user.username}</span>
      <button
        onClick={handleRemove}
        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
});

TaggedUserChip.displayName = 'TaggedUserChip';

// Memoized search result item
const SearchResultItem = memo(({ 
  result, 
  onSelect 
}: { 
  result: any; 
  onSelect: (user: any) => void;
}) => {
  const handleSelect = useCallback(() => onSelect(result), [result, onSelect]);
  
  return (
    <button
      onClick={handleSelect}
      className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted transition-colors text-left"
    >
      <Avatar className="w-8 h-8">
        <AvatarImage src={result.avatar_url} />
        <AvatarFallback>{result.username?.[0] || 'U'}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{result.username}</p>
        {result.bio && (
          <p className="text-xs text-muted-foreground truncate">{result.bio}</p>
        )}
      </div>
    </button>
  );
});

SearchResultItem.displayName = 'SearchResultItem';

export const UserTagSelector = memo(({
  taggedUsers,
  onUserTagged,
  onUserRemoved
}: UserTagSelectorProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Use deferred value for responsive input
  const deferredQuery = useDeferredValue(searchQuery);

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || !user) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .rpc('search_users_securely', {
          search_query: query,
          requesting_user_id: user.id
        });

      if (error) throw error;

      // Filter out already tagged users
      const filtered = (data || []).filter(
        (u: any) => !taggedUsers.find(tagged => tagged.id === u.id)
      );
      setSearchResults(filtered.slice(0, 5));
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  }, [user, taggedUsers]);

  // Effect for deferred search
  React.useEffect(() => {
    if (deferredQuery.length >= 2) {
      searchUsers(deferredQuery);
    } else {
      setSearchResults([]);
    }
  }, [deferredQuery, searchUsers]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleSelectUser = useCallback((selectedUser: any) => {
    onUserTagged(selectedUser);
    setSearchQuery('');
    setSearchResults([]);
  }, [onUserTagged]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-foreground">
        <UserPlus className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold">{t('tagPeople', { ns: 'add' })}</h3>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Input
          type="text"
          placeholder={t('searchUsersToTag', { ns: 'add' })}
          value={searchQuery}
          onChange={handleInputChange}
          className="w-full"
        />

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-2xl shadow-lg z-10 max-h-48 overflow-y-auto scrollbar-hide">
            {searchResults.map((result) => (
              <SearchResultItem
                key={result.id}
                result={result}
                onSelect={handleSelectUser}
              />
            ))}
          </div>
        )}
      </div>

      {/* Tagged Users */}
      {taggedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {taggedUsers.map((taggedUser) => (
            <TaggedUserChip
              key={taggedUser.id}
              user={taggedUser}
              onRemove={onUserRemoved}
            />
          ))}
        </div>
      )}
    </div>
  );
});

UserTagSelector.displayName = 'UserTagSelector';
