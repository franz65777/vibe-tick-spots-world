import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Megaphone } from 'lucide-react';
import { NewAddPage } from '@/components/add/NewAddPage';
import BusinessMarketingCreator from '@/components/business/BusinessMarketingCreator';

const BusinessAddPage = () => {
  const [activeTab, setActiveTab] = useState('post');

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-24">
      <div className="max-w-screen-sm mx-auto">
        {/* Header with Tabs */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
          <div className="px-4 py-4">
            <h1 className="text-xl font-bold text-foreground mb-3">Create Content</h1>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-2 h-12 bg-muted/50">
                <TabsTrigger
                  value="post"
                  className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                  <span className="font-semibold">Post</span>
                </TabsTrigger>
                <TabsTrigger
                  value="marketing"
                  className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Megaphone className="w-4 h-4" />
                  <span className="font-semibold">Marketing</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'post' && (
            <div className="bg-background rounded-xl shadow-sm border border-border p-4">
              <NewAddPage />
            </div>
          )}

          {activeTab === 'marketing' && (
            <div className="bg-background rounded-xl shadow-sm border border-border p-4">
              <BusinessMarketingCreator />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessAddPage;
