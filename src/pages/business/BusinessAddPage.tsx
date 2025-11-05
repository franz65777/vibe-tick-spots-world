import React, { useState, useEffect } from 'react';
import { Camera, Megaphone } from 'lucide-react';
import { NewAddPage } from '@/components/add/NewAddPage';
import BusinessMarketingCreator from '@/components/business/BusinessMarketingCreator';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const BusinessAddPage = () => {
  const { t } = useTranslation();
  const [activeMode, setActiveMode] = useState<'post' | 'marketing'>('post');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'marketing' || mode === 'post') {
      setActiveMode(mode as 'post' | 'marketing');
    }
  }, []);

  return (
    <div className="h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col overflow-hidden">
      <div className="max-w-screen-sm mx-auto h-full flex flex-col w-full">
        {/* Header with Mode Toggle */}
        <div className="flex-shrink-0 bg-background">
          <div className="px-4 py-3">
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setActiveMode('post')}
                className={cn(
                  'flex items-center gap-2 px-5 py-2 rounded-full font-semibold transition-all duration-300 text-sm',
                  activeMode === 'post'
                    ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <Camera className="w-4 h-4" />
                <span>{t('post', { ns: 'business' })}</span>
              </button>
              <button
                onClick={() => setActiveMode('marketing')}
                className={cn(
                  'flex items-center gap-2 px-5 py-2 rounded-full font-semibold transition-all duration-300 text-sm',
                  activeMode === 'marketing'
                    ? 'bg-accent text-accent-foreground shadow-lg scale-105'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <Megaphone className="w-4 h-4" />
                <span>{t('marketing', { ns: 'business' })}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content - No vertical scroll */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeMode === 'post' ? (
            <div className="h-full">
              <NewAddPage />
            </div>
          ) : (
            <div className="h-full p-4 overflow-hidden">
              <BusinessMarketingCreator />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessAddPage;
