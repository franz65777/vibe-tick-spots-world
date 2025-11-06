import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MapPin, Loader2 } from 'lucide-react';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';
import { useCityEngagement } from '@/hooks/useCityEngagement';
import CityEngagementCard from './CityEngagementCard';
import { useTranslation } from 'react-i18next';
import { translateCityName } from '@/utils/cityTranslations';
interface UnifiedSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onCitySelect?: (city: string, coordinates: { lat: number; lng: number }) => void;
}

const UnifiedSearchOverlay = ({ isOpen, onClose, onCitySelect }: UnifiedSearchOverlayProps) => {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [trendingCities, setTrendingCities] = useState<{ name: string; count: number }[]>([]);

  const popularCities = [
    { name: 'Dublin', lat: 53.3498053, lng: -6.2603097 },
    { name: 'London', lat: 51.5074, lng: -0.1278 },
    { name: 'Paris', lat: 48.8566, lng: 2.3522 },
    { name: 'New York', lat: 40.7128, lng: -74.0060 },
    { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
    { name: 'Barcelona', lat: 41.3851, lng: 2.1734 },
    { name: 'Amsterdam', lat: 52.3676, lng: 4.9041 },
    { name: 'Rome', lat: 41.9028, lng: 12.4964 }
  ];

  interface CityResult {
    name: string;
    address: string;
    lat: number;
    lng: number;
  }

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close overlay with Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Fetch trending cities (global engagement counts)
  useEffect(() => {
    if (!isOpen) return;
    fetch('/functions/v1/trending-cities')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const items = (data?.cities || []).map((c: any) => ({
          name: String(c.city || '').split(',')[0].trim(),
          count: Number(c.total) || 0,
        }));
        const unique = new Map<string, { name: string; count: number }>();
        items.forEach((i) => {
          const key = i.name.toLowerCase();
          if (!unique.has(key)) unique.set(key, i);
        });
        setTrendingCities(Array.from(unique.values()));
      })
      .catch(() => {
        // ignore errors, we'll fallback to static list
      });
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        searchCities();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const searchCities = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const nominatimResults = await nominatimGeocoding.searchPlace(query, i18n.language);
      
      setResults(nominatimResults.map(result => ({
        name: result.city || result.displayName.split(',')[0],
        address: result.displayName,
        lat: result.lat,
        lng: result.lng,
      })));
    } catch (error) {
      console.error('City search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCitySelect = (city: { name: string; lat: number; lng: number; address?: string }) => {
    if (onCitySelect) {
      onCitySelect(city.name, { lat: city.lat, lng: city.lng });
    }
    setQuery('');
    setResults([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-lg z-[3000] flex flex-col" onClick={onClose}>
      {/* Header with integrated search */}
      <div className="bg-white px-4 pt-[calc(env(safe-area-inset-top)+1.875rem)] pb-3 flex items-center gap-3 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchCities', { ns: 'explore' })}
            className="w-full pl-10 pr-4 py-3 text-base bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        {!query.trim() && (
          <div className="flex flex-wrap gap-2 mb-4">
            {(trendingCities.length ? trendingCities : popularCities.map(c => ({ name: c.name, count: 0, lat: c.lat, lng: c.lng }))).map((item) => {
              const translatedName = translateCityName(item.name, i18n.language);
              return (
                <CityEngagementCard
                  key={item.name}
                  cityName={translatedName}
                  coords={'lat' in item && 'lng' in item ? { lat: (item as any).lat, lng: (item as any).lng } : undefined}
                  onClick={() => {
                    if ('lat' in item && 'lng' in item) {
                      // Direct selection with coordinates - use English name
                      handleCitySelect({
                        name: item.name,
                        lat: (item as any).lat,
                        lng: (item as any).lng
                      });
                    }
                  }}
                  baseCount={'count' in item ? (item as any).count : 0}
                />
              );
            })}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <span className="ml-2 text-white">{t('searching', { ns: 'common' })}</span>
          </div>
        )}

        {results.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Array.from(new Map(results.map(r => [r.name.split(',')[0].trim().toLowerCase(), r])).values()).map((city, index) => (
              <CityEngagementCard
                key={index}
                cityName={city.name.split(',')[0].trim()}
                coords={{ lat: city.lat, lng: city.lng }}
                onClick={() => handleCitySelect(city)}
              />
            ))}
          </div>
        )}

        {query.trim() && !loading && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-white">
            <MapPin className="w-16 h-16 mb-3 opacity-50" />
            <p className="text-lg font-medium">{t('noCitiesFound', { ns: 'explore' })}</p>
            <p className="text-sm opacity-75 mt-1">{t('tryDifferentSearch', { ns: 'explore' })}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedSearchOverlay;
