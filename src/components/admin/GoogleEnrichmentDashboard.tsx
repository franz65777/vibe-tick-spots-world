import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Loader2, Image, Clock, DollarSign, Play, Eye, RefreshCw, 
  CheckCircle2, AlertCircle, StopCircle, TrendingUp, Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MonthlySpend {
  month: string;
  total_cost: number;
  place_details_cost: number;
  place_photos_cost: number;
  find_place_cost: number;
  total_requests: number;
  locations_enriched: number;
}

interface EnrichmentStats {
  totalLocations: number;
  withPhotos: number;
  withHours: number;
  withGoogleId: number;
  needsEnrichment: number;
}

interface BatchResult {
  processed: number;
  successful: number;
  failed: number;
  totalCost: number;
  monthlySpend: number;
  remainingBudget: number;
  hasMore: boolean;
  nextOffset: number;
}

type EnrichmentStatus = 'idle' | 'starting' | 'running' | 'completed';

const MONTHLY_BUDGET = 200;
const COST_PER_LOCATION_ESTIMATE = 0.059; // $0.017 details + $0.007 * 6 photos

export const GoogleEnrichmentDashboard = () => {
  const [stats, setStats] = useState<EnrichmentStats | null>(null);
  const [monthlySpend, setMonthlySpend] = useState<MonthlySpend | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<EnrichmentStatus>('idle');
  
  // Settings
  const [batchSize, setBatchSize] = useState(10);
  const [enrichPhotos, setEnrichPhotos] = useState(true);
  const [enrichHours, setEnrichHours] = useState(true);
  const [maxPhotos, setMaxPhotos] = useState(4);
  
  // Progress
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [totalSuccessful, setTotalSuccessful] = useState(0);
  const [currentBatchCost, setCurrentBatchCost] = useState(0);
  const [sessionCost, setSessionCost] = useState(0);
  
  const abortRef = useRef(false);

  const fetchStats = async () => {
    try {
      // Get location stats
      const { data: locData } = await supabase
        .from('locations')
        .select('id, photos, opening_hours_data, google_place_id');
      
      if (locData) {
        const withPhotos = locData.filter(l => l.photos && Array.isArray(l.photos) && l.photos.length > 0).length;
        const withHours = locData.filter(l => l.opening_hours_data).length;
        const withGoogleId = locData.filter(l => l.google_place_id?.startsWith('ChIJ')).length;
        const needsEnrichment = locData.filter(l => 
          !l.photos || !(Array.isArray(l.photos) && l.photos.length > 0) || !l.opening_hours_data
        ).length;
        
        setStats({
          totalLocations: locData.length,
          withPhotos,
          withHours,
          withGoogleId,
          needsEnrichment,
        });
      }

      // Get monthly spend
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: spendData } = await supabase
        .rpc('get_google_api_monthly_spend', { target_month: currentMonth });
      
      if (spendData && spendData[0]) {
        setMonthlySpend(spendData[0] as MonthlySpend);
      } else {
        setMonthlySpend({
          month: currentMonth,
          total_cost: 0,
          place_details_cost: 0,
          place_photos_cost: 0,
          find_place_cost: 0,
          total_requests: 0,
          locations_enriched: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchStats();
      setLoading(false);
    };
    loadData();
  }, []);

  const runEnrichmentBatch = async (dryRun: boolean = false) => {
    if (status === 'running' || status === 'starting') {
      toast.info('Enrichment già in corso');
      return;
    }

    setStatus('starting');
    abortRef.current = false;
    setTotalProcessed(0);
    setTotalSuccessful(0);
    setSessionCost(0);

    toast.info(dryRun ? 'Avvio test...' : 'Avvio enrichment...', { duration: 2000 });

    try {
      setStatus('running');
      
      let offset = 0;
      let hasMore = true;
      let totalCostSession = 0;
      let totalProcessedSession = 0;
      let totalSuccessfulSession = 0;

      while (hasMore && !abortRef.current) {
        const { data, error } = await supabase.functions.invoke('enrich-locations-batch', {
          body: {
            batchSize,
            offset,
            enrichPhotos,
            enrichHours,
            maxPhotosPerLocation: maxPhotos,
            dryRun,
          }
        });

        if (error) {
          throw new Error(error.message);
        }

        const result = data as BatchResult;
        
        totalProcessedSession += result.processed;
        totalSuccessfulSession += result.successful;
        totalCostSession += result.totalCost;
        
        setTotalProcessed(totalProcessedSession);
        setTotalSuccessful(totalSuccessfulSession);
        setCurrentBatchCost(result.totalCost);
        setSessionCost(totalCostSession);
        
        hasMore = result.hasMore;
        offset = result.nextOffset;

        // Update monthly spend display
        if (monthlySpend) {
          setMonthlySpend({
            ...monthlySpend,
            total_cost: result.monthlySpend,
          });
        }

        // Small delay between batches
        if (hasMore && !abortRef.current) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setStatus('completed');
      await fetchStats();

      toast.success(dryRun ? '✅ Test completato!' : '✅ Enrichment completato!', {
        description: `${totalSuccessfulSession} location arricchite, costo: $${totalCostSession.toFixed(2)}`,
        duration: 5000,
      });

    } catch (error: any) {
      setStatus('idle');
      toast.error('Errore durante l\'enrichment', { 
        description: error.message,
        duration: 5000 
      });
    }
  };

  const handleStop = () => {
    abortRef.current = true;
    setStatus('idle');
    toast.info('Enrichment interrotto');
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchStats();
    setLoading(false);
    toast.success('Statistiche aggiornate');
  };

  if (loading && !stats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const spentPercent = monthlySpend ? (monthlySpend.total_cost / MONTHLY_BUDGET) * 100 : 0;
  const remainingBudget = MONTHLY_BUDGET - (monthlySpend?.total_cost || 0);
  const estimatedLocationsRemaining = Math.floor(remainingBudget / COST_PER_LOCATION_ESTIMATE);
  const photosPercent = stats ? (stats.withPhotos / Math.max(stats.totalLocations, 1)) * 100 : 0;
  const hoursPercent = stats ? (stats.withHours / Math.max(stats.totalLocations, 1)) * 100 : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-amber-500" />
            Google API Enrichment
            {status === 'running' && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
          </CardTitle>
          <Button
            onClick={handleRefresh}
            disabled={loading || status === 'running'}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-5">
        {/* Budget Tracker */}
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="font-medium">Budget Mensile</span>
            </div>
            <Badge variant={spentPercent > 80 ? "destructive" : spentPercent > 50 ? "secondary" : "outline"}>
              ${monthlySpend?.total_cost.toFixed(2) || '0.00'} / $200
            </Badge>
          </div>
          <Progress value={spentPercent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Rimanenti: ${remainingBudget.toFixed(2)}</span>
            <span>~{estimatedLocationsRemaining} location disponibili</span>
          </div>
        </div>

        {/* Running State */}
        {status === 'running' && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
              <div className="flex-1">
                <p className="font-medium text-sm">🔄 Enrichment in corso</p>
                <p className="text-xs text-muted-foreground">
                  {totalSuccessful}/{totalProcessed} successi • Costo sessione: ${sessionCost.toFixed(3)}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={handleStop} className="text-xs h-7">
                <StopCircle className="w-3 h-3 mr-1" />
                Stop
              </Button>
            </div>
          </div>
        )}

        {/* Completed State */}
        {status === 'completed' && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div className="flex-1">
                <p className="font-medium text-sm text-green-700 dark:text-green-400">✅ Completato!</p>
                <p className="text-xs text-muted-foreground">
                  {totalSuccessful} location arricchite • ${sessionCost.toFixed(2)} spesi
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setStatus('idle')}>
                Chiudi
              </Button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Image className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Con Foto</span>
            </div>
            <div className="text-xl font-bold">{stats?.withPhotos || 0}</div>
            <Progress value={photosPercent} className="h-1 mt-1" />
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Con Orari</span>
            </div>
            <div className="text-xl font-bold">{stats?.withHours || 0}</div>
            <Progress value={hoursPercent} className="h-1 mt-1" />
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Google ID</span>
            </div>
            <div className="text-xl font-bold">{stats?.withGoogleId || 0}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Da Arricchire</span>
            </div>
            <div className="text-xl font-bold">{stats?.needsEnrichment || 0}</div>
          </div>
        </div>

        {/* Settings */}
        {status === 'idle' && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs">Batch Size: {batchSize}</Label>
              </div>
              <Slider
                value={[batchSize]}
                onValueChange={(v) => setBatchSize(v[0])}
                min={5}
                max={50}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs">Max Foto per Location: {maxPhotos}</Label>
              </div>
              <Slider
                value={[maxPhotos]}
                onValueChange={(v) => setMaxPhotos(v[0])}
                min={1}
                max={6}
                step={1}
              />
            </div>

            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Switch 
                  id="photos" 
                  checked={enrichPhotos} 
                  onCheckedChange={setEnrichPhotos}
                />
                <Label htmlFor="photos" className="text-xs">Foto</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  id="hours" 
                  checked={enrichHours} 
                  onCheckedChange={setEnrichHours}
                />
                <Label htmlFor="hours" className="text-xs">Orari</Label>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            onClick={() => runEnrichmentBatch(false)}
            disabled={status === 'starting' || status === 'running' || remainingBudget <= 0}
            size="sm"
            className="flex-1 rounded-full"
          >
            {status === 'starting' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Avvio...
              </>
            ) : status === 'running' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                In corso...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Avvia Enrichment
              </>
            )}
          </Button>
          <Button
            onClick={() => runEnrichmentBatch(true)}
            disabled={status === 'starting' || status === 'running'}
            variant="outline"
            size="sm"
            className="rounded-full"
            title="Test senza modifiche"
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>

        {/* Cost Breakdown */}
        {monthlySpend && monthlySpend.total_requests > 0 && (
          <div className="text-[11px] text-muted-foreground space-y-1 pt-2 border-t">
            <p className="font-medium">Dettaglio costi {monthlySpend.month}:</p>
            <div className="flex flex-wrap gap-2">
              <span>Details: ${monthlySpend.place_details_cost.toFixed(2)}</span>
              <span>•</span>
              <span>Photos: ${monthlySpend.place_photos_cost.toFixed(2)}</span>
              <span>•</span>
              <span>Find: ${monthlySpend.find_place_cost.toFixed(2)}</span>
            </div>
            <p>{monthlySpend.locations_enriched} location arricchite questo mese</p>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Scarica foto e orari da Google Places API. Costo stimato: ~$0.06/location. 
          Budget mensile gratuito: $200 (~3,300 location).
        </p>
      </CardContent>
    </Card>
  );
};
