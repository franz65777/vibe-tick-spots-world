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
        toast.success('All locations already have complete address data!');
        return;
      }

      toast.info(`Starting enrichment for ${locations.length} locations...`);

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

      toast.success(`Successfully enriched ${enrichedCount} locations!`);
    } catch (error: any) {
      console.error('Batch enrichment error:', error);
      toast.error(error?.message || 'Failed to enrich locations');
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Address Enrichment
        </CardTitle>
        <CardDescription>
          Batch update locations with complete address information (city, street, number)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          This will find locations missing city or address data and enrich them using reverse geocoding.
        </div>
        
        {enrichedCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span>{enrichedCount} locations enriched</span>
          </div>
        )}

        <Button
          onClick={handleBatchEnrich}
          disabled={isEnriching}
          className="w-full"
        >
          {isEnriching ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enriching locations...
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 mr-2" />
              Start Batch Enrichment
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
