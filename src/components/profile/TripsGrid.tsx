import { Sparkles, Plus } from 'lucide-react';
import { useState } from 'react';
import { AiAssistantModal } from '../ai/AiAssistantModal';
import { useTranslation } from 'react-i18next';

const TripsGrid = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="px-4 pt-[25px]">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
          <Sparkles className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-xl font-bold mb-2">{t('profile.trips.title')}</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-xs">
          {t('profile.trips.subtitle')}
        </p>
        
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button 
            onClick={() => setIsAiModalOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Sparkles className="w-5 h-5" />
            {t('profile.trips.aiButton')}
          </button>
          
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            {t('profile.trips.createButton')}
          </button>
        </div>
      </div>

      <AiAssistantModal 
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />
    </div>
  );
};

export default TripsGrid;
