import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Wrench, ChevronDown, Loader2, MapPin, Tag, Trash2 } from 'lucide-react';

export const AdminToolsSection = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFixingCities, setIsFixingCities] = useState(false);
  const [isFixingCategories, setIsFixingCategories] = useState(false);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);

  const handleFixCities = async () => {
    setIsFixingCities(true);
    try {
      const { data, error } = await supabase.functions.invoke('reverse-geocode', {
        body: { 
          batchMode: true,
          latitude: 0,
          longitude: 0
        }
      });

      if (error) throw error;

      toast.success('Nomi città aggiornati!', {
        description: data?.message || 'Le location sono state aggiornate'
      });
    } catch (error) {
      console.error('Error fixing cities:', error);
      toast.error('Errore aggiornamento città', {
        description: (error as Error).message
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

      toast.success('Categorie normalizzate!', {
        description: data?.message || 'Le categorie sono state aggiornate'
      });
    } catch (error) {
      console.error('Error fixing categories:', error);
      toast.error('Errore normalizzazione categorie', {
        description: (error as Error).message
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

      const message = data?.postsMigrated || data?.reviewsMigrated
        ? `${data.merged} duplicati uniti. Migrati ${data.postsMigrated || 0} post e ${data.reviewsMigrated || 0} recensioni.`
        : 'Duplicati uniti con successo';

      toast.success('Pulizia completata!', {
        description: message,
      });
    } catch (error) {
      console.error('Error cleaning duplicates:', error);
      toast.error('Errore pulizia duplicati', {
        description: (error as Error).message,
      });
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  const tools = [
    {
      id: 'cities',
      icon: MapPin,
      title: 'Popola Nomi Città',
      description: 'Geocoding inverso per città mancanti',
      action: handleFixCities,
      loading: isFixingCities,
      variant: 'default' as const,
    },
    {
      id: 'categories',
      icon: Tag,
      title: 'Normalizza Categorie',
      description: 'Corregge categorie da place_types',
      action: handleFixCategories,
      loading: isFixingCategories,
      variant: 'default' as const,
    },
    {
      id: 'duplicates',
      icon: Trash2,
      title: 'Pulisci Duplicati',
      description: 'Rimuove voci duplicate',
      action: handleCleanDuplicates,
      loading: isCleaningDuplicates,
      variant: 'destructive' as const,
    },
  ];

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wrench className="w-5 h-5 text-muted-foreground" />
                Strumenti Manutenzione
              </CardTitle>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-2">
            {tools.map((tool) => (
              <div 
                key={tool.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <tool.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{tool.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{tool.description}</p>
                  </div>
                </div>
                <Button 
                  onClick={tool.action} 
                  disabled={tool.loading}
                  size="sm"
                  variant={tool.variant}
                  className="rounded-full ml-2 flex-shrink-0"
                >
                  {tool.loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Esegui'
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
