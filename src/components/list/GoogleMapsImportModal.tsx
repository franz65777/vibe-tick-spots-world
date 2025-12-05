import { useState } from 'react';
import { X, Plus, Clipboard, MapPin, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtractedPlace {
  name: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  category?: string;
}

interface GoogleMapsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (places: ExtractedPlace[]) => void;
}

export const GoogleMapsImportModal = ({ isOpen, onClose, onImport }: GoogleMapsImportModalProps) => {
  const { t } = useTranslation();
  const [urls, setUrls] = useState<string[]>(['', '', '']);
  const [importing, setImporting] = useState(false);

  const handlePaste = async (index: number) => {
    try {
      const text = await navigator.clipboard.readText();
      const newUrls = [...urls];
      newUrls[index] = text;
      setUrls(newUrls);
    } catch (err) {
      toast.error(t('createList.pasteError', { defaultValue: 'Could not paste from clipboard' }));
    }
  };

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const addUrlField = () => {
    setUrls([...urls, '']);
  };

  const handleImport = async () => {
    const validUrls = urls.filter(url => url.trim() !== '');
    
    if (validUrls.length === 0) {
      toast.error(t('createList.noUrlsProvided', { defaultValue: 'Please paste at least one Google Maps link' }));
      return;
    }

    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-google-maps-list', {
        body: { urls: validUrls }
      });

      if (error) throw error;

      if (data?.places && data.places.length > 0) {
        onImport(data.places);
        toast.success(t('createList.placesImported', { 
          defaultValue: '{{count}} places imported', 
          count: data.places.length 
        }));
        onClose();
      } else {
        toast.error(t('createList.noPlacesFound', { defaultValue: 'No places could be extracted from the links' }));
      }
    } catch (error) {
      console.error('Error importing from Google Maps:', error);
      toast.error(t('createList.importError', { defaultValue: 'Failed to import places' }));
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-xl"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md mx-4 flex flex-col items-center animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-accent/50 rounded-full transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Google Maps Icon */}
        <div className="w-20 h-20 mb-6 rounded-2xl bg-white shadow-lg flex items-center justify-center">
          <svg viewBox="0 0 48 48" className="w-14 h-14">
            <path fill="#48b564" d="M35.76,26.36h0.01c0,0-3.77,5.53-6.94,9.64c-2.74,3.55-3.54,6.59-3.77,8.06	C24.97,44.6,24.53,45,24,45s-0.97-0.4-1.06-0.94c-0.23-1.47-1.03-4.51-3.77-8.06c-0.42-0.55-0.85-1.12-1.28-1.7L28.24,22l8.33-9.88	C37.49,14.05,38,16,38,18C38,21.09,37.2,23.97,35.76,26.36z"/>
            <path fill="#fcc60e" d="M28.24,22L17.89,34.3c-2.82-3.78-5.66-7.94-5.66-7.94h0.01c-0.3-0.48-0.57-0.97-0.8-1.48L19.76,15	c-0.79,0.95-1.26,2.17-1.26,3.5c0,3.04,2.46,5.5,5.5,5.5C25.71,24,27.24,23.22,28.24,22z"/>
            <path fill="#2c85eb" d="M28.4,4.74l-8.57,10.18L13.27,9.2C15.83,6.02,19.69,4,24,4C25.54,4,27.02,4.26,28.4,4.74z"/>
            <path fill="#ed5748" d="M19.83,14.92L28.4,4.74c3.84,1.29,7.01,4.09,8.76,7.7c0.21,0.44,0.4,0.88,0.56,1.34L24,24c-3.04,0-5.5-2.46-5.5-5.5	C18.5,17.09,18.97,15.87,19.76,14.92z"/>
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-4 px-4">
          {t('createList.pasteGoogleMapsLinks', { defaultValue: 'paste your google maps list links' })}
        </h2>

        {/* Warnings */}
        <div className="space-y-2 mb-6 px-4 w-full">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>😭</span>
            <span>{t('createList.warningLargeList', { defaultValue: 'may not work with lists >500 places' })}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-destructive" />
            <span>{t('createList.warningSameRegion', { defaultValue: 'works best when the places in the list are all in the same region' })}</span>
          </div>
        </div>

        {/* URL Input Fields */}
        <div className="space-y-3 w-full px-4 mb-4">
          {urls.map((url, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-gray-100/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full px-4 py-3 border border-border/30"
            >
              <input
                type="text"
                value={url}
                onChange={(e) => handleUrlChange(index, e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              />
              <button
                onClick={() => handlePaste(index)}
                className="flex items-center gap-1 text-sm font-medium hover:opacity-70 transition-opacity"
              >
                <Clipboard className="w-4 h-4" />
                <span>{t('createList.paste', { defaultValue: 'paste' })}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Add More Button */}
        <button
          onClick={addUrlField}
          className="flex items-center gap-2 text-sm font-medium mb-8 hover:opacity-70 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          <span>{t('createList.addMore', { defaultValue: 'add' })}</span>
        </button>

        {/* Import Button */}
        <Button
          onClick={handleImport}
          disabled={importing || urls.every(u => !u.trim())}
          className="w-full max-w-xs h-14 rounded-full text-lg font-semibold bg-muted hover:bg-muted/80 text-foreground disabled:opacity-50"
        >
          {importing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {t('createList.importing', { defaultValue: 'importing...' })}
            </>
          ) : (
            t('createList.importList', { defaultValue: 'import list' })
          )}
        </Button>
      </div>
    </div>
  );
};
