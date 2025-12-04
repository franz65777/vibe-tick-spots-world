import React, { useState } from 'react';
import { X, Link2, Loader2, MapPin, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';

interface SocialImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationFound: (location: {
    name: string;
    address?: string;
    lat: number;
    lng: number;
    types?: string[];
  }) => void;
}

export const SocialImportModal: React.FC<SocialImportModalProps> = ({
  isOpen,
  onClose,
  onLocationFound,
}) => {
  const { t, i18n } = useTranslation();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedLocation, setExtractedLocation] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  if (!isOpen) return null;

  const handleExtract = async () => {
    if (!url.trim()) {
      toast.error(t('enterUrl', { ns: 'add', defaultValue: 'Please enter a URL' }));
      return;
    }

    setIsLoading(true);
    setExtractedLocation(null);
    setSearchResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('extract-social-location', {
        body: { url: url.trim() },
      });

      if (error) throw error;

      if (data.success && data.location?.name) {
        setExtractedLocation(data.location.name);
        
        // Search for this location to get coordinates
        const results = await nominatimGeocoding.searchPlace(
          data.location.name,
          i18n.language
        );
        
        if (results.length > 0) {
          setSearchResults(results.slice(0, 5));
          toast.success(t('locationFound', { ns: 'add', defaultValue: 'Location found!' }));
        } else {
          toast.info(t('noCoordinates', { 
            ns: 'add', 
            defaultValue: 'Location name found but no coordinates. Try searching manually.' 
          }));
        }
      } else {
        toast.error(data.error || t('noLocationInPost', { 
          ns: 'add', 
          defaultValue: 'No location found in this post' 
        }));
      }
    } catch (err) {
      console.error('Extract error:', err);
      toast.error(t('extractFailed', { 
        ns: 'add', 
        defaultValue: 'Failed to extract location. Try copying the location name manually.' 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectResult = (result: any) => {
    onLocationFound({
      name: result.name || result.displayName?.split(',')[0] || extractedLocation || '',
      address: result.displayName || result.address,
      lat: result.lat,
      lng: result.lng,
      types: result.types || [],
    });
    onClose();
    toast.success(t('locationAdded', { ns: 'add', defaultValue: 'Location added!' }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-background w-full sm:w-96 sm:rounded-2xl rounded-t-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Instagram className="w-5 h-5 text-pink-500" />
            <h2 className="font-semibold">
              {t('importFromSocial', { ns: 'add', defaultValue: 'Import from Social Media' })}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('pasteInstagramUrl', { 
              ns: 'add', 
              defaultValue: 'Paste an Instagram post URL to extract the tagged location' 
            })}
          </p>

          {/* URL Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.instagram.com/p/..."
                className="pl-10"
                disabled={isLoading}
              />
            </div>
            <Button 
              onClick={handleExtract} 
              disabled={isLoading || !url.trim()}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Extracted Location */}
          {extractedLocation && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">{t('foundLocation', { ns: 'add', defaultValue: 'Found location:' })}</p>
              <p className="text-primary font-semibold">{extractedLocation}</p>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {t('selectLocation', { ns: 'add', defaultValue: 'Select the correct location:' })}
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectResult(result)}
                    className="w-full text-left p-3 bg-muted/30 hover:bg-muted rounded-lg transition-colors"
                  >
                    <p className="font-medium text-sm">
                      {result.name || result.displayName?.split(',')[0]}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {result.displayName || result.address}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Help text */}
          <p className="text-xs text-muted-foreground">
            {t('socialImportNote', { 
              ns: 'add', 
              defaultValue: 'Note: Not all Instagram posts have location tags. You can also search for the location manually.' 
            })}
          </p>
        </div>
      </div>
    </div>
  );
};
