import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Users, Sparkles, Globe, Play, Eye } from 'lucide-react';
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

export const SeedingDashboard = () => {
  const [stats, setStats] = useState<SeedingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isDryRun, setIsDryRun] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    const data = await getSeedingStats();
    setStats(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRunSeed = async (dryRun: boolean) => {
    if (dryRun) {
      setIsDryRun(true);
    } else {
      setIsSeeding(true);
    }

    try {
      const result = await runLocationSeeding({
        maxLocations: 1500,
        dryRun,
      });

      if (result.success) {
        if (dryRun) {
          toast.success(`Test avviato in background. Controlla i log per il progresso.`, {
            duration: 5000,
          });
        } else {
          toast.success(`Seeding avviato in background! Tempo stimato: ${result.estimatedTime || '~15 minuti'}. Aggiorna le stats tra qualche minuto.`, {
            duration: 8000,
          });
        }
      } else {
        toast.error(`Errore: ${result.error}`);
      }
    } catch (error) {
      toast.error('Errore durante l\'avvio del seeding');
    } finally {
      // Reset after a short delay since it runs in background
      setTimeout(() => {
        setIsSeeding(false);
        setIsDryRun(false);
      }, 2000);
    }
  };

  if (loading) {
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
      .slice(0, 8) : [];

  return (
    <Card>
      <CardHeader className="border-b-0">
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Location Seeding Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-xl p-4 text-center">
            <MapPin className="w-5 h-5 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{stats?.totalLocations.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Totale Location</div>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 text-center">
            <Sparkles className="w-5 h-5 mx-auto mb-2 text-amber-500" />
            <div className="text-2xl font-bold">{stats?.systemSeeded.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Auto-Generate</div>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">{stats?.userCreated.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Create da Utenti</div>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 text-center">
            <Eye className="w-5 h-5 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{stats?.needsEnrichment.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Da Arricchire</div>
          </div>
        </div>

        {/* Enrichment Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso Arricchimento (Foto Google)</span>
            <span className="font-medium">{enrichmentPercent}%</span>
          </div>
          <Progress value={enrichmentPercent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {stats?.enrichedLocations.toLocaleString()} / {stats?.totalLocations.toLocaleString()} location con foto
          </p>
        </div>

        {/* Top Cities */}
        {topCities.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Città con più location seeded</h4>
            <div className="flex flex-wrap gap-2">
              {topCities.map(([city, count]) => (
                <Badge key={city} variant="secondary" className="text-xs">
                  {city}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            onClick={() => handleRunSeed(true)}
            disabled={isDryRun || isSeeding}
            variant="outline"
            size="sm"
            className="rounded-full"
          >
            {isDryRun ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analisi...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Dry Run (Test)
              </>
            )}
          </Button>
          <Button
            onClick={() => handleRunSeed(false)}
            disabled={isSeeding || isDryRun}
            size="sm"
            className="rounded-full"
          >
            {isSeeding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Seeding in corso...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Esegui Seeding (~1500 location)
              </>
            )}
          </Button>
          <Button
            onClick={fetchStats}
            disabled={loading}
            variant="ghost"
            size="sm"
            className="rounded-full"
          >
            Aggiorna Stats
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Il seeding popola automaticamente ~1500 location in 35+ città usando OpenStreetMap (gratuito).
          Le foto vengono caricate da Google solo quando un utente visualizza la location (lazy-loading).
        </p>
      </CardContent>
    </Card>
  );
};
