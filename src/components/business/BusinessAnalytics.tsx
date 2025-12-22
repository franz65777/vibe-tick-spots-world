
import React from 'react';
import { BarChart3, TrendingUp, Users, MapPin, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface BusinessAnalyticsProps {
  businessData: {
    businessName: string;
    locationName: string;
    savedByCount: number;
    totalPosts: number;
    engagementRate: number;
  };
}

const BusinessAnalytics = ({ businessData }: BusinessAnalyticsProps) => {
  // Mock data for charts
  const savedOverTime = [
    { month: 'Jan', saves: 45 },
    { month: 'Feb', saves: 52 },
    { month: 'Mar', saves: 48 },
    { month: 'Apr', saves: 65 },
    { month: 'May', saves: 78 },
    { month: 'Jun', saves: 89 },
  ];

  const postEngagement = [
    { week: 'W1', posts: 12, engagement: 85 },
    { week: 'W2', posts: 8, engagement: 92 },
    { week: 'W3', posts: 15, engagement: 78 },
    { week: 'W4', posts: 11, engagement: 88 },
  ];

  const demographicData = [
    { age: '18-24', count: 35 },
    { age: '25-34', count: 45 },
    { age: '35-44', count: 25 },
    { age: '45-54', count: 15 },
    { age: '55+', count: 8 },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Growth Rate</p>
                <p className="text-2xl font-bold text-green-600">+23%</p>
                <p className="text-xs text-gray-500">vs last month</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Visit Duration</p>
                <p className="text-2xl font-bold text-blue-600">4.2 min</p>
                <p className="text-xs text-gray-500">+0.3 from last month</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Return Visitors</p>
                <p className="text-2xl font-bold text-purple-600">68%</p>
                <p className="text-xs text-gray-500">+5% from last month</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Saves Over Time */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Location Saves Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={savedOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="saves" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Post Engagement */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Weekly Post Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={postEngagement}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="posts" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Demographics and Detailed Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Demographics */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              User Demographics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={demographicData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="age" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Insights */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-600" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <h4 className="font-semibold text-blue-900 mb-1">Peak Activity Hours</h4>
                <p className="text-sm text-blue-700">Most user activity occurs between 6-9 PM on weekdays</p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                <h4 className="font-semibold text-green-900 mb-1">Top Content Type</h4>
                <p className="text-sm text-green-700">Food photos generate 45% more engagement than other content</p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                <h4 className="font-semibold text-purple-900 mb-1">Geographic Distribution</h4>
                <p className="text-sm text-purple-700">78% of your audience is within 10 miles of your location</p>
              </div>
              
              <div className="p-4 bg-amber-50 rounded-lg border-l-4 border-amber-500">
                <h4 className="font-semibold text-amber-900 mb-1">Notification Performance</h4>
                <p className="text-sm text-amber-700">Event notifications have 23% higher open rates than promotions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BusinessAnalytics;
