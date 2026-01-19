import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Loader2, Image, Clock, DollarSign, Play, Eye, RefreshCw, 
  CheckCircle2, AlertCircle, StopCircle, TrendingUp, Zap, ShieldAlert, Power
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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
  deleted: number;
  totalCost: number;
  monthlySpend: number;
  remainingBudget: number;
  hasMore: boolean;
  nextOffset: number;
  budget_blocked?: boolean;
  error?: string;
}

interface BudgetSettings {
  monthly_limit_usd: number;
  enabled: boolean;
}

type EnrichmentStatus = 'idle' | 'starting' | 'running' | 'completed';

// Real costs based on Google Cloud billing data (after $200 free credit)
// Photo = $0.0055 each, Contact Data (hours) = $0.0016 each, everything else FREE
const COST_PER_PHOTO = 0.0055;
const COST_PER_CONTACT_DATA = 0.0016;
const AVG_PHOTOS_PER_LOCATION = 4;
const COST_PER_LOCATION_ESTIMATE = (COST_PER_PHOTO * AVG_PHOTOS_PER_LOCATION) + COST_PER_CONTACT_DATA; // ~$0.024

export const GoogleEnrichmentDashboard = () => {
  const [stats, setStats] = useState<EnrichmentStats | null>(null);
  const [monthlySpend, setMonthlySpend] = useState<MonthlySpend | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<EnrichmentStatus>('idle');
  
  // Budget settings
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings>({ monthly_limit_usd: 10, enabled: false });
  const [budgetLimitInput, setBudgetLimitInput] = useState('10');
  const [savingBudget, setSavingBudget] = useState(false);
  
  // Settings
  const [batchSize, setBatchSize] = useState(10);
  const [enrichPhotos, setEnrichPhotos] = useState(true);
  const [enrichHours, setEnrichHours] = useState(true);
  const [maxPhotos, setMaxPhotos] = useState(4);
  const [resolvePlaceIds, setResolvePlaceIds] = useState(false);
  
  // Progress
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [totalSuccessful, setTotalSuccessful] = useState(0);
  const [totalDeleted, setTotalDeleted] = useState(0);
  const [currentBatchCost, setCurrentBatchCost] = useState(0);
  const [sessionCost, setSessionCost] = useState(0);
  
  const abortRef = useRef(false);

  const fetchStats = async () => {
    try {
      // Use RPC function for accurate counts (avoids client-side pagination limits)
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_location_enrichment_stats');
      
      if (statsError) {
        console.error('Error fetching stats via RPC:', statsError);
      } else if (statsData) {
        // Type assertion for the RPC response
        const data = statsData as {
          total_locations: number;
          with_photos: number;
          with_hours: number;
          with_google_id: number;
          needs_enrichment: number;
        };
        
        setStats({
          totalLocations: data.total_locations || 0,
          withPhotos: data.with_photos || 0,
          withHours: data.with_hours || 0,
          withGoogleId: data.with_google_id || 0,
          needsEnrichment: data.needs_enrichment || 0,
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

      // Get budget settings
      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'google_api_budget')
        .single();
      
      if (settingsData?.value) {
        const settings = settingsData.value as unknown as BudgetSettings;
        setBudgetSettings(settings);
        setBudgetLimitInput(String(settings.monthly_limit_usd || 10));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const saveBudgetSettings = async (newSettings: Partial<BudgetSettings>) => {
    setSavingBudget(true);
    try {
      const updated = { ...budgetSettings, ...newSettings };
      const { error } = await supabase
        .from('app_settings')
        .upsert({ 
          key: 'google_api_budget', 
          value: updated,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      setBudgetSettings(updated);
      toast.success(newSettings.enabled !== undefined 
        ? `Google API ${updated.enabled ? 'abilitato' : 'disabilitato'}`
        : `Limite budget aggiornato a $${updated.monthly_limit_usd}`
      );
    } catch (error: any) {
      toast.error('Errore nel salvataggio', { description: error.message });
    } finally {
      setSavingBudget(false);
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
    setTotalDeleted(0);
    setSessionCost(0);

    toast.info(dryRun ? 'Avvio test...' : 'Avvio enrichment...', { duration: 2000 });

    try {
      setStatus('running');
      
      let offset = 0;
      let hasMore = true;
      let totalCostSession = 0;
      let totalProcessedSession = 0;
      let totalSuccessfulSession = 0;
      let totalDeletedSession = 0;

      while (hasMore && !abortRef.current) {
        const { data, error } = await supabase.functions.invoke('enrich-locations-batch', {
          body: {
            batchSize,
            offset,
            enrichPhotos,
            enrichHours,
            maxPhotosPerLocation: maxPhotos,
            resolvePlaceIds,
            dryRun,
          }
        });

        if (error) {
          throw new Error(error.message);
        }

        const result = data as BatchResult;

        // Check if budget is blocked
        if (result.budget_blocked) {
          toast.warning('Google API bloccata', {
            description: result.error || 'Budget esaurito o API disabilitata',
            duration: 5000
          });
          break;
        }
        
        totalProcessedSession += result.processed;
        totalSuccessfulSession += result.successful;
        totalDeletedSession += result.deleted || 0;
        totalCostSession += result.totalCost;
        
        setTotalProcessed(totalProcessedSession);
        setTotalSuccessful(totalSuccessfulSession);
        setTotalDeleted(totalDeletedSession);
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

      if (totalSuccessfulSession === 0 && totalCostSession > 0) {
        toast.warning('Nessuna location arricchita', {
          description: `Spesi $${totalCostSession.toFixed(2)}. Probabile manchino Google Place ID: attiva "Trova Google ID" (costo extra) oppure aggiungi/riconosci gli ID manualmente.`,
          duration: 7000,
        });
      } else {
        const deletedInfo = totalDeletedSession > 0 ? ` (${totalDeletedSession} eliminate)` : '';
        toast.success(dryRun ? '✅ Test completato!' : '✅ Enrichment completato!', {
          description: `${totalSuccessfulSession} location arricchite${deletedInfo}, costo: $${totalCostSession.toFixed(2)}`,
          duration: 5000,
        });
      }

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

  const configuredBudget = budgetSettings.monthly_limit_usd || 10;
  const spentPercent = monthlySpend ? (monthlySpend.total_cost / configuredBudget) * 100 : 0;
  const remainingBudget = configuredBudget - (monthlySpend?.total_cost || 0);
  const estimatedLocationsRemaining = Math.floor(Math.max(0, remainingBudget) / COST_PER_LOCATION_ESTIMATE);
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
        {/* ⚠️ KILL SWITCH & BUDGET CONTROL */}
        <div className={`border rounded-xl p-4 space-y-4 ${
          budgetSettings.enabled 
            ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20' 
            : 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20'
        }`}>
          {/* Kill Switch */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Power className={`w-5 h-5 ${budgetSettings.enabled ? 'text-green-600' : 'text-red-500'}`} />
              <div>
                <span className="font-medium">Google API</span>
                <p className="text-xs text-muted-foreground">
                  {budgetSettings.enabled ? 'Abilitato' : 'Disabilitato - nessun costo'}
                </p>
              </div>
            </div>
            <Switch
              checked={budgetSettings.enabled}
              onCheckedChange={(enabled) => saveBudgetSettings({ enabled })}
              disabled={savingBudget}
            />
          </div>

          {/* Budget Limit */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <Label className="text-sm">Limite mensile: $</Label>
              <Input
                type="number"
                value={budgetLimitInput}
                onChange={(e) => setBudgetLimitInput(e.target.value)}
                className="w-20 h-8 text-sm"
                min={1}
                max={200}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => saveBudgetSettings({ monthly_limit_usd: Number(budgetLimitInput) || 10 })}
              disabled={savingBudget || Number(budgetLimitInput) === budgetSettings.monthly_limit_usd}
              className="h-8"
            >
              {savingBudget ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salva'}
            </Button>
          </div>

          {/* Spend Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                Speso questo mese
              </span>
              <Badge variant={spentPercent > 100 ? "destructive" : spentPercent > 80 ? "secondary" : "outline"}>
                ${monthlySpend?.total_cost.toFixed(2) || '0.00'} / ${configuredBudget}
              </Badge>
            </div>
            <Progress value={Math.min(spentPercent, 100)} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Rimanenti: ${Math.max(0, remainingBudget).toFixed(2)}</span>
              <span>~{estimatedLocationsRemaining} location disponibili</span>
            </div>
          </div>

          {/* Warning if over budget */}
          {remainingBudget <= 0 && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-100 dark:bg-red-900/30 rounded-lg p-2">
              <AlertCircle className="w-4 h-4" />
              <span>Budget esaurito! Le API Google sono bloccate automaticamente.</span>
            </div>
          )}
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

            <div className="flex gap-4 flex-wrap">
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
              <div className="flex items-center gap-2">
                <Switch
                  id="resolvePlaceIds"
                  checked={resolvePlaceIds}
                  onCheckedChange={setResolvePlaceIds}
                />
                <Label htmlFor="resolvePlaceIds" className="text-xs">Trova Google ID (costo extra)</Label>
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

        {/* Cost Breakdown with Pie Chart */}
        {monthlySpend && monthlySpend.total_requests > 0 && (
          <div className="pt-2 border-t space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Dettaglio costi {monthlySpend.month}:</p>
            
            <div className="flex items-center gap-4">
              {/* Pie Chart */}
              <div className="w-20 h-20 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Details', value: monthlySpend.place_details_cost, color: '#3b82f6' },
                        { name: 'Photos', value: monthlySpend.place_photos_cost, color: '#10b981' },
                        { name: 'Find', value: monthlySpend.find_place_cost, color: '#f59e0b' },
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={18}
                      outerRadius={35}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {[
                        { name: 'Details', value: monthlySpend.place_details_cost, color: '#3b82f6' },
                        { name: 'Photos', value: monthlySpend.place_photos_cost, color: '#10b981' },
                        { name: 'Find', value: monthlySpend.find_place_cost, color: '#f59e0b' },
                      ].filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `$${value.toFixed(2)}`}
                      contentStyle={{ fontSize: '11px', padding: '4px 8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legend */}
              <div className="flex-1 space-y-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Details:</span>
                  <span className="font-medium">${monthlySpend.place_details_cost.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Photos:</span>
                  <span className="font-medium">${monthlySpend.place_photos_cost.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-muted-foreground">Find:</span>
                  <span className="font-medium">${monthlySpend.find_place_cost.toFixed(2)}</span>
                </div>
                <p className="text-muted-foreground pt-1">
                  {monthlySpend.locations_enriched} location arricchite
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          ✅ <span className="text-green-600 font-medium">GRATIS:</span> Find Place, Basic Data, Atmosphere Data, Text Search, Place Details.
          <br />
          💰 <span className="text-amber-600 font-medium">A PAGAMENTO:</span> Photos (~$0.0055/foto), Contact Data/orari (~$0.0016/richiesta).
          <br />
          Costo reale stimato: ~$0.024/location (4 foto + orari). Budget $200 = ~8,300 location.
        </p>
      </CardContent>
    </Card>
  );
};
