import { Plus } from 'lucide-react';
import { useState } from 'react';
import CreateTripModal from './CreateTripModal';
import { useTranslation } from 'react-i18next';
import tripsEmptyImage from '@/assets/trips-empty-state.png';

const TripsGrid = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { t } = useTranslation('trips');

  const handleCreateTrip = (tripData: any) => {
    console.log('Creating trip:', tripData);
  };

  return (
    <div className="px-4 pt-[25px]">
      <div className="flex flex-col items-center justify-center py-4 text-center">
        <div className="flex flex-col gap-3 w-full max-w-xs mb-8">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            {t('createButton')}
          </button>
        </div>
        
        <div className="mb-6 relative w-full max-w-xs aspect-[4/3]">
          <img 
            src={tripsEmptyImage} 
            alt="Travel group"
            className="w-full h-full object-contain"
          />
        </div>
        
        <p className="text-foreground text-base font-medium max-w-xs">
          {t('planWithFriends')}
        </p>
      </div>

      <CreateTripModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateTrip={handleCreateTrip}
      />
    </div>
  );
};

export default TripsGrid;
