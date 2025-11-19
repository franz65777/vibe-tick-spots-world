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
      // Fetch full location data from database so the drawer has coords, address, etc.
      let locationData: any = null;

      if (isInternal) {
        // Internal location by ID
        const { data } = await supabase
          .from('locations')
          .select('*')
          .eq('id', actualId)
          .maybeSingle();
        locationData = data;
      } else {
        // External location by google_place_id
        const { data } = await supabase
          .from('locations')
          .select('*')
          .eq('google_place_id', actualId)
          .maybeSingle();

        if (data) {
          locationData = data;
        } else {
          // Fallback: use saved_places entry if it exists
          const { data: savedPlace } = await supabase
            .from('saved_places')
            .select('*')
            .eq('place_id', actualId)
            .limit(1)
            .maybeSingle();

          if (savedPlace) {
            const rawCoords = savedPlace.coordinates;
            let lat = 0;
            let lng = 0;

            if (Array.isArray(rawCoords) && rawCoords.length >= 2) {
              lat = Number(rawCoords[0] ?? 0);
              lng = Number(rawCoords[1] ?? 0);
            } else if (rawCoords && typeof rawCoords === 'object') {
              lat = Number((rawCoords as any).lat ?? (rawCoords as any).latitude ?? 0);
              lng = Number((rawCoords as any).lng ?? (rawCoords as any).longitude ?? 0);
            }

            locationData = {
              google_place_id: savedPlace.place_id,
              name: savedPlace.place_name,
              category: savedPlace.place_category,
              city: savedPlace.city,
              address: null,
              latitude: lat,
              longitude: lng,
            };
          } else {
            // Final fallback: try to resolve by name if the AI used an outdated place_id
            const { data: byName } = await supabase
              .from('locations')
              .select('*')
              .ilike('name', name)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (byName) {
              locationData = byName;
            }
          }
        }
      }

      if (locationData) {
        setSelectedLocation({
          place_id: isInternal ? undefined : (locationData.google_place_id || actualId),
          id: isInternal ? actualId : locationData.id,
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
          place_id: isInternal ? undefined : actualId,
          id: isInternal ? actualId : undefined,
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
        place_id: isInternal ? undefined : actualId,
        id: isInternal ? actualId : undefined,
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
