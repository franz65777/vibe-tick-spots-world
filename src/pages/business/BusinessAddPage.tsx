import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Megaphone } from 'lucide-react';
import { NewAddPage } from '@/components/add/NewAddPage';
import BusinessMarketingCreator from '@/components/business/BusinessMarketingCreator';

const BusinessAddPage = () => {
  const [activeTab, setActiveTab] = useState('post');

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-screen-sm mx-auto">
        {/* Header with Tabs */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-2 h-14">
              <TabsTrigger value="post" className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Post
              </TabsTrigger>
              <TabsTrigger value="marketing" className="flex items-center gap-2">
                <Megaphone className="w-4 h-4" />
                Marketing
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <div className="px-4 py-6">
          {activeTab === 'post' && (
            <div>
              <NewAddPage />
            </div>
          )}

          {activeTab === 'marketing' && (
            <div>
              <BusinessMarketingCreator />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessAddPage;
