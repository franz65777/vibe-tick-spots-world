
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
      bgColor: 'bg-blue-50',
      change: '+12%'
    },
    {
      title: 'Total posts about location',
      value: businessData.totalPosts,
      icon: MessageSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: '+8%'
    },
    {
      title: 'Engagement rate',
      value: `${businessData.engagementRate}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: '+5%'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Button
              onClick={() => navigate('/profile')}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 hover:bg-white/80 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{businessData.businessName}</h1>
                <p className="text-sm text-gray-600">{businessData.locationName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-white/80 backdrop-blur-sm shadow-lg border-0 hover:shadow-xl transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    <p className="text-xs text-green-600 mt-1 font-medium">{stat.change} this month</p>
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-gray-200">
              <TabsList className="grid w-full grid-cols-4 bg-transparent p-0 h-auto">
                <TabsTrigger 
                  value="overview" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-3"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-3"
                >
                  Analytics
                </TabsTrigger>
                <TabsTrigger 
                  value="content"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-3"
                >
                  Content
                </TabsTrigger>
                <TabsTrigger 
                  value="notifications"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-3"
                >
                  Notifications
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="overview" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Activity */}
                  <Card className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg text-blue-900">
                        <Users className="w-5 h-5" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg border border-blue-200">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">New user saved your location</p>
                          <p className="text-xs text-gray-600">@traveler_123 • 2 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg border border-green-200">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">New post about your location</p>
                          <p className="text-xs text-gray-600">@foodie_anna • 5 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg border border-purple-200">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">Notification sent successfully</p>
                          <p className="text-xs text-gray-600">Weekend special offer • 1 day ago</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card className="bg-gradient-to-br from-green-50 to-white border border-green-100 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg text-green-900">
                        <Send className="w-5 h-5" />
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button 
                        className="w-full justify-start bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0" 
                        onClick={() => setActiveTab('notifications')}
                        size="sm"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send Notification
                      </Button>
                      <Button 
                        className="w-full justify-start bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0" 
                        onClick={() => setActiveTab('content')}
                        size="sm"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Manage Content
                      </Button>
                      <Button 
                        className="w-full justify-start bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0" 
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

              <TabsContent value="analytics" className="mt-0">
                <BusinessAnalytics businessData={businessData} />
              </TabsContent>

              <TabsContent value="content" className="mt-0">
                <div className="max-w-full overflow-hidden">
                  <ContentManagement locationId={businessData.claimedLocation.id} />
                </div>
              </TabsContent>

              <TabsContent value="notifications" className="mt-0">
                <NotificationComposer 
                  locationId={businessData.claimedLocation.id}
                  savedByCount={businessData.savedByCount}
                />
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default BusinessDashboard;
