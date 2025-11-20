import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, Tag, Loader2 } from 'lucide-react';
import { AddressEnrichmentUtility } from './AddressEnrichmentUtility';
import { LocationDataFix } from './LocationDataFix';

const DataFixUtility = () => {
  const [isFixingCities, setIsFixingCities] = useState(false);
  const [isFixingCategories, setIsFixingCategories] = useState(false);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);

  const handleFixCities = async () => {
    setIsFixingCities(true);
    try {
      const { data, error } = await supabase.functions.invoke('reverse-geocode', {
        body: { 
          batchMode: true,
          // Dummy coordinates required by schema but not used in batch mode
          latitude: 0,
          longitude: 0
        }
      });

      if (error) throw error;

      toast.success('City names updated successfully!', {
        description: data?.message || 'Locations have been updated with city names'
      });
    } catch (error) {
      console.error('Error fixing cities:', error);
      toast.error('Failed to update city names', {
        description: error.message
      });
    } finally {
      setIsFixingCities(false);
    }
  };

  const handleFixCategories = async () => {
    setIsFixingCategories(true);
    try {
      const { data, error } = await supabase.functions.invoke('fix-categories');

      if (error) throw error;

      toast.success('Categories updated successfully!', {
        description: data?.message || 'Location categories have been normalized'
      });
    } catch (error) {
      console.error('Error fixing categories:', error);
      toast.error('Failed to update categories', {
        description: error.message
      });
    } finally {
      setIsFixingCategories(false);
    }
  };

  const handleCleanDuplicates = async () => {
    setIsCleaningDuplicates(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-duplicate-locations');

      if (error) throw error;

      toast.success('Duplicate locations merged!', {
        description: data?.message || 'Nearby locations with identical coordinates have been merged into a single location',
      });
    } catch (error) {
      console.error('Error cleaning duplicates:', error);
      toast.error('Failed to merge duplicates', {
        description: (error as Error).message,
      });
    } finally {
      setIsCleaningDuplicates(false);
    }
  };
  return (
    <div className="space-y-4">
      {/* Location Data Fix Utility */}
      <LocationDataFix />
      
      {/* Address Enrichment Utility */}
      <AddressEnrichmentUtility />
      
      <Card>
        <CardHeader className="border-b-0">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Admin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-6">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">Popola Nomi Città</h4>
              <p className="text-xs text-muted-foreground">
                Usa geocoding inverso per riempire i nomi delle città mancanti dalle coordinate
              </p>
            </div>
            <Button 
              onClick={handleFixCities} 
              disabled={isFixingCities}
              size="sm"
              className="rounded-full"
            >
              {isFixingCities ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Correzione...
                </>
              ) : (
                'Correggi Città'
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">Normalizza Categorie</h4>
              <p className="text-xs text-muted-foreground">
                Corregge le categorie in base ai dati place_types (es. cafe vs restaurant)
              </p>
            </div>
            <Button 
              onClick={handleFixCategories} 
              disabled={isFixingCategories}
              size="sm"
              className="rounded-full"
            >
              {isFixingCategories ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Correzione...
                </>
              ) : (
                'Correggi Categorie'
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">Pulisci Luoghi Duplicati</h4>
              <p className="text-xs text-muted-foreground">
                Rimuove voci duplicate non valide con coordinate mancanti e Google Place ID errati
              </p>
            </div>
            <Button 
              onClick={handleCleanDuplicates} 
              disabled={isCleaningDuplicates}
              size="sm"
              variant="destructive"
              className="rounded-full"
            >
              {isCleaningDuplicates ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Pulizia...
                </>
              ) : (
                'Pulisci Duplicati'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataFixUtility;
