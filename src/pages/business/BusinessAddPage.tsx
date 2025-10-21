import React, { useState } from 'react';
import { Camera, Megaphone } from 'lucide-react';
import { NewAddPage } from '@/components/add/NewAddPage';
import BusinessMarketingCreator from '@/components/business/BusinessMarketingCreator';
import { cn } from '@/lib/utils';

const BusinessAddPage = () => {
  const [activeMode, setActiveMode] = useState<'post' | 'marketing'>('post');

  return (
    <div className="h-screen bg-gradient-to-b from-background to-muted/20 overflow-hidden flex flex-col">
      <div className="max-w-screen-sm mx-auto h-full flex flex-col">
        {/* Header with Mode Toggle */}
        <div className="flex-shrink-0 bg-background/95 backdrop-blur-sm border-b">
          <div className="px-4 py-2">
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
                <span>Post</span>
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
                <span>Marketing</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content - No scrolling, fits in available space */}
        <div className="flex-1 overflow-hidden">
          {activeMode === 'post' ? (
            <div className="h-full overflow-y-auto">
              <div className="p-4">
                <NewAddPage />
              </div>
            </div>
          ) : (
            <div className="h-full p-4">
              <BusinessMarketingCreator />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessAddPage;
