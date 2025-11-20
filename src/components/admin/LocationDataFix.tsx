import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LocationIssue {
  id: string;
  name: string | null;
  google_place_id: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  issue: string;
}

export const LocationDataFix = () => {
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [issues, setIssues] = useState<LocationIssue[]>([]);
  const [fixed, setFixed] = useState<string[]>([]);

  const scanForIssues = async () => {
    setScanning(true);
    setIssues([]);
    setFixed([]);

    try {
      // Scan locations table for issues
      const { data: locations, error } = await supabase
        .from('locations')
        .select('id, name, google_place_id, address, city, latitude, longitude')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const foundIssues: LocationIssue[] = [];

      locations?.forEach(loc => {
        // Check for missing or invalid name
        if (!loc.name || loc.name.trim() === '' || loc.name === 'Unknown') {
          foundIssues.push({
            id: loc.id,
            name: loc.name,
            google_place_id: loc.google_place_id,
            address: loc.address,
            city: loc.city,
            latitude: loc.latitude,
            longitude: loc.longitude,
            issue: 'Nome mancante o invalido'
          });
        }
        // Check for missing city
        else if (!loc.city || loc.city.trim() === '') {
          foundIssues.push({
            id: loc.id,
            name: loc.name,
            google_place_id: loc.google_place_id,
            address: loc.address,
            city: loc.city,
            latitude: loc.latitude,
            longitude: loc.longitude,
            issue: 'Città mancante'
          });
        }
        // Check for missing address
        else if (!loc.address || loc.address.trim() === '') {
          foundIssues.push({
            id: loc.id,
            name: loc.name,
            google_place_id: loc.google_place_id,
            address: loc.address,
            city: loc.city,
            latitude: loc.latitude,
            longitude: loc.longitude,
            issue: 'Indirizzo mancante'
          });
        }
      });

      setIssues(foundIssues);
      
      toast({
        title: "Scansione completata",
        description: `Trovati ${foundIssues.length} luoghi con problemi`,
      });
    } catch (error) {
      console.error('Error scanning locations:', error);
      toast({
        title: "Errore",
        description: "Impossibile scansionare i luoghi",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const fixLocation = async (locationId: string, latitude: number | null, longitude: number | null) => {
    if (!latitude || !longitude) {
      toast({
        title: "Errore",
        description: "Impossibile recuperare dati senza coordinate",
        variant: "destructive",
      });
      return;
    }

    try {
      // Call Foursquare search to get proper data
      const { data, error } = await supabase.functions.invoke('foursquare-search', {
        body: { 
          lat: latitude, 
          lng: longitude,
          limit: 1
        }
      });

      if (error || !data?.results?.[0]) {
        throw new Error('Dati non trovati');
      }

      const location = data.results[0];

      // Update the location with correct data
      const { error: updateError } = await supabase
        .from('locations')
        .update({
          name: location.name,
          address: location.address || null,
          city: location.city || null,
          google_place_id: location.google_place_id || null,
        })
        .eq('id', locationId);

      if (updateError) throw updateError;

      setFixed(prev => [...prev, locationId]);
      
      toast({
        title: "Luogo aggiornato",
        description: `${location.name} è stato corretto`,
      });
    } catch (error) {
      console.error('Error fixing location:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il luogo",
        variant: "destructive",
      });
    }
  };

  const fixAllLocations = async () => {
    setLoading(true);
    
    let fixedCount = 0;
    let failedCount = 0;

    for (const issue of issues) {
      if (fixed.includes(issue.id)) continue;
      
      try {
        await fixLocation(issue.id, issue.latitude, issue.longitude);
        fixedCount++;
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        failedCount++;
      }
    }

    setLoading(false);
    
    toast({
      title: "Correzione completata",
      description: `Corretti: ${fixedCount}, Falliti: ${failedCount}`,
    });

    // Rescan after fixing
    if (fixedCount > 0) {
      setTimeout(() => scanForIssues(), 1000);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Correzione Dati Luoghi</CardTitle>
        <CardDescription>
          Trova e correggi luoghi con dati mancanti o incompleti nel database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={scanForIssues}
            disabled={scanning || loading}
            variant="outline"
          >
            {scanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scansione...
              </>
            ) : (
              'Scansiona Database'
            )}
          </Button>

          {issues.length > 0 && (
            <Button
              onClick={fixAllLocations}
              disabled={loading || issues.length === fixed.length}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Correzione...
                </>
              ) : (
                `Correggi Tutti (${issues.length - fixed.length})`
              )}
            </Button>
          )}
        </div>

        {issues.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {issues.length} problemi trovati
              </span>
              <span className="text-muted-foreground">
                {fixed.length} corretti
              </span>
            </div>

            <ScrollArea className="h-[400px] rounded-md border">
              <div className="p-4 space-y-2">
                {issues.map((issue) => {
                  const isFixed = fixed.includes(issue.id);
                  
                  return (
                    <div
                      key={issue.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        isFixed ? 'bg-green-50 border-green-200' : 'bg-card'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-1">
                        {isFixed ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-orange-500" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {issue.name || 'Nome sconosciuto'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {issue.city || 'Città non specificata'}
                        </div>
                        <div className="text-xs text-orange-600 mt-1">
                          {issue.issue}
                        </div>
                      </div>

                      {!isFixed && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fixLocation(issue.id, issue.latitude, issue.longitude)}
                          disabled={loading}
                        >
                          Correggi
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {issues.length === 0 && !scanning && (
          <div className="text-center py-8 text-muted-foreground">
            Clicca "Scansiona Database" per cercare problemi
          </div>
        )}
      </CardContent>
    </Card>
  );
};
