import { useState } from 'react';
import LocationDetailDrawer from '@/components/home/LocationDetailDrawer';
import { supabase } from '@/integrations/supabase/client';

interface AiMessageContentProps {
  content: string;
}

export const AiMessageContent = ({ content }: AiMessageContentProps) => {
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handlePlaceClick = async (name: string, placeId: string) => {
    if (placeId === 'unknown') return;

    const isInternal = placeId.startsWith('internal:');
    const actualId = isInternal ? placeId.replace('internal:', '') : placeId;

    try {
      let locationData: any = null;

      if (isInternal) {
        // Fetch from locations table by internal ID
        const { data } = await supabase
          .from('locations')
          .select('*')
          .eq('id', actualId)
          .maybeSingle();
        locationData = data;
      } else {
        // Fallback: try matching by Google Place ID for older AI links
        const { data: byGoogleId } = await supabase
          .from('locations')
          .select('*')
          .eq('google_place_id', placeId)
          .maybeSingle();
        locationData = byGoogleId;
      }

      // Fallback: search by name if lookup by ID or Google Place ID failed
      if (!locationData) {
        const { data: byName } = await supabase
          .from('locations')
          .select('*')
          .ilike('name', name)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        locationData = byName;
      }

      if (locationData) {
        setSelectedLocation({
          id: locationData.id,
          name: locationData.name || name,
          category: locationData.category || 'restaurant',
          city: locationData.city,
          address: locationData.address,
          coordinates: {
            lat: Number(locationData.latitude || 0),
            lng: Number(locationData.longitude || 0),
          },
        });
      } else {
        // Minimal fallback
        setSelectedLocation({
          id: actualId,
          name,
          category: 'restaurant',
          city: null,
          coordinates: { lat: 0, lng: 0 },
        });
      }

      setDrawerOpen(true);
    } catch (error) {
      console.error('Error fetching location details (AI message):', error);
      setSelectedLocation({
        id: actualId,
        name,
        category: 'restaurant',
        city: null,
        coordinates: { lat: 0, lng: 0 },
      });
      setDrawerOpen(true);
    }
  };

  // Parse content and convert [PLACE:name|id] / [USER:username|id]
  const parseContent = (text: string) => {
    const parts: (string | JSX.Element)[] = [];
    const combined = /\[(PLACE|USER):([^\|]+)\|([^\]]+)\]/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyCounter = 0;

    while ((match = combined.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const type = match[1];
      const name = match[2];
      const id = match[3];

      if (type === 'PLACE' && id !== 'unknown') {
        parts.push(
          <button
            key={`place-${keyCounter++}`}
            onClick={() => handlePlaceClick(name, id)}
            className="text-primary underline decoration-primary/50 hover:decoration-primary transition-colors font-medium"
          >
            {name}
          </button>
        );
      } else if (type === 'USER') {
        // Username should be visible but NOT clickable
        parts.push(
          <span key={`user-${keyCounter++}`} className="text-foreground">
            @{name}
          </span>
        );
      } else {
        parts.push(name);
      }

      lastIndex = combined.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  return (
    <>
      <p className="text-sm whitespace-pre-wrap">
        {parseContent(content)}
      </p>

      <LocationDetailDrawer
        location={selectedLocation}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedLocation(null);
        }}
      />
    </>
  );
};
