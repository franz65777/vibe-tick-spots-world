import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { MapPin, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const CityBackfillUtility = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ total: 0, processed: 0, updated: 0 });
  const { toast } = useToast();

  const backfillCities = async () => {
    setIsRunning(true);
    setProgress({ total: 0, processed: 0, updated: 0 });

    try {
      // Get all saved_places with missing or Unknown city but with coordinates
      const { data: places, error } = await supabase
        .from('saved_places')
        .select('id, place_id, place_name, city, coordinates')
        .or('city.is.null,city.eq.Unknown,city.eq.')
        .not('coordinates', 'is', null);

      if (error) throw error;

      if (!places || places.length === 0) {
        toast({
          title: "No places to backfill",
          description: "All saved places already have city information.",
        });
        setIsRunning(false);
        return;
      }

      setProgress(prev => ({ ...prev, total: places.length }));

      let updated = 0;
      for (const place of places) {
        const coords = place.coordinates as any;
        if (!coords?.lat || !coords?.lng) {
          setProgress(prev => ({ ...prev, processed: prev.processed + 1 }));
          continue;
        }

        try {
          // Call reverse geocoding edge function
          const { data, error: geocodeError } = await supabase.functions.invoke('reverse-geocode', {
            body: {
              lat: coords.lat,
              lng: coords.lng,
              savedPlaceId: place.id
            }
          });

          if (!geocodeError && data?.city) {
            updated++;
            console.log(`✅ Updated ${place.place_name} -> ${data.city}`);
          }

          // Rate limiting - wait 100ms between requests
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
          console.warn(`Failed to geocode ${place.place_name}:`, e);
        }

        setProgress(prev => ({ ...prev, processed: prev.processed + 1, updated }));
      }

      toast({
        title: "Backfill complete!",
        description: `Updated ${updated} out of ${places.length} places.`,
      });

    } catch (error) {
      console.error('Backfill error:', error);
      toast({
        title: "Backfill failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="bg-blue-50 rounded-full p-2">
          <MapPin className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900">City Backfill Utility</h3>
          <p className="text-sm text-gray-600 mt-1">
            Fix saved places with missing or unknown city names by reverse geocoding their coordinates.
          </p>
        </div>
      </div>

      {isRunning && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Processing...</span>
          </div>
          <div className="space-y-1 text-sm text-blue-800">
            <div>Total: {progress.total}</div>
            <div>Processed: {progress.processed}</div>
            <div>Updated: {progress.updated}</div>
          </div>
          <div className="mt-3 bg-blue-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${progress.total > 0 ? (progress.processed / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600" />
        <p className="text-xs text-gray-600">
          This will process all places with missing city data. Rate limited to prevent API throttling.
        </p>
      </div>

      <Button
        onClick={backfillCities}
        disabled={isRunning}
        className="w-full"
      >
        {isRunning ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Running Backfill...
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Run City Backfill
          </>
        )}
      </Button>
    </div>
  );
};
