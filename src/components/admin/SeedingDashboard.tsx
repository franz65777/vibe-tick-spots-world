import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Users, Sparkles, Globe, Play, Eye, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import { getSeedingStats, runLocationSeeding } from '@/services/lazyPhotoService';
import { toast } from 'sonner';

interface SeedingStats {
  totalLocations: number;
  systemSeeded: number;
  userCreated: number;
  needsEnrichment: number;
  enrichedLocations: number;
  cityCounts: Record<string, number>;
}

type SeedingStatus = 'idle' | 'running' | 'completed';

const SEEDING_STORAGE_KEY = 'seeding_status';
const SEEDING_DURATION_MS = 15 * 60 * 1000; // 15 minutes estimated

export const SeedingDashboard = () => {
  const [stats, setStats] = useState<SeedingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [seedingStatus, setSeedingStatus] = useState<SeedingStatus>('idle');
  const [seedingProgress, setSeedingProgress] = useState(0);
  const [seedingStartTime, setSeedingStartTime] = useState<number | null>(null);
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState<string>('');
  const initialLocationCount = useRef<number>(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = async () => {
    const data = await getSeedingStats();
    setStats(data);
    return data;
  };

  // Check for existing seeding session on mount
  useEffect(() => {
    const stored = localStorage.getItem(SEEDING_STORAGE_KEY);
    if (stored) {
      const { startTime, initialCount } = JSON.parse(stored);
      const elapsed = Date.now() - startTime;
      
      if (elapsed < SEEDING_DURATION_MS) {
        setSeedingStartTime(startTime);
        setSeedingStatus('running');
        initialLocationCount.current = initialCount;
      } else {
        localStorage.removeItem(SEEDING_STORAGE_KEY);
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      await fetchStats();
      setLoading(false);
    };
    loadInitial();
  }, []);

  // Polling during seeding
  useEffect(() => {
    if (seedingStatus === 'running') {
      pollIntervalRef.current = setInterval(async () => {
        const newStats = await fetchStats();
        
        // Calculate progress based on new locations added
        if (initialLocationCount.current > 0 && newStats) {
          const newLocations = newStats.systemSeeded - initialLocationCount.current;
          const targetLocations = 1500;
          const progress = Math.min((newLocations / targetLocations) * 100, 100);
          setSeedingProgress(progress);
          
          // Check if seeding seems complete (progress stalled or reached target)
          if (progress >= 95 || (Date.now() - (seedingStartTime || 0)) > SEEDING_DURATION_MS) {
            setSeedingStatus('completed');
            setSeedingProgress(100);
            localStorage.removeItem(SEEDING_STORAGE_KEY);
            toast.success('Seeding completato!', {
              description: `${newLocations} nuove location aggiunte`,
            });
          }
        }
        
        // Update time estimate
        if (seedingStartTime) {
          const elapsed = Date.now() - seedingStartTime;
          const remaining = Math.max(SEEDING_DURATION_MS - elapsed, 0);
          const minutes = Math.ceil(remaining / 60000);
          setEstimatedTimeLeft(minutes > 0 ? `~${minutes} min rimanenti` : 'Quasi fatto...');
        }
      }, 10000); // Poll every 10 seconds

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [seedingStatus, seedingStartTime]);

  const handleRunSeed = async (dryRun: boolean) => {
    setIsStarting(true);

    try {
      const result = await runLocationSeeding({
        maxLocations: 1500,
        dryRun,
      });

      if (result.success) {
        if (dryRun) {
          toast.success('Test avviato in background', {
            description: 'Controlla i log per il progresso.',
          });
        } else {
          // Save seeding state
          const startTime = Date.now();
          initialLocationCount.current = stats?.systemSeeded || 0;
          localStorage.setItem(SEEDING_STORAGE_KEY, JSON.stringify({
            startTime,
            initialCount: initialLocationCount.current,
          }));
          
          setSeedingStartTime(startTime);
          setSeedingStatus('running');
          setSeedingProgress(0);
          setEstimatedTimeLeft('~15 min rimanenti');
          
          toast.success('Seeding avviato!', {
            description: 'La barra di progresso si aggiornerà automaticamente.',
          });
        }
      } else {
        toast.error(`Errore: ${result.error}`);
      }
    } catch (error) {
      toast.error('Errore durante l\'avvio del seeding');
    } finally {
      setIsStarting(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchStats();
    setLoading(false);
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
          </CardTitle>
          <Button
            onClick={handleRefresh}
            disabled={loading}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-5">
        {/* Seeding Status Banner */}
        {seedingStatus === 'running' && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Seeding in corso...</p>
                <p className="text-xs text-muted-foreground">{estimatedTimeLeft}</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {Math.round(seedingProgress)}%
              </Badge>
            </div>
            <Progress value={seedingProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Aggiunta automatica location da OpenStreetMap. Non chiudere la pagina.
            </p>
          </div>
        )}
        
        {seedingStatus === 'completed' && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div className="flex-1">
                <p className="font-medium text-sm text-green-700 dark:text-green-400">Seeding completato!</p>
                <p className="text-xs text-muted-foreground">Le nuove location sono state aggiunte con successo.</p>
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

        {/* Stats Grid - Compact 2x2 */}
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

        {/* Enrichment Progress - Compact */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Arricchimento Foto</span>
            <span className="text-xs font-medium">{enrichmentPercent}%</span>
          </div>
          <Progress value={enrichmentPercent} className="h-1.5" />
        </div>

        {/* Top Cities - Compact */}
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
            disabled={isStarting || seedingStatus === 'running'}
            size="sm"
            className="flex-1 rounded-full"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Avvio...
              </>
            ) : seedingStatus === 'running' ? (
              <>
                <Clock className="w-4 h-4 mr-2" />
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
            disabled={isStarting || seedingStatus === 'running'}
            variant="outline"
            size="sm"
            className="rounded-full"
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Popola ~1500 location in 35+ città con OpenStreetMap (gratuito). Le foto Google vengono caricate solo quando un utente visualizza la location.
        </p>
      </CardContent>
    </Card>
  );
};
