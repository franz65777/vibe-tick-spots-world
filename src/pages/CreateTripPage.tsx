import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock, Globe, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

const CreateTripPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tripName, setTripName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [followers, setFollowers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFollowers();
  }, [user]);

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
            avatar_url,
            full_name
          )
        `)
        .eq('follower_id', user.id);

      if (error) throw error;

      const followersList = data
        ?.map((f: any) => f.profiles)
        .filter(Boolean) || [];
      
      setFollowers(followersList);
    } catch (error) {
      console.error('Error loading followers:', error);
    }
  };

  const handleSave = async () => {
    if (!user || !tripName.trim()) {
      toast.error(t('trips:tripNameRequired', { defaultValue: 'Il nome del viaggio è obbligatorio' }));
      return;
    }

    setSaving(true);
    try {
      // Create trip
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .insert({
          name: tripName.trim(),
          description: description.trim() || null,
          created_by: user.id,
          user_id: user.id,
          is_public: !isPrivate,
          is_collaborative: selectedCollaborators.length > 0,
          city: 'Unknown',
        })
        .select('id')
        .single();

      if (tripError) throw tripError;

      // Add owner as participant
      const participantsToAdd = [
        { trip_id: tripData.id, user_id: user.id, role: 'owner' }
      ];

      // Add selected collaborators
      if (selectedCollaborators.length > 0) {
        selectedCollaborators.forEach(userId => {
          participantsToAdd.push({
            trip_id: tripData.id,
            user_id: userId,
            role: 'collaborator'
          });
        });
      }

      const { error: participantsError } = await supabase
        .from('trip_participants')
        .insert(participantsToAdd);

      if (participantsError) throw participantsError;

      // Send system message if collaborators were added
      if (selectedCollaborators.length > 0) {
        const collaboratorNames = followers
          .filter(f => selectedCollaborators.includes(f.id))
          .map(f => f.username || f.full_name)
          .join(', ');

        await supabase.from('trip_messages').insert({
          trip_id: tripData.id,
          user_id: user.id,
          content: `${collaboratorNames} ${t('trips:addedToTrip', { defaultValue: 'è stato aggiunto al viaggio' })}`,
          is_system_message: true
        });
      }

      toast.success(t('trips:tripCreated', { defaultValue: 'Viaggio creato con successo' }));
      navigate('/profile');
    } catch (error) {
      console.error('Error creating trip:', error);
      toast.error(t('trips:errorCreatingTrip', { defaultValue: 'Errore nella creazione del viaggio' }));
    } finally {
      setSaving(false);
    }
  };

  const toggleCollaborator = (userId: string) => {
    setSelectedCollaborators(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredFollowers = followers.filter(follower =>
    follower.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    follower.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-background z-[10001] flex flex-col pt-[25px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => navigate('/profile')}
            className="p-2 hover:bg-accent rounded-full transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold truncate">
            {t('trips:createCollaborativeTrip', { defaultValue: 'Crea viaggio collaborativo' })}
          </h2>
        </div>
        <button
          onClick={() => setIsPrivate(!isPrivate)}
          className="p-2 hover:bg-accent rounded-full transition-colors flex-shrink-0"
          title={isPrivate ? t('trips:private', { defaultValue: 'Privato' }) : t('trips:public', { defaultValue: 'Pubblico' })}
        >
          {isPrivate ? (
            <Lock className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Globe className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-6 space-y-6">
          {/* Trip Name */}
          <div className="space-y-2">
            <Label htmlFor="trip-name">
              {t('trips:tripName', { defaultValue: 'Nome del viaggio' })} *
            </Label>
            <Input
              id="trip-name"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder={t('trips:enterTripName', { defaultValue: 'es. Vacanza a Parigi' })}
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="trip-description">
              {t('trips:description', { defaultValue: 'Descrizione' })}
            </Label>
            <Textarea
              id="trip-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('trips:enterTripDescription', { defaultValue: 'Descrivi il tuo viaggio...' })}
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Privacy Status Display */}
          <div className="flex items-center gap-2 p-3 bg-accent/50 rounded-xl">
            {isPrivate ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
            <span className="text-sm">
              {isPrivate
                ? t('trips:tripPrivateDesc', { defaultValue: 'Solo i collaboratori possono vedere questo viaggio' })
                : t('trips:tripPublicDesc', { defaultValue: 'Tutti possono vedere questo viaggio' })}
            </span>
          </div>

          {/* Collaborators Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('trips:addCollaborators', { defaultValue: 'Aggiungi collaboratori (opzionale)' })}
            </Label>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('trips:searchFollowers', { defaultValue: 'Cerca follower...' })}
                className="pl-10"
              />
            </div>

            {/* Selected Count */}
            {selectedCollaborators.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedCollaborators.length} {t('trips:collaboratorsSelected', { defaultValue: 'collaboratori selezionati' })}
              </div>
            )}

            {/* Followers List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {followers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t('trips:noFollowersToAdd', { defaultValue: 'Non hai follower da aggiungere' })}
                </p>
              ) : filteredFollowers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t('trips:noFollowersFound', { defaultValue: 'Nessun follower trovato' })}
                </p>
              ) : (
                filteredFollowers.map((follower: any) => {
                  const isSelected = selectedCollaborators.includes(follower.id);
                  return (
                    <button
                      key={follower.id}
                      onClick={() => toggleCollaborator(follower.id)}
                      className={`w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-accent/40'
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={follower.avatar_url} />
                        <AvatarFallback>{follower.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {follower.full_name || follower.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{follower.username}
                        </p>
                      </div>
                      <div
                        className={`ml-2 h-5 w-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                        }`}
                      >
                        {isSelected && <span className="text-[10px] font-semibold">✓</span>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border">
        <Button
          onClick={handleSave}
          disabled={saving || !tripName.trim()}
          className="w-full rounded-2xl h-12"
          size="lg"
        >
          {saving ? t('common:saving', { defaultValue: 'Salvataggio...' }) : t('trips:createTrip', { defaultValue: 'Crea viaggio' })}
        </Button>
      </div>
    </div>
  );
};

export default CreateTripPage;
