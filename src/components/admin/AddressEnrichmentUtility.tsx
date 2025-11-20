import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MapPin, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

/**
 * Admin utility to batch enrich locations with complete address data
 * (city, street name, house number)
 */
export const AddressEnrichmentUtility = () => {
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichedCount, setEnrichedCount] = useState(0);

  const handleBatchEnrich = async () => {
    setIsEnriching(true);
    setEnrichedCount(0);

    try {
      // Get locations missing city or address
      const { data: locations, error } = await supabase
        .from('locations')
        .select('id, name, city, address, latitude, longitude')
        .or('city.is.null,address.is.null')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(50);

      if (error) {
        throw error;
      }

      if (!locations || locations.length === 0) {
        toast.success('Tutti i luoghi hanno già dati di indirizzo completi!');
        return;
      }

      toast.info(`Inizio arricchimento per ${locations.length} luoghi...`);

      for (const location of locations) {
        if (!location.latitude || !location.longitude) continue;

        try {
          // Call reverse geocode function
          const { data, error: geocodeError } = await supabase.functions.invoke('reverse-geocode', {
            body: {
              latitude: location.latitude,
              longitude: location.longitude
            }
          });

          if (geocodeError || !data) {
            console.error(`Error geocoding ${location.name}:`, geocodeError);
            continue;
          }

          // Update location with enriched data
          const updates: any = {};
          
          if (!location.city && data.city) {
            updates.city = data.city;
          }
          
          if (!location.address && data.formatted_address) {
            updates.address = data.formatted_address;
          }

          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from('locations')
              .update(updates)
              .eq('id', location.id);

            if (!updateError) {
              setEnrichedCount(prev => prev + 1);
              console.log(`✅ Enriched ${location.name}:`, updates);
            }
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1100));
        } catch (err) {
          console.error(`Error processing ${location.name}:`, err);
        }
      }

      toast.success(`${enrichedCount} luoghi arricchiti con successo!`);
    } catch (error: any) {
      console.error('Batch enrichment error:', error);
      toast.error(error?.message || 'Impossibile arricchire i luoghi');
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <Card className="rounded-xl border-none shadow-sm">
      <CardHeader className="border-b-0">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Arricchimento Indirizzi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-6">
        <div className="text-sm text-muted-foreground">
          Trova luoghi con dati di città o indirizzo mancanti e li arricchisce usando geocoding inverso.
        </div>
        
        {enrichedCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span>{enrichedCount} luoghi arricchiti</span>
          </div>
        )}

        <Button
          onClick={handleBatchEnrich}
          disabled={isEnriching}
          className="w-full rounded-full"
        >
          {isEnriching ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Arricchimento in corso...
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 mr-2" />
              Inizia Arricchimento
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
