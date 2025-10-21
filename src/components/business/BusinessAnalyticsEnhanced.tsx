import React, { useState } from 'react';
import { TrendingUp, Users, Eye, Heart, Share2, MessageSquare, Calendar, Zap, Target, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { cn } from '@/lib/utils';

interface BusinessAnalyticsProps {
  businessData: {
    businessName: string;
    locationName: string;
    savedByCount: number;
    totalPosts: number;
    engagementRate: number;
  };
}

const BusinessAnalyticsEnhanced = ({ businessData }: BusinessAnalyticsProps) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');

  const weeklyData = [
    { day: 'Mon', views: 245, engagement: 85, saves: 12 },
    { day: 'Tue', views: 312, engagement: 92, saves: 19 },
    { day: 'Wed', views: 289, engagement: 78, saves: 15 },
    { day: 'Thu', views: 356, engagement: 88, saves: 25 },
    { day: 'Fri', views: 423, engagement: 95, saves: 32 },
    { day: 'Sat', views: 512, engagement: 98, saves: 45 },
    { day: 'Sun', views: 478, engagement: 87, saves: 38 },
  ];

  const contentPerformance = [
    { type: 'Photos', value: 45, color: 'hsl(var(--primary))' },
    { type: 'Videos', value: 30, color: 'hsl(var(--accent))' },
    { type: 'Stories', value: 15, color: 'hsl(var(--chart-2))' },
    { type: 'Events', value: 10, color: 'hsl(var(--chart-3))' },
  ];

  const audienceData = [
    { category: 'Reach', value: 85 },
    { category: 'Engagement', value: 92 },
    { category: 'Growth', value: 78 },
    { category: 'Retention', value: 88 },
    { category: 'Satisfaction', value: 95 },
  ];

  const metrics = [
    {
      title: 'Total Views',
      value: '12.5K',
      change: '+23.5%',
      trend: 'up',
      icon: Eye,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Engagement Rate',
      value: '94.2%',
      change: '+8.3%',
      trend: 'up',
      icon: Heart,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'New Followers',
      value: '1,234',
      change: '+15.7%',
      trend: 'up',
      icon: Users,
      color: 'text-chart-2',
      bgColor: 'bg-chart-2/10',
    },
    {
      title: 'Post Reach',
      value: '8.9K',
      change: '+12.1%',
      trend: 'up',
      icon: Target,
      color: 'text-chart-3',
      bgColor: 'bg-chart-3/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <Card
            key={index}
            className="relative overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-lg group"
          >
            <div className={cn('absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-10', metric.bgColor)} />
            <CardContent className="p-4 relative">
              <div className="flex items-start justify-between mb-3">
                <div className={cn('p-2.5 rounded-xl', metric.bgColor)}>
                  <metric.icon className={cn('w-5 h-5', metric.color)} />
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  {metric.change}
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground mb-1">{metric.value}</p>
                <p className="text-xs text-muted-foreground">{metric.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="day" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorViews)"
                />
                <Area
                  type="monotone"
                  dataKey="engagement"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEngagement)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Content Performance Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-accent" />
              Content Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={contentPerformance}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {contentPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Audience Insights Radar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="w-5 h-5 text-chart-2" />
              Audience Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={audienceData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis 
                  dataKey="category" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <Radar
                  name="Performance"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">487</p>
                <p className="text-xs text-muted-foreground">Comments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Share2 className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">234</p>
                <p className="text-xs text-muted-foreground">Shares</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-2/10">
                <Calendar className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">6-9 PM</p>
                <p className="text-xs text-muted-foreground">Peak Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-3">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-3/10">
                <Target className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">78%</p>
                <p className="text-xs text-muted-foreground">Local Audience</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-2">Best Performing Day</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Saturday shows 45% higher engagement. Schedule important posts on weekends for maximum impact.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-[85%] bg-green-500 rounded-full" />
                  </div>
                  <span className="text-xs font-semibold text-green-600">85%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-2">Content Recommendation</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Photo posts get 3x more engagement than text. Add high-quality images to boost visibility.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-[92%] bg-blue-500 rounded-full" />
                  </div>
                  <span className="text-xs font-semibold text-blue-600">92%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BusinessAnalyticsEnhanced;
