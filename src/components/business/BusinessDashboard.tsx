
import React, { useState } from 'react';
import { BarChart3, Users, MessageSquare, Send, TrendingUp, MapPin, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NotificationComposer from './NotificationComposer';
import BusinessAnalytics from './BusinessAnalytics';
import ContentManagement from './ContentManagement';

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
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

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
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-3">
            <Button
              onClick={() => navigate('/profile')}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Profile
            </Button>
            <div className="flex items-center gap-3">
              <MapPin className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">{businessData.businessName}</h1>
            </div>
          </div>
          <p className="text-gray-600 ml-12">Managing: {businessData.locationName}</p>
        </div>

        {/* Compact Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    <p className="text-xs text-green-600 mt-1">{stat.change}</p>
                  </div>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-white shadow-sm border border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">New user saved your location</p>
                      <p className="text-xs text-gray-600">@traveler_123 • 2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">New post about your location</p>
                      <p className="text-xs text-gray-600">@foodie_anna • 5 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Notification sent successfully</p>
                      <p className="text-xs text-gray-600">Weekend special offer • 1 day ago</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm border border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Send className="w-5 h-5 text-green-600" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveTab('notifications')}
                    size="sm"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Notification
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveTab('content')}
                    size="sm"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Manage Content
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveTab('analytics')}
                    size="sm"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <BusinessAnalytics businessData={businessData} />
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
