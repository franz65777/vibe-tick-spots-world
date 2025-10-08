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
  savesChange: number;
  postsChange: number;
  sharesChange: number;
  timeChange: number;
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

      // Calculate REAL average time spent viewing location cards
      const avgTimeSpent = await calculateAverageViewTime(locationData.id, locationData.google_place_id);

      // Calculate saves over time (last 7 days - weekly)
      const savesOverTime = await calculateWeeklySaves(locationData.id, locationData.google_place_id);

      // Calculate posts over time (last 7 days - weekly)
      const postsOverTime = calculateWeeklyPosts(postsData || []);

      // Calculate weekly engagement time (real data)
      const weeklyEngagement = await calculateWeeklyEngagement(locationData.id, locationData.google_place_id);

      // Calculate percentage changes
      const savesChange = calculatePercentageChange(savesOverTime);
      const postsChange = calculatePercentageChange(postsOverTime);
      const sharesChange = totalShares > 0 ? calculateSharesChange(postsData || []) : 0;
      const timeChange = calculateTimeChange(weeklyEngagement);

      setAnalytics({
        totalSaves,
        totalPosts,
        totalShares,
        avgTimeSpent,
        savesOverTime,
        postsOverTime,
        weeklyEngagement,
        savesChange,
        postsChange,
        sharesChange,
        timeChange,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAverageViewTime = async (locationId: string, googlePlaceId: string | null): Promise<number> => {
    try {
      // Get all view durations for this location
      const { data: viewData } = await supabase
        .from('location_view_duration')
        .select('duration_seconds')
        .or(`location_id.eq.${locationId},google_place_id.eq.${googlePlaceId || 'null'}`);

      if (!viewData || viewData.length === 0) return 0;

      const totalSeconds = viewData.reduce((sum, view) => sum + view.duration_seconds, 0);
      const avgSeconds = totalSeconds / viewData.length;
      
      // Return in minutes
      return Math.round(avgSeconds / 60);
    } catch (error) {
      console.error('Error calculating average view time:', error);
      return 0;
    }
  };

  const calculateWeeklyEngagement = async (locationId: string, googlePlaceId: string | null) => {
    const weeks = 5;
    const result: { week: string; minutes: number }[] = [];

    for (let i = weeks - 1; i >= 0; i--) {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      const { data: viewData } = await supabase
        .from('location_view_duration')
        .select('duration_seconds')
        .or(`location_id.eq.${locationId},google_place_id.eq.${googlePlaceId || 'null'}`)
        .gte('viewed_at', weekStart.toISOString())
        .lte('viewed_at', weekEnd.toISOString());

      const totalSeconds = (viewData || []).reduce((sum, view) => sum + view.duration_seconds, 0);
      const minutes = Math.round(totalSeconds / 60);

      const weekLabel = i === 0 ? 'This week' : 
                       i === 1 ? 'Last week' : 
                       `${i} weeks ago`;

      result.push({ week: weekLabel, minutes });
    }

    return result;
  };

  const calculateWeeklySaves = async (locationId: string, googlePlaceId: string | null) => {
    const days = 7;
    const result: { date: string; count: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const { count: internalCount } = await supabase
        .from('user_saved_locations')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', locationId)
        .gte('created_at', `${dateStr}T00:00:00`)
        .lte('created_at', `${dateStr}T23:59:59`);

      const { count: externalCount } = await supabase
        .from('saved_places')
        .select('*', { count: 'exact', head: true })
        .eq('place_id', googlePlaceId || '')
        .gte('created_at', `${dateStr}T00:00:00`)
        .lte('created_at', `${dateStr}T23:59:59`);

      result.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: (internalCount || 0) + (externalCount || 0),
      });
    }

    return result;
  };

  const calculateWeeklyPosts = (posts: any[]) => {
    const days = 7;
    const result: { date: string; count: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const count = posts.filter(post => {
        const postDate = new Date(post.created_at).toISOString().split('T')[0];
        return postDate === dateStr;
      }).length;

      result.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count,
      });
    }

    return result;
  };

  const calculatePercentageChange = (data: { date: string; count: number }[]) => {
    if (data.length < 2) return 0;
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstTotal = firstHalf.reduce((sum, item) => sum + item.count, 0);
    const secondTotal = secondHalf.reduce((sum, item) => sum + item.count, 0);
    
    if (firstTotal === 0) return secondTotal > 0 ? 100 : 0;
    
    return Math.round(((secondTotal - firstTotal) / firstTotal) * 100);
  };

  const calculateSharesChange = (posts: any[]) => {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const lastWeekShares = posts.filter(p => new Date(p.created_at) >= lastWeek).reduce((sum, p) => sum + (p.shares_count || 0), 0);
    const previousWeekShares = posts.filter(p => new Date(p.created_at) >= twoWeeksAgo && new Date(p.created_at) < lastWeek).reduce((sum, p) => sum + (p.shares_count || 0), 0);
    
    if (previousWeekShares === 0) return lastWeekShares > 0 ? 100 : 0;
    
    return Math.round(((lastWeekShares - previousWeekShares) / previousWeekShares) * 100);
  };

  const calculateTimeChange = (weeklyData: { week: string; minutes: number }[]) => {
    if (weeklyData.length < 2) return 0;
    
    const lastWeek = weeklyData[weeklyData.length - 1].minutes;
    const previousWeek = weeklyData[weeklyData.length - 2].minutes;
    
    if (previousWeek === 0) return lastWeek > 0 ? 100 : 0;
    
    return Math.round(((lastWeek - previousWeek) / previousWeek) * 100);
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
      <div className="max-w-screen-sm mx-auto px-3 py-3 space-y-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Business Analytics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Track your location's performance</p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Saves</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{analytics.totalSaves}</p>
                  {analytics.savesChange !== 0 && (
                    <p className={`text-[10px] mt-0.5 flex items-center gap-0.5 ${analytics.savesChange > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      <TrendingUp className={`w-2.5 h-2.5 ${analytics.savesChange < 0 ? 'rotate-180' : ''}`} />
                      {analytics.savesChange > 0 ? '+' : ''}{analytics.savesChange}% this week
                    </p>
                  )}
                </div>
                <Heart className="w-7 h-7 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Posts</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{analytics.totalPosts}</p>
                  {analytics.postsChange !== 0 && (
                    <p className={`text-[10px] mt-0.5 flex items-center gap-0.5 ${analytics.postsChange > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      <TrendingUp className={`w-2.5 h-2.5 ${analytics.postsChange < 0 ? 'rotate-180' : ''}`} />
                      {analytics.postsChange > 0 ? '+' : ''}{analytics.postsChange}% this week
                    </p>
                  )}
                </div>
                <FileText className="w-7 h-7 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Shares</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{analytics.totalShares}</p>
                  {analytics.sharesChange !== 0 && (
                    <p className={`text-[10px] mt-0.5 flex items-center gap-0.5 ${analytics.sharesChange > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      <TrendingUp className={`w-2.5 h-2.5 ${analytics.sharesChange < 0 ? 'rotate-180' : ''}`} />
                      {analytics.sharesChange > 0 ? '+' : ''}{analytics.sharesChange}% this week
                    </p>
                  )}
                </div>
                <Share2 className="w-7 h-7 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Avg. Time</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{analytics.avgTimeSpent}m</p>
                  {analytics.timeChange !== 0 && (
                    <p className={`text-[10px] mt-0.5 flex items-center gap-0.5 ${analytics.timeChange > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      <TrendingUp className={`w-2.5 h-2.5 ${analytics.timeChange < 0 ? 'rotate-180' : ''}`} />
                      {analytics.timeChange > 0 ? '+' : ''}{analytics.timeChange}% this week
                    </p>
                  )}
                </div>
                <Clock className="w-7 h-7 text-primary/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Saves Over Time Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Saves Over Time (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="px-2">
            <ChartContainer
              config={{
                count: {
                  label: "Saves",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[160px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.savesOverTime} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 9 }}
                    interval="preserveEnd"
                    tickMargin={5}
                  />
                  <YAxis tick={{ fontSize: 9 }} width={30} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Posts Over Time Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Posts Growth (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="px-2">
            <ChartContainer
              config={{
                count: {
                  label: "Posts",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[160px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.postsOverTime} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 9 }}
                    interval="preserveEnd"
                    tickMargin={5}
                  />
                  <YAxis tick={{ fontSize: 9 }} width={30} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Weekly Engagement Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Weekly Engagement Time</CardTitle>
          </CardHeader>
          <CardContent className="px-2">
            <ChartContainer
              config={{
                minutes: {
                  label: "Minutes",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[160px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.weeklyEngagement} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
                  <XAxis 
                    dataKey="week" 
                    tick={{ fontSize: 9 }}
                    tickMargin={5}
                  />
                  <YAxis tick={{ fontSize: 9 }} width={30} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="minutes" 
                    fill="hsl(var(--primary))" 
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Insights Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Key Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="flex items-start gap-2.5 p-2.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
              <TrendingUp className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-foreground">Growing Popularity</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {analytics.savesChange > 0 
                    ? `Your location saves increased by ${analytics.savesChange}% this week. Keep engaging!`
                    : analytics.savesChange < 0
                    ? `Your location saves decreased by ${Math.abs(analytics.savesChange)}% this week.`
                    : 'Your location saves remained steady this week.'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <Users className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-foreground">High Engagement</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Users spend an average of {analytics.avgTimeSpent} minutes viewing your content.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <Share2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-foreground">Social Reach</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
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
