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
  const { t } = useTranslation('createList');
  const [urls, setUrls] = useState<string[]>(['', '', '']);
  const [importing, setImporting] = useState(false);

  const handlePaste = async (index: number) => {
    try {
      const text = await navigator.clipboard.readText();
      const newUrls = [...urls];
      newUrls[index] = text;
      setUrls(newUrls);
    } catch (err) {
      toast.error(t('pasteError'));
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
      toast.error(t('noUrlsProvided'));
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
        toast.success(t('placesImported', { count: data.places.length }));
        onClose();
      } else {
        toast.error(t('noPlacesFound'));
      }
    } catch (error) {
      console.error('Error importing from Google Maps:', error);
      toast.error(t('importError'));
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md mx-4 bg-background rounded-xl p-6 shadow-lg animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-accent rounded-full transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Google Maps Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-muted flex items-center justify-center">
          <svg viewBox="0 0 48 48" className="w-10 h-10">
            <path fill="#48b564" d="M35.76,26.36h0.01c0,0-3.77,5.53-6.94,9.64c-2.74,3.55-3.54,6.59-3.77,8.06	C24.97,44.6,24.53,45,24,45s-0.97-0.4-1.06-0.94c-0.23-1.47-1.03-4.51-3.77-8.06c-0.42-0.55-0.85-1.12-1.28-1.7L28.24,22l8.33-9.88	C37.49,14.05,38,16,38,18C38,21.09,37.2,23.97,35.76,26.36z"/>
            <path fill="#fcc60e" d="M28.24,22L17.89,34.3c-2.82-3.78-5.66-7.94-5.66-7.94h0.01c-0.3-0.48-0.57-0.97-0.8-1.48L19.76,15	c-0.79,0.95-1.26,2.17-1.26,3.5c0,3.04,2.46,5.5,5.5,5.5C25.71,24,27.24,23.22,28.24,22z"/>
            <path fill="#2c85eb" d="M28.4,4.74l-8.57,10.18L13.27,9.2C15.83,6.02,19.69,4,24,4C25.54,4,27.02,4.26,28.4,4.74z"/>
            <path fill="#ed5748" d="M19.83,14.92L28.4,4.74c3.84,1.29,7.01,4.09,8.76,7.7c0.21,0.44,0.4,0.88,0.56,1.34L24,24c-3.04,0-5.5-2.46-5.5-5.5	C18.5,17.09,18.97,15.87,19.76,14.92z"/>
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-lg font-semibold text-center mb-4">
          {t('pasteGoogleMapsLinks')}
        </h2>

        {/* Warnings */}
        <div className="space-y-2 mb-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>😭</span>
            <span>{t('warningLargeList')}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3" />
            <span>{t('warningSameRegion')}</span>
          </div>
        </div>

        {/* URL Input Fields */}
        <div className="space-y-2 mb-4">
          {urls.map((url, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2"
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
                className="flex items-center gap-1 text-xs font-medium hover:opacity-70 transition-opacity"
              >
                <Clipboard className="w-3 h-3" />
                <span>{t('paste')}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Add More Button */}
        <button
          onClick={addUrlField}
          className="flex items-center gap-2 text-sm font-medium mb-4 hover:opacity-70 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addMore')}</span>
        </button>

        {/* Import Button */}
        <Button
          onClick={handleImport}
          disabled={importing || urls.every(u => !u.trim())}
          className="w-full h-11 rounded-lg"
        >
          {importing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('importing')}
            </>
          ) : (
            t('importList')
          )}
        </Button>
      </div>
    </div>
  );
};
