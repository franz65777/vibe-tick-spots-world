import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FoundContact } from '@/hooks/usePhoneContacts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ContactsFoundViewProps {
  contacts: FoundContact[];
  onClose: () => void;
}

const ContactsFoundView: React.FC<ContactsFoundViewProps> = ({ contacts, onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const handleFollow = async (contactId: string) => {
    if (!user) return;
    
    setLoadingIds(prev => new Set(prev).add(contactId));
    
    try {
      // Check if already following
      const { data: existingFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', contactId)
        .single();

      if (!existingFollow) {
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: contactId,
          });

        if (error) throw error;
      }

      setFollowedIds(prev => new Set(prev).add(contactId));
      toast.success(t('followed', { ns: 'invite', defaultValue: 'Followed!' }));
    } catch (err) {
      console.error('Error following user:', err);
      toast.error(t('followFailed', { ns: 'invite', defaultValue: 'Failed to follow' }));
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(contactId);
        return next;
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col px-6 py-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-foreground mb-2">
          {t('friendsFound', { 
            ns: 'invite', 
            defaultValue: '{{count}} friends on SPOTT!',
            count: contacts.length 
          })}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t('followToSee', { ns: 'invite', defaultValue: 'Follow them to see their saved places' })}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {contacts.map((contact) => {
          const isFollowed = followedIds.has(contact.id);
          const isLoading = loadingIds.has(contact.id);
          
          return (
            <div 
              key={contact.id}
              className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border/50"
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={contact.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {contact.username?.[0]?.toUpperCase() || contact.full_name?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">
                    {contact.full_name || contact.username || 'User'}
                  </p>
                  {contact.username && contact.full_name && (
                    <p className="text-sm text-muted-foreground">@{contact.username}</p>
                  )}
                </div>
              </div>

              <Button
                onClick={() => handleFollow(contact.id)}
                disabled={isFollowed || isLoading}
                variant={isFollowed ? 'secondary' : 'default'}
                size="sm"
                className="rounded-full"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isFollowed ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    {t('following', { ns: 'invite', defaultValue: 'Following' })}
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-1" />
                    {t('follow', { ns: 'invite', defaultValue: 'Follow' })}
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="pt-4 pb-safe">
        <Button 
          onClick={onClose}
          variant="outline"
          className="w-full rounded-full h-12"
        >
          {t('done', { ns: 'invite', defaultValue: 'Done' })}
        </Button>
      </div>
    </div>
  );
};

export default ContactsFoundView;
