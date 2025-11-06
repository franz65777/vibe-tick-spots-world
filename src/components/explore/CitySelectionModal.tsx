import React, { useState } from 'react';
import { ChevronLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { translateCityName } from '@/utils/cityTranslations';

interface CitySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
}

// Predefined list of major cities
const CITIES = [
  'dublin', 'paris', 'london', 'new-york', 'tokyo', 'rome', 
  'barcelona', 'amsterdam', 'berlin', 'madrid', 'lisbon', 'prague',
  'vienna', 'budapest', 'athens', 'copenhagen', 'stockholm', 'oslo',
  'helsinki', 'brussels', 'zurich', 'munich', 'milan', 'venice',
  'florence', 'naples', 'edinburgh', 'manchester', 'dublin', 'galway'
];

const CitySelectionModal = ({
  isOpen,
  onClose,
  selectedCity,
  onSelectCity,
}: CitySelectionModalProps) => {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCities = CITIES.filter(city => {
    const translatedCity = translateCityName(city.charAt(0).toUpperCase() + city.slice(1).replace('-', ' '), i18n.language);
    return translatedCity.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-semibold text-foreground">
            {t('selectCity', { ns: 'leaderboard' })}
          </h2>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('searchCity', { ns: 'leaderboard' })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Cities List */}
      <div className="flex-1 overflow-y-auto">
        {filteredCities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <p className="text-muted-foreground text-center">
              {t('noCitiesAvailable', { ns: 'leaderboard' })}
            </p>
          </div>
        ) : (
          <div className="py-2">
            {/* All Cities Option */}
            <button
              onClick={() => {
                onSelectCity('all');
                onClose();
              }}
              className={`w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between ${
                selectedCity === 'all' ? 'bg-muted' : ''
              }`}
            >
              <span className="font-medium text-foreground">
                {t('allCities', { ns: 'leaderboard' })}
              </span>
              {selectedCity === 'all' && (
                <div className="w-2 h-2 rounded-full bg-primary" />
              )}
            </button>

            {/* Individual Cities */}
            {filteredCities.map((city) => {
              const displayName = translateCityName(
                city.charAt(0).toUpperCase() + city.slice(1).replace('-', ' '),
                i18n.language
              );
              return (
                <button
                  key={city}
                  onClick={() => {
                    onSelectCity(city);
                    onClose();
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between ${
                    selectedCity === city ? 'bg-muted' : ''
                  }`}
                >
                  <span className="font-medium text-foreground">
                    {displayName}
                  </span>
                  {selectedCity === city && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CitySelectionModal;
