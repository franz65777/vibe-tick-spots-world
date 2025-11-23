import { Plane, MapPin, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { it, es, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface TripMessageCardProps {
  tripData: any;
}

const TripMessageCard = ({ tripData }: TripMessageCardProps) => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  const handleClick = () => {
    if (!tripData) {
      console.error('No trip data available');
      return;
    }

    if (tripData.trip_id) {
      navigate(`/profile/${tripData.creator_id}`, {
        state: { openTripId: tripData.trip_id }
      });
    }
  };

  const getLocale = () => {
    switch (i18n.language) {
      case 'it': return it;
      case 'es': return es;
      default: return enUS;
    }
  };

  const formatDateRange = () => {
    if (!tripData?.start_date) return null;
    
    try {
      const locale = getLocale();
      const start = format(new Date(tripData.start_date), 'd MMM', { locale });
      
      if (tripData.end_date) {
        const end = format(new Date(tripData.end_date), 'd MMM yyyy', { locale });
        return `${start} - ${end}`;
      }
      
      return start;
    } catch (error) {
      console.error('Error formatting date:', error);
      return null;
    }
  };

  if (!tripData) {
    return (
      <div className="w-full p-3 text-center text-muted-foreground text-sm">
        Viaggio non disponibile
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="w-full text-left hover:opacity-90 transition-opacity rounded-xl overflow-hidden bg-card border border-border"
    >
      {/* Cover Image */}
      <div className="relative h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 overflow-hidden">
        {tripData.cover_image_url ? (
          <img
            src={tripData.cover_image_url}
            alt={tripData.name || 'Trip'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Plane className="w-8 h-8 text-blue-500/40" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2">
        <h3 className="font-semibold text-sm text-foreground line-clamp-1 mb-1">
          {tripData.name || 'Viaggio'}
        </h3>

        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          {(tripData.city || tripData.country) && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate">
                {tripData.city && tripData.country 
                  ? `${tripData.city}, ${tripData.country}`
                  : tripData.city || tripData.country}
              </span>
            </div>
          )}
          {formatDateRange() && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDateRange()}</span>
            </div>
          )}
          {tripData.creator && (
            <span className="truncate">@{typeof tripData.creator === 'string' ? tripData.creator : tripData.creator.username}</span>
          )}
        </div>
      </div>
    </button>
  );
};

export default TripMessageCard;
