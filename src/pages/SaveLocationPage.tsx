import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, Star, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SaveTag, SAVE_TAG_OPTIONS, getSaveTagOption } from '@/utils/saveTags';
import { locationInteractionService } from '@/services/locationInteractionService';
import UnifiedSearchAutocomplete from '@/components/UnifiedSearchAutocomplete';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const CATEGORY_OPTIONS = [
  { id: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
  { id: 'bar', label: 'Bar', emoji: '🍸' },
  { id: 'cafe', label: 'Cafe', emoji: '☕' },
  { id: 'hotel', label: 'Hotel', emoji: '🏨' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎭' },
  { id: 'museum', label: 'Museum', emoji: '🏛️' },
  { id: 'bakery', label: 'Bakery', emoji: '🥐' }
];

const SaveLocationPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('restaurant');
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<SaveTag[]>(['general']);
  const [saving, setSaving] = useState(false);

  const handlePlaceSelect = (place: any) => {
    console.log('Place selected:', place);
    setSelectedPlace(place);
    
    // Auto-detect category if possible
    if (place.types) {
      const detectedCategory = detectCategoryFromTypes(place.types);
      if (detectedCategory) {
        setSelectedCategory(detectedCategory);
      }
    }
  };

  const detectCategoryFromTypes = (types: string[]): string => {
    const typeMap: { [key: string]: string } = {
      'restaurant': 'restaurant',
      'food': 'restaurant',
      'bar': 'bar',
      'night_club': 'bar',
      'cafe': 'cafe',
      'coffee_shop': 'cafe',
      'lodging': 'hotel',
      'hotel': 'hotel',
      'movie_theater': 'entertainment',
      'amusement_park': 'entertainment',
      'museum': 'museum',
      'art_gallery': 'museum',
      'bakery': 'bakery'
    };

    for (const type of types) {
      if (typeMap[type]) {
        return typeMap[type];
      }
    }
    return 'restaurant';
  };

  const toggleTag = (tag: SaveTag) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleSave = async () => {
    if (!selectedPlace || !user) {
      toast.error(t('common:selectLocation', { defaultValue: 'Seleziona un luogo' }));
      return;
    }

    setSaving(true);
    try {
      const locationData = {
        google_place_id: selectedPlace.place_id,
        name: selectedPlace.name,
        address: selectedPlace.formatted_address || selectedPlace.vicinity,
        latitude: selectedPlace.geometry?.location?.lat(),
        longitude: selectedPlace.geometry?.location?.lng(),
        category: selectedCategory,
        city: selectedPlace.city || selectedPlace.address_components?.find((c: any) => 
          c.types.includes('locality')
        )?.long_name || '',
        image_url: selectedPlace.photo_url || selectedPlace.photos?.[0]?.getUrl({ maxWidth: 800 }),
        description: notes || null,
        place_types: selectedPlace.types || []
      };

      const primaryTag = selectedTags[0] || 'general';
      const success = await locationInteractionService.saveLocation(
        selectedPlace.place_id,
        locationData,
        primaryTag
      );

      if (success) {
        toast.success(t('common:locationSaved', { defaultValue: 'Luogo salvato' }));
        navigate('/');
      } else {
        toast.error(t('common:errorSavingLocation', { defaultValue: 'Errore nel salvataggio' }));
      }
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error(t('common:errorSavingLocation', { defaultValue: 'Errore nel salvataggio' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-[10001] flex flex-col pt-[25px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-accent rounded-full transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold truncate">
            {t('navigation:addLocation', { defaultValue: 'Aggiungi luogo' })}
          </h2>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-6 space-y-6">
          {/* Search Location */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {t('common:searchLocation', { defaultValue: 'Cerca luogo' })}
            </Label>
            <UnifiedSearchAutocomplete
              onPlaceSelect={handlePlaceSelect}
              placeholder={t('common:searchLocationPlaceholder', { defaultValue: 'Cerca ristoranti, bar, hotel...' })}
            />
            {selectedPlace && (
              <div className="mt-2 p-3 bg-accent/50 rounded-xl">
                <p className="font-medium text-sm">{selectedPlace.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedPlace.formatted_address || selectedPlace.vicinity}
                </p>
              </div>
            )}
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label>{t('common:category', { defaultValue: 'Categoria' })}</Label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    selectedCategory === cat.id
                      ? 'border-primary bg-primary/5 scale-105'
                      : 'border-border hover:bg-accent/40'
                  }`}
                >
                  <div className="text-2xl mb-1">{cat.emoji}</div>
                  <div className="text-[10px] font-medium">{cat.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              {t('common:rating', { defaultValue: 'Valutazione' })}
            </Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setRating(value)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      value <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              {t('common:tags', { defaultValue: 'Tag' })}
            </Label>
            <div className="flex flex-wrap gap-2">
              {SAVE_TAG_OPTIONS.map((tagOption) => (
                <button
                  key={tagOption.value}
                  onClick={() => toggleTag(tagOption.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedTags.includes(tagOption.value)
                      ? 'bg-primary text-primary-foreground scale-105'
                      : 'bg-accent text-accent-foreground hover:bg-accent/80'
                  }`}
                >
                  {tagOption.emoji} {t(tagOption.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              {t('common:notes', { defaultValue: 'Note' })} ({t('common:optional', { defaultValue: 'opzionale' })})
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('common:addNotes', { defaultValue: 'Aggiungi note personali...' })}
              rows={4}
              maxLength={500}
            />
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-background">
        <Button
          onClick={handleSave}
          disabled={!selectedPlace || saving}
          className="w-full"
          size="lg"
        >
          {saving ? t('common:saving', { defaultValue: 'Salvataggio...' }) : t('common:save', { defaultValue: 'Salva' })}
        </Button>
      </div>
    </div>
  );
};

export default SaveLocationPage;
