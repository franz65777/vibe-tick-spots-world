import { useState, useEffect } from 'react';
import { X, Users, Lock, Globe, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTrip: (tripData: any) => Promise<void>;
}

const CreateTripModal = ({ isOpen, onClose, onCreateTrip }: CreateTripModalProps) => {
  const { user } = useAuth();
  const { t } = useTranslation('profile');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('private');
  const [followers, setFollowers] = useState<any[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadFollowers();
    }
  }, [isOpen, user]);

  const loadFollowers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select(`
          following_id,
          profiles!follows_following_id_fkey (
            id,
            username,
            avatar_url
          )
        `)
        .eq('follower_id', user.id);

      if (error) throw error;

      setFollowers(data?.map((f: any) => f.profiles).filter(Boolean) || []);
    } catch (error) {
      console.error('Error loading followers:', error);
    }
  };

  const toggleCollaborator = (userId: string) => {
    setSelectedCollaborators(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || !user) {
      toast.error('Please enter a trip name');
      return;
    }

    setLoading(true);
    try {
      // Create the trip
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          name: name.trim(),
          city: 'Multiple Cities', // Default for collaborative trips
          description: description.trim() || null,
          user_id: user.id,
          is_public: privacy === 'public',
          is_collaborative: selectedCollaborators.length > 0,
          created_by: user.id
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Add owner as participant
      await supabase
        .from('trip_participants')
        .insert({
          trip_id: trip.id,
          user_id: user.id,
          role: 'owner'
        });

      // Add collaborators as participants
      if (selectedCollaborators.length > 0) {
        await supabase
          .from('trip_participants')
          .insert(
            selectedCollaborators.map(userId => ({
              trip_id: trip.id,
              user_id: userId,
              role: 'member'
            }))
          );

        // Send system message
        await supabase
          .from('trip_messages')
          .insert({
            trip_id: trip.id,
            user_id: user.id,
            content: `Created trip "${name}" with ${selectedCollaborators.length} collaborator(s)`,
            message_type: 'system'
          });
      }

      await onCreateTrip(trip);
      toast.success(t('trips.tripCreated'));
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating trip:', error);
      toast.error('Failed to create trip');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrivacy('private');
    setSelectedCollaborators([]);
    setSearchQuery('');
  };

  const filteredFollowers = followers.filter(f => 
    f.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-background rounded-t-3xl max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{t('trips.createCollaborativeTrip')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div>
            <label className="text-sm font-medium">{t('trips.tripName')}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('trips.tripNamePlaceholder')}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">{t('trips.description')}</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('trips.descriptionPlaceholder')}
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">{t('trips.privacy')}</label>
            <div className="flex gap-2">
              <Button
                variant={privacy === 'private' ? 'default' : 'outline'}
                onClick={() => setPrivacy('private')}
                className="flex-1 rounded-xl"
              >
                <Lock className="w-4 h-4 mr-2" />
                {t('trips.private')}
              </Button>
              <Button
                variant={privacy === 'public' ? 'default' : 'outline'}
                onClick={() => setPrivacy('public')}
                className="flex-1 rounded-xl"
              >
                <Globe className="w-4 h-4 mr-2" />
                {t('trips.public')}
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">{t('trips.addCollaborators')}</label>
              {selectedCollaborators.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {selectedCollaborators.length} {t('trips.selected')}
                </span>
              )}
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('trips.searchFollowers')}
                className="pl-10"
              />
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredFollowers.map((follower) => (
                <div
                  key={follower.id}
                  onClick={() => toggleCollaborator(follower.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedCollaborators.includes(follower.id)
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-muted hover:bg-muted/80 border-2 border-transparent'
                  }`}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={follower.avatar_url} />
                    <AvatarFallback>{follower.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium flex-1">@{follower.username}</span>
                  {selectedCollaborators.includes(follower.id) && (
                    <Users className="w-5 h-5 text-primary" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-background border-t border-border p-4">
          <Button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="w-full rounded-xl"
          >
            {loading ? t('trips.creating') : t('trips.createTrip')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateTripModal;
