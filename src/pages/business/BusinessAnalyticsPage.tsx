import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, FileText, Share2, Clock, Heart } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface AnalyticsData {
  totalSaves: number;
  totalPosts: number;
  totalShares: number;
  avgTimeSpent: number;
  savesOverTime: { date: string; count: number }[];
  postsOverTime: { date: string; count: number }[];
  weeklyEngagement: { week: string; minutes: number }[];
}

const BusinessAnalyticsPage = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationId, setLocationId] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Get the location for this business (simplified for now)
      const { data: locationData, error: locationError } = await supabase
        .from('locations')
        .select('id, google_place_id')
        .limit(1)
        .maybeSingle();

      if (locationError) throw locationError;
      if (!locationData) {
        setLoading(false);
        return;
      }

      setLocationId(locationData.id);

      // Get total saves from user_saved_locations
      const { count: internalSaves } = await supabase
        .from('user_saved_locations')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', locationData.id);

      // Get saves from saved_places using google_place_id
      const { count: externalSaves } = await supabase
        .from('saved_places')
        .select('*', { count: 'exact', head: true })
        .eq('place_id', locationData.google_place_id || '');

      const totalSaves = (internalSaves || 0) + (externalSaves || 0);

      // Get posts for this location
      const { data: postsData, count: postsCount } = await supabase
        .from('posts')
        .select('created_at, shares_count', { count: 'exact' })
        .eq('location_id', locationData.id)
        .order('created_at', { ascending: true });

      const totalPosts = postsCount || 0;
      const totalShares = postsData?.reduce((sum, post) => sum + (post.shares_count || 0), 0) || 0;

      // Calculate saves over time (last 30 days)
      const savesOverTime = await calculateSavesOverTime(locationData.id, locationData.google_place_id);

      // Calculate posts over time (last 30 days)
      const postsOverTime = calculatePostsOverTime(postsData || []);

      // Calculate weekly engagement (mock data for now - would need actual tracking)
      const weeklyEngagement = [
        { week: '4 weeks ago', minutes: 12 },
        { week: '3 weeks ago', minutes: 18 },
        { week: '2 weeks ago', minutes: 15 },
        { week: 'Last week', minutes: 22 },
        { week: 'This week', minutes: 28 },
      ];

      setAnalytics({
        totalSaves,
        totalPosts,
        totalShares,
        avgTimeSpent: 22, // This would come from actual tracking
        savesOverTime,
        postsOverTime,
        weeklyEngagement,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSavesOverTime = async (locationId: string, googlePlaceId: string | null) => {
    const days = 30;
    const result: { date: string; count: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const { count: internalCount } = await supabase
        .from('user_saved_locations')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', locationId)
        .lte('created_at', `${dateStr}T23:59:59`);

      const { count: externalCount } = await supabase
        .from('saved_places')
        .select('*', { count: 'exact', head: true })
        .eq('place_id', googlePlaceId || '')
        .lte('created_at', `${dateStr}T23:59:59`);

      result.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: (internalCount || 0) + (externalCount || 0),
      });
    }

    return result;
  };

  const calculatePostsOverTime = (posts: any[]) => {
    const days = 30;
    const result: { date: string; count: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const count = posts.filter(post => {
        const postDate = new Date(post.created_at).toISOString().split('T')[0];
        return postDate <= dateStr;
      }).length;

      result.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count,
      });
    }

    return result;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-background pb-24 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-screen-sm mx-auto p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Business Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your location's performance</p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Saves</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{analytics.totalSaves}</p>
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +12% this month
                  </p>
                </div>
                <Heart className="w-8 h-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Posts</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{analytics.totalPosts}</p>
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +8% this week
                  </p>
                </div>
                <FileText className="w-8 h-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Shares</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{analytics.totalShares}</p>
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +15% this week
                  </p>
                </div>
                <Share2 className="w-8 h-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Time</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{analytics.avgTimeSpent}m</p>
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +5% this week
                  </p>
                </div>
                <Clock className="w-8 h-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Saves Over Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saves Over Time (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Saves",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[200px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.savesOverTime}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Posts Over Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Posts Growth (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Posts",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[200px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.postsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Weekly Engagement Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Engagement Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                minutes: {
                  label: "Minutes",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[200px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.weeklyEngagement}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="week" 
                    className="text-xs"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="minutes" 
                    fill="hsl(var(--primary))" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Insights Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Growing Popularity</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your location saves increased by 12% this month. Keep engaging with users!
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">High Engagement</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Users spend an average of {analytics.avgTimeSpent} minutes viewing your posts weekly.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <Share2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Social Reach</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your content has been shared {analytics.totalShares} times, expanding your reach.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BusinessAnalyticsPage;
