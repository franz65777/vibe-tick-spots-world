import { useState } from 'react';
import LocationDetailDrawer from '@/components/home/LocationDetailDrawer';

interface AiMessageContentProps {
  content: string;
}

export const AiMessageContent = ({ content }: AiMessageContentProps) => {
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Parse content and convert [PLACE:name|id] to clickable links
  const parseContent = (text: string) => {
    const parts: (string | JSX.Element)[] = [];
    const regex = /\[PLACE:([^\|]+)\|([^\]]+)\]/g;
    let lastIndex = 0;
    let match;
    let keyCounter = 0;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const placeName = match[1];
      const placeId = match[2];

      // Add clickable place name (only if not unknown)
      if (placeId !== 'unknown') {
        parts.push(
          <button
            key={`place-${keyCounter++}`}
            onClick={() => handlePlaceClick(placeName, placeId)}
            className="text-primary underline decoration-primary/50 hover:decoration-primary transition-colors font-medium"
          >
            {placeName}
          </button>
        );
      } else {
        // Just add plain text for unknown places
        parts.push(placeName);
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  const handlePlaceClick = async (name: string, placeId: string) => {
    console.log('Place clicked:', name, placeId);
    
    // Check if place exists in database
    if (placeId === 'unknown') {
      console.log('Place not in database');
      return; // Don't open drawer for unknown places
    }
    
    // Determine if it's a Google Place or internal location
    const isInternal = placeId.startsWith('internal:');
    const actualId = isInternal ? placeId.replace('internal:', '') : placeId;

    // Create a basic location object for the drawer
    // The drawer will fetch the full details
    const location = {
      place_id: actualId,
      name: name,
      category: 'restaurant', // Default, will be updated by drawer
      city: null,
      coordinates: {
        lat: 0,
        lng: 0
      }
    };

    setSelectedLocation(location);
    setDrawerOpen(true);
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
