import React, { useState } from 'react';
import { BarChart3, Users, MessageSquare, Send, Star, MapPin, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NotificationComposer from './NotificationComposer';
import BusinessAnalyticsEnhanced from './BusinessAnalyticsEnhanced';
import ContentManagement from './ContentManagement';
import { useTranslation } from 'react-i18next';

interface BusinessDashboardProps {
  businessData: {
    businessName: string;
    locationName: string;
    savedByCount: number;
    totalPosts: number;
    engagementRate: number;
    claimedLocation: {
      id: string;
      name: string;
      category: string;
    };
  };
}

const BusinessDashboard = ({ businessData }: BusinessDashboardProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');

  const stats = [
    {
      title: 'Users who saved location',
      value: businessData.savedByCount,
      icon: Users,
      color: 'text-blue-600',
      change: '+12% this month'
    },
    {
      title: 'Total posts about location',
      value: businessData.totalPosts,
      icon: MessageSquare,
      color: 'text-green-600',
      change: '+8% this month'
    },
    {
      title: 'Engagement rate',
      value: `${businessData.engagementRate}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      change: '+5% this month'
    },
    {
      title: 'Average rating',
      value: '4.8',
      icon: Star,
      color: 'text-yellow-600',
      change: '+0.2 this month'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="w-6 h-6 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">{businessData.businessName}</h1>
          </div>
          <p className="text-gray-600">Managing: {businessData.locationName}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    <p className="text-xs text-green-600 mt-1">{stat.change}</p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
            <TabsTrigger value="overview">{t('overview', { ns: 'business' })}</TabsTrigger>
            <TabsTrigger value="analytics">{t('analytics', { ns: 'business' })}</TabsTrigger>
            <TabsTrigger value="content">{t('content', { ns: 'business' })}</TabsTrigger>
            <TabsTrigger value="notifications">{t('notifications', { ns: 'common' })}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white shadow-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">New user saved your location</p>
                        <p className="text-sm text-gray-600">@traveler_123 • 2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">New post about your location</p>
                        <p className="text-sm text-gray-600">@foodie_anna • 5 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Notification sent successfully</p>
                        <p className="text-sm text-gray-600">Weekend special offer • 1 day ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-green-600" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveTab('notifications')}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Notification
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveTab('content')}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Promote Post
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveTab('analytics')}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <BusinessAnalyticsEnhanced businessData={businessData} />
          </TabsContent>

          <TabsContent value="content">
            <ContentManagement locationId={businessData.claimedLocation.id} />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationComposer 
              locationId={businessData.claimedLocation.id}
              savedByCount={businessData.savedByCount}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BusinessDashboard;
