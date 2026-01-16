import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Users, Sparkles, Globe, Play, Eye, RefreshCw, CheckCircle2, AlertCircle, StopCircle } from 'lucide-react';
import { getSeedingStats, runFullSeeding, runLocationSeeding } from '@/services/lazyPhotoService';
import { toast } from 'sonner';

interface SeedingStats {
  totalLocations: number;
  systemSeeded: number;
  userCreated: number;
  needsEnrichment: number;
  enrichedLocations: number;
  cityCounts: Record<string, number>;
}

type SeedingStatus = 'idle' | 'starting' | 'running' | 'completed';

const TOTAL_CITIES = 36;
const BATCH_SIZE = 3;

export const SeedingDashboard = () => {
  const [stats, setStats] = useState<SeedingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [seedingStatus, setSeedingStatus] = useState<SeedingStatus>('idle');
  const [seedingProgress, setSeedingProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches] = useState(Math.ceil(TOTAL_CITIES / BATCH_SIZE));
  const [currentCities, setCurrentCities] = useState<string[]>([]);
  const [totalInserted, setTotalInserted] = useState(0);
  const abortRef = useRef(false);

  const fetchStats = async () => {
    const data = await getSeedingStats();
    setStats(data);
    return data;
  };

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      await fetchStats();
      setLoading(false);
    };
    loadInitial();
  }, []);

  const handleRunSeed = async (dryRun: boolean) => {
    if (seedingStatus === 'starting' || seedingStatus === 'running') {
      toast.info('Seeding già in corso');
      return;
    }

    setSeedingStatus('starting');
    abortRef.current = false;
    setTotalInserted(0);
    setCurrentBatch(0);
    setSeedingProgress(0);

    toast.loading(dryRun ? 'Avvio test...' : 'Avvio seeding...', {
      id: 'seeding-start',
    });

    try {
      setSeedingStatus('running');
      toast.dismiss('seeding-start');
      
      toast.success(dryRun ? '🧪 Test avviato' : '🚀 Seeding avviato!', {
        description: `Processamento di ${TOTAL_CITIES} città in ${totalBatches} batch`,
      });

      const result = await runFullSeeding(
        (progress) => {
          if (abortRef.current) return;
          
          setCurrentBatch(progress.currentBatch);
          setCurrentCities(progress.citiesProcessed);
          setTotalInserted(progress.locationsInserted);
          setSeedingProgress((progress.currentBatch / progress.totalBatches) * 100);
        },
        dryRun
      );

      if (result.success) {
        setSeedingStatus('completed');
        setSeedingProgress(100);
        await fetchStats();
        
        toast.success('✅ Seeding completato!', {
          description: `${result.totalInserted} location inserite`,
          duration: 5000,
        });
      } else {
        setSeedingStatus('idle');
        toast.error('Errore durante il seeding', {
          description: result.error,
        });
      }
    } catch (error) {
      setSeedingStatus('idle');
      toast.dismiss('seeding-start');
      toast.error('Errore durante il seeding');
    }
  };

  const handleStop = () => {
    abortRef.current = true;
    setSeedingStatus('idle');
    toast.info('Seeding interrotto');
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

  const enrichmentPercent = stats ? 
    Math.round((stats.enrichedLocations / Math.max(stats.totalLocations, 1)) * 100) : 0;

  const topCities = stats ? 
    Object.entries(stats.cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6) : [];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="w-5 h-5 text-primary" />
            Location Seeding
            {seedingStatus === 'running' && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            )}
          </CardTitle>
          <Button
            onClick={handleRefresh}
            disabled={loading || seedingStatus === 'running'}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-5">
        {/* Starting State */}
        {seedingStatus === 'starting' && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
              <div className="flex-1">
                <p className="font-medium text-sm">Avvio in corso...</p>
                <p className="text-xs text-muted-foreground">Connessione al server</p>
              </div>
            </div>
          </div>
        )}

        {/* Running State */}
        {seedingStatus === 'running' && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">🌍 Seeding in esecuzione</p>
                <p className="text-xs text-muted-foreground">
                  Batch {currentBatch}/{totalBatches} • {totalInserted} location inserite
                </p>
              </div>
              <Badge variant="secondary" className="text-xs font-mono">
                {Math.round(seedingProgress)}%
              </Badge>
            </div>
            <Progress value={seedingProgress} className="h-2" />
            {currentCities.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {currentCities.map(city => (
                  <Badge key={city} variant="outline" className="text-xs">
                    {city}
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>Non chiudere questa pagina durante il seeding.</span>
              </div>
              <Button size="sm" variant="ghost" onClick={handleStop} className="text-xs h-7">
                <StopCircle className="w-3 h-3 mr-1" />
                Stop
              </Button>
            </div>
          </div>
        )}
        
        {/* Completed State */}
        {seedingStatus === 'completed' && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div className="flex-1">
                <p className="font-medium text-sm text-green-700 dark:text-green-400">✅ Seeding completato!</p>
                <p className="text-xs text-muted-foreground">{totalInserted} location aggiunte</p>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-xs"
                onClick={() => setSeedingStatus('idle')}
              >
                Chiudi
              </Button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Totale</span>
            </div>
            <div className="text-xl font-bold">{stats?.totalLocations.toLocaleString()}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Auto-Seed</span>
            </div>
            <div className="text-xl font-bold">{stats?.systemSeeded.toLocaleString()}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Da Utenti</span>
            </div>
            <div className="text-xl font-bold">{stats?.userCreated.toLocaleString()}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Da Arricchire</span>
            </div>
            <div className="text-xl font-bold">{stats?.needsEnrichment.toLocaleString()}</div>
          </div>
        </div>

        {/* Enrichment Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Arricchimento Foto</span>
            <span className="text-xs font-medium">{enrichmentPercent}%</span>
          </div>
          <Progress value={enrichmentPercent} className="h-1.5" />
        </div>

        {/* Top Cities */}
        {topCities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topCities.map(([city, count]) => (
              <Badge key={city} variant="outline" className="text-xs font-normal">
                {city} ({count})
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            onClick={() => handleRunSeed(false)}
            disabled={seedingStatus === 'starting' || seedingStatus === 'running'}
            size="sm"
            className="flex-1 rounded-full"
          >
            {seedingStatus === 'starting' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Avvio...
              </>
            ) : seedingStatus === 'running' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                In corso...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Avvia Seeding
              </>
            )}
          </Button>
          <Button
            onClick={() => handleRunSeed(true)}
            disabled={seedingStatus === 'starting' || seedingStatus === 'running'}
            variant="outline"
            size="sm"
            className="rounded-full"
            title="Dry Run (Test senza modifiche)"
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Popola location in {TOTAL_CITIES} città con OpenStreetMap. Processa {BATCH_SIZE} città alla volta per evitare timeout. Le foto vengono caricate solo quando un utente visualizza la location.
        </p>
      </CardContent>
    </Card>
  );
};
