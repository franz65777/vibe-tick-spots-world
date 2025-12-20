import React from 'react';
import { Sparkles, MapPin, ExternalLink, Verified, Star, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface BusinessSpotlightProps {
  business: {
    id: string;
    name: string;
    type: string;
    description?: string;
    image_url?: string;
    location_name: string;
    location_address: string;
    coordinates: { lat: number; lng: number };
    rating?: number;
    hours?: string;
    website_url?: string;
    promotion_text?: string;
  } | null;
  onBusinessClick: (businessId: string) => void;
  onLocationClick: (coordinates: { lat: number; lng: number }) => void;
}

const BusinessSpotlight = ({ business, onBusinessClick, onLocationClick }: BusinessSpotlightProps) => {
  const { t } = useTranslation();
  
  if (!business) {
    return (
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <div className="p-6 text-center">
          <Sparkles className="w-8 h-8 text-purple-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">{t('business:businessSpotlight', { defaultValue: 'Business Spotlight' })}</h3>
          <p className="text-gray-600 mb-3">{t('business:discoverVerifiedBusinesses', { defaultValue: 'Discover verified local businesses' })}</p>
          <Button variant="outline" className="text-purple-600 border-purple-300 hover:bg-purple-50">
            {t('business:becomePartner', { defaultValue: 'Become a Partner' })}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
      {/* Premium Badge */}
      <div className="absolute top-3 left-3 z-10">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full px-3 py-1 shadow-lg">
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span className="text-xs font-semibold">FEATURED</span>
          </div>
        </div>
      </div>

      {/* Verified Badge */}
      <div className="absolute top-3 right-3 z-10">
        <div className="bg-blue-500 text-white rounded-full p-2 shadow-lg">
          <Verified className="w-4 h-4" />
        </div>
      </div>

      <div className="p-6">
        <div className="flex gap-4">
          {/* Business Logo/Image */}
          <div className="flex-shrink-0">
            {business.image_url ? (
              <img 
                src={business.image_url}
                alt={business.name}
                className="w-16 h-16 rounded-xl object-cover shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-200 to-pink-300 flex items-center justify-center shadow-md">
                <MapPin className="w-8 h-8 text-purple-700" />
              </div>
            )}
          </div>

          {/* Business Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 truncate">{business.name}</h3>
              <Verified className="w-4 h-4 text-blue-500" />
            </div>
            
            <p className="text-sm text-purple-700 font-medium mb-1 capitalize">{business.type}</p>
            
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-3 h-3 text-gray-500" />
              <p className="text-xs text-gray-600 truncate">{business.location_name}</p>
            </div>

            {business.rating && (
              <div className="flex items-center gap-1 mb-2">
                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                <span className="text-sm font-semibold text-gray-700">{business.rating}</span>
              </div>
            )}

            {business.hours && (
              <div className="flex items-center gap-1 mb-2">
                <Clock className="w-3 h-3 text-green-500" />
                <span className="text-xs text-gray-600">{business.hours}</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {business.description && (
          <p className="text-sm text-gray-700 mt-3 mb-4 line-clamp-2">
            {business.description}
          </p>
        )}

        {/* Promotion Text */}
        {business.promotion_text && (
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-3 mb-4">
            <p className="text-sm font-semibold text-purple-800">
              🎯 {business.promotion_text}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            size="sm"
            onClick={() => onLocationClick(business.coordinates)}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <MapPin className="w-4 h-4 mr-1" />
            {t('common:view')}
          </Button>
          
          {business.website_url && (
            <Button 
              size="sm"
              variant="outline"
              onClick={() => window.open(business.website_url, '_blank')}
              className="border-purple-300 text-purple-600 hover:bg-purple-50"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
    </Card>
  );
};

export default BusinessSpotlight;