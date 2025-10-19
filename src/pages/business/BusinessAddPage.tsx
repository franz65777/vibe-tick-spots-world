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
        <div className="sticky top-0 z-10 bg-gradient-to-br from-background via-background to-muted/10 backdrop-blur-sm border-b border-border/50 shadow-lg">
          <div className="px-4 pt-5 pb-4">
            <h1 className="text-2xl font-bold text-foreground mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Create Content
            </h1>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-2 h-14 bg-muted/30 p-1.5 rounded-2xl">
                <TabsTrigger
                  value="post"
                  className="flex items-center justify-center gap-2.5 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:scale-[1.02] transition-all duration-200 data-[state=active]:text-primary"
                >
                  <Camera className="w-5 h-5" />
                  <span className="font-bold text-sm">Post</span>
                </TabsTrigger>
                <TabsTrigger
                  value="marketing"
                  className="flex items-center justify-center gap-2.5 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:scale-[1.02] transition-all duration-200 data-[state=active]:text-primary"
                >
                  <Megaphone className="w-5 h-5" />
                  <span className="font-bold text-sm">Marketing</span>
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
