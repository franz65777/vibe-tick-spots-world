import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsAdmin, useRetentionAnalytics } from '@/hooks/useRetentionAnalytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, Users, TrendingUp, Activity, MapPin, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DataFixUtility from '@/components/admin/DataFixUtility';
import { useTranslation } from 'react-i18next';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [dateRange, setDateRange] = useState('30');

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const {
    day1Retention,
    day7Retention,
    day30Retention,
    cityRetention,
    featureUsage,
    dau,
    mau,
    loading,
  } = useRetentionAnalytics(startDate, endDate);

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">{t('accessDenied', { ns: 'common' })}</h1>
        <p className="text-muted-foreground">{t('noPermission', { ns: 'common' })}</p>
        <Button onClick={() => navigate('/')}>{t('goHome', { ns: 'common' })}</Button>
      </div>
    );
  }

  const dauMauRatio = mau > 0 ? ((dau / mau) * 100).toFixed(1) : '0';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('retentionAnalytics', { ns: 'admin' })}</h1>
          <p className="text-muted-foreground">{t('monitorUserEngagement', { ns: 'admin' })}</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">{t('last7Days', { ns: 'admin' })}</SelectItem>
            <SelectItem value="30">{t('last30Days', { ns: 'admin' })}</SelectItem>
            <SelectItem value="90">{t('last90Days', { ns: 'admin' })}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Fix Utility */}
      <DataFixUtility />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dailyActiveUsers', { ns: 'admin' })}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dau}</div>
            <p className="text-xs text-muted-foreground">{t('today', { ns: 'common' })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('monthlyActiveUsers', { ns: 'admin' })}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mau}</div>
            <p className="text-xs text-muted-foreground">{t('thisMonth', { ns: 'admin' })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dauMauRatio', { ns: 'admin' })}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dauMauRatio}%</div>
            <p className="text-xs text-muted-foreground">{t('stickinessMetric', { ns: 'admin' })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('avgDay1Retention', { ns: 'admin' })}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {day1Retention.length > 0
                ? (day1Retention.reduce((sum, c) => sum + c.retention_rate, 0) / day1Retention.length).toFixed(1)
                : '0'}%
            </div>
            <p className="text-xs text-muted-foreground">{t('lastDays', { ns: 'admin', days: dateRange })}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="cohorts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cohorts">{t('retentionCohorts', { ns: 'admin' })}</TabsTrigger>
          <TabsTrigger value="city">{t('byCity', { ns: 'admin' })}</TabsTrigger>
          <TabsTrigger value="features">{t('featureUsage', { ns: 'admin' })}</TabsTrigger>
        </TabsList>

        <TabsContent value="cohorts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('day1Retention', { ns: 'admin' })}</CardTitle>
                <CardDescription>{t('usersReturningNextDay', { ns: 'admin' })}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={day1Retention}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cohort_date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="retention_rate" stroke={COLORS[0]} name={t('retentionPercent', { ns: 'admin' })} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('day7Retention', { ns: 'admin' })}</CardTitle>
                <CardDescription>{t('usersReturningAfterWeek', { ns: 'admin' })}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={day7Retention}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cohort_date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="retention_rate" stroke={COLORS[1]} name={t('retentionPercent', { ns: 'admin' })} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('day30Retention', { ns: 'admin' })}</CardTitle>
                <CardDescription>{t('usersReturningAfterMonth', { ns: 'admin' })}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={day30Retention}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cohort_date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="retention_rate" stroke={COLORS[2]} name={t('retentionPercent', { ns: 'admin' })} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="city" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {t('retentionByCity', { ns: 'admin' })}
              </CardTitle>
              <CardDescription>{t('compareRetentionAcrossCities', { ns: 'admin' })}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={cityRetention}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="city" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="day1_rate" fill={COLORS[0]} name={t('day1Percent', { ns: 'admin' })} />
                  <Bar dataKey="day7_rate" fill={COLORS[1]} name={t('day7Percent', { ns: 'admin' })} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  {t('featureUsageDistribution', { ns: 'admin' })}
                </CardTitle>
                <CardDescription>{t('mostPopularFeatures', { ns: 'admin' })}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={featureUsage}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.feature}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="usage_count"
                    >
                      {featureUsage.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('featureEngagement', { ns: 'admin' })}</CardTitle>
                <CardDescription>{t('totalUsageAndUniqueUsers', { ns: 'admin' })}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={featureUsage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="feature" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="unique_users" fill={COLORS[0]} name={t('uniqueUsers', { ns: 'admin' })} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}