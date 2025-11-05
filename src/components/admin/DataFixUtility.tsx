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
        body: { batchMode: true }
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
      // Delete bad location entries with invalid data
      const badLocationIds = ['cc443454-664b-4706-a50e-bf5e8bde2523', 'd035a816-2e21-4ea8-82a5-827f5a655a12'];
      
      // First delete user_saved_locations references
      const { error: savedError } = await supabase
        .from('user_saved_locations')
        .delete()
        .in('location_id', badLocationIds);
      
      if (savedError) throw savedError;
      
      // Delete the bad locations
      const { error: locError } = await supabase
        .from('locations')
        .delete()
        .in('id', badLocationIds);
      
      if (locError) throw locError;
      
      toast.success('Duplicate locations cleaned!', {
        description: 'Removed 2 invalid duplicate entries (B Bar and Brownes of Sandymount)'
      });
    } catch (error) {
      console.error('Error cleaning duplicates:', error);
      toast.error('Failed to clean duplicates', {
        description: error.message
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location Data Fixes
          </CardTitle>
          <CardDescription>
            Run maintenance tasks to clean up location data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">Populate City Names</h4>
              <p className="text-xs text-muted-foreground">
                Uses reverse geocoding to fill missing city names from coordinates
              </p>
            </div>
            <Button 
              onClick={handleFixCities} 
              disabled={isFixingCities}
              size="sm"
            >
              {isFixingCities ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Fixing...
                </>
              ) : (
                'Fix Cities'
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">Normalize Categories</h4>
              <p className="text-xs text-muted-foreground">
                Corrects categories based on place_types data (e.g., cafe vs restaurant)
              </p>
            </div>
            <Button 
              onClick={handleFixCategories} 
              disabled={isFixingCategories}
              size="sm"
            >
              {isFixingCategories ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Fixing...
                </>
              ) : (
                'Fix Categories'
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">Clean Duplicate Locations</h4>
              <p className="text-xs text-muted-foreground">
                Removes invalid duplicate entries with missing coordinates and wrong Google Place IDs
              </p>
            </div>
            <Button 
              onClick={handleCleanDuplicates} 
              disabled={isCleaningDuplicates}
              size="sm"
              variant="destructive"
            >
              {isCleaningDuplicates ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cleaning...
                </>
              ) : (
                'Clean Duplicates'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataFixUtility;
