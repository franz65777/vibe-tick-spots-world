import React, { useState } from 'react';
import { BarChart3, TrendingUp, Users, Calendar, ChevronRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
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

const BusinessAnalyticsInteractive = ({ businessData }: BusinessAnalyticsProps) => {
  const [selectedMetric, setSelectedMetric] = useState<'saves' | 'engagement' | 'visits'>('saves');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  // Mock data for different metrics
  const metricsData = {
    saves: [
      { name: 'Mon', value: 12 },
      { name: 'Tue', value: 19 },
      { name: 'Wed', value: 15 },
      { name: 'Thu', value: 25 },
      { name: 'Fri', value: 32 },
      { name: 'Sat', value: 45 },
      { name: 'Sun', value: 38 },
    ],
    engagement: [
      { name: 'Mon', value: 85 },
      { name: 'Tue', value: 92 },
      { name: 'Wed', value: 78 },
      { name: 'Thu', value: 88 },
      { name: 'Fri', value: 95 },
      { name: 'Sat', value: 98 },
      { name: 'Sun', value: 87 },
    ],
    visits: [
      { name: 'Mon', value: 245 },
      { name: 'Tue', value: 312 },
      { name: 'Wed', value: 289 },
      { name: 'Thu', value: 356 },
      { name: 'Fri', value: 423 },
      { name: 'Sat', value: 512 },
      { name: 'Sun', value: 478 },
    ],
  };

  const demographicData = [
    { name: '18-24', value: 35, color: 'hsl(var(--primary))' },
    { name: '25-34', value: 45, color: 'hsl(var(--accent))' },
    { name: '35-44', value: 25, color: 'hsl(var(--chart-2))' },
    { name: '45+', value: 23, color: 'hsl(var(--chart-3))' },
  ];

  const topHours = [
    { hour: '9 AM', visits: 45 },
    { hour: '12 PM', visits: 89 },
    { hour: '3 PM', visits: 67 },
    { hour: '6 PM', visits: 156 },
    { hour: '9 PM', visits: 134 },
  ];

  const metrics = [
    {
      id: 'saves' as const,
      title: 'Location Saves',
      value: '+23%',
      change: 'vs last week',
      icon: TrendingUp,
      gradient: 'from-primary/20 to-primary/5',
      iconColor: 'text-primary',
    },
    {
      id: 'engagement' as const,
      title: 'Engagement Rate',
      value: '94%',
      change: '+8% increase',
      icon: Sparkles,
      gradient: 'from-accent/20 to-accent/5',
      iconColor: 'text-accent',
    },
    {
      id: 'visits' as const,
      title: 'Profile Visits',
      value: '2.8K',
      change: 'this week',
      icon: Users,
      gradient: 'from-chart-2/20 to-chart-2/5',
      iconColor: 'text-chart-2',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Interactive Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <Card
            key={metric.id}
            className={cn(
              'cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg border-2',
              selectedMetric === metric.id
                ? 'border-primary shadow-lg'
                : 'border-transparent hover:border-border'
            )}
            onClick={() => setSelectedMetric(metric.id)}
          >
            <CardContent className="p-6">
              <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} rounded-lg`} />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {metric.title}
                  </p>
                  <p className="text-3xl font-bold text-foreground mb-1">
                    {metric.value}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {metric.change}
                  </p>
                </div>
                <metric.icon className={cn('w-12 h-12', metric.iconColor)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Chart with Time Range Selection */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Performance Overview
            </CardTitle>
            <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
              <TabsList className="h-9">
                <TabsTrigger value="week" className="text-xs">Week</TabsTrigger>
                <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
                <TabsTrigger value="year" className="text-xs">Year</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metricsData[selectedMetric]}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="name" 
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
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demographics Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Audience Demographics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={demographicData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {demographicData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {demographicData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {item.name}: <span className="font-semibold text-foreground">{item.value}%</span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              Peak Activity Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="hour"
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
                <Bar
                  dataKey="visits"
                  fill="hsl(var(--accent))"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Most activity occurs between <span className="font-semibold text-foreground">6-9 PM</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actionable Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-primary bg-gradient-to-br from-primary/5 to-transparent hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-1">Growth Opportunity</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Your engagement peaks on weekends. Schedule posts Friday-Sunday for maximum reach.
                </p>
                <button className="text-sm font-medium text-primary flex items-center gap-1 hover:gap-2 transition-all">
                  Optimize Schedule
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent bg-gradient-to-br from-accent/5 to-transparent hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-1">Content Tip</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Posts with photos get 45% more engagement. Add high-quality images to boost visibility.
                </p>
                <button className="text-sm font-medium text-accent flex items-center gap-1 hover:gap-2 transition-all">
                  Create Post
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BusinessAnalyticsInteractive;
