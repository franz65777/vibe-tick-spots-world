import { useState, useEffect } from 'react';
import { retentionAnalyticsService, RetentionCohort, CityRetention, FeatureUsage } from '@/services/retentionAnalyticsService';

export const useRetentionAnalytics = (startDate: string, endDate: string) => {
  const [day1Retention, setDay1Retention] = useState<RetentionCohort[]>([]);
  const [day7Retention, setDay7Retention] = useState<RetentionCohort[]>([]);
  const [day30Retention, setDay30Retention] = useState<RetentionCohort[]>([]);
  const [cityRetention, setCityRetention] = useState<CityRetention[]>([]);
  const [featureUsage, setFeatureUsage] = useState<FeatureUsage[]>([]);
  const [dau, setDau] = useState<number>(0);
  const [mau, setMau] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [startDate, endDate]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [
        day1Data,
        day7Data,
        day30Data,
        cityData,
        featureData,
        dauData,
        mauData,
      ] = await Promise.all([
        retentionAnalyticsService.getDay1Retention(startDate, endDate),
        retentionAnalyticsService.getDay7Retention(startDate, endDate),
        retentionAnalyticsService.getDay30Retention(startDate, endDate),
        retentionAnalyticsService.getRetentionByCity(startDate, endDate),
        retentionAnalyticsService.getFeatureUsage(startDate, endDate),
        retentionAnalyticsService.getDAU(new Date().toISOString().split('T')[0]),
        retentionAnalyticsService.getMAU(new Date().toISOString().split('T')[0]),
      ]);

      setDay1Retention(day1Data);
      setDay7Retention(day7Data);
      setDay30Retention(day30Data);
      setCityRetention(cityData);
      setFeatureUsage(featureData);
      setDau(dauData);
      setMau(mauData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    day1Retention,
    day7Retention,
    day30Retention,
    cityRetention,
    featureUsage,
    dau,
    mau,
    loading,
    refresh: loadAnalytics,
  };
};

export const useIsAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const adminStatus = await retentionAnalyticsService.checkIsAdmin();
    setIsAdmin(adminStatus);
    setLoading(false);
  };

  return { isAdmin, loading };
};
