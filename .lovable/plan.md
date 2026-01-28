
# Piano: Correzione Bug Dati Posizione + Redesign Card Luoghi nei Messaggi

## Panoramica

Due problemi principali da risolvere:

1. **BUG CRITICO**: Cliccando su una posizione condivisa nei messaggi, il PinDetailCard mostra dati errati (foto mancanti, stato salvataggio sbagliato)
2. **UI Design**: La card dei luoghi condivisi e troppo grande verticalmente e necessita di miglioramenti estetici

---

## Problema 1: Bug Dati Errati nel PinDetailCard

### Analisi Tecnica

Quando una posizione viene condivisa, i dati vengono salvati cosi:
```typescript
{
  name, category, address, city,
  google_place_id,  // Google Place ID
  place_id,         // Duplicato del google_place_id
  latitude, longitude,
  image_url, photos
}
```

Il bug si manifesta nella navigazione (MessagesPage linee 984-985):
```typescript
id: placeData.id || googlePlaceId,  // <-- PROBLEMA!
google_place_id: googlePlaceId,
```

**Se `placeData.id` e undefined**, viene usato `googlePlaceId` come `id`. Ma il PinDetailCard usa `place.id` per:
- `locationInteractionService.isLocationSaved(place.id)` - controlla stato salvataggio
- `locationInteractionService.isLocationLiked(place.id)` - controlla stato like
- Query sui posts con `location_id`

Il service `isLocationSaved` ha gia un fallback per gestire `google_place_id`, ma il problema e che viene passato un ID inconsistente.

### Soluzione

1. **Rimuovere il fallback problematico**: Non usare `googlePlaceId` come `id`
2. **Mantenere `id` vuoto se non disponibile**: PinDetailCard gestisce gia questo caso
3. **Aggiungere l'id interno dalla query originale**: La query su `user_saved_locations` gia restituisce `locations.id`

**Modifiche a `MessagesPage.tsx` (onViewPlace handler, linee 975-1001)**:

```typescript
onViewPlace={(placeData, otherUserId) => {
  const lat = placeData.latitude ?? placeData.coordinates?.lat ?? 0;
  const lng = placeData.longitude ?? placeData.coordinates?.lng ?? 0;
  const googlePlaceId = placeData.google_place_id || placeData.place_id || '';
  
  navigate('/', {
    state: {
      showLocationCard: true,
      locationData: {
        // IMPORTANTE: Usa solo l'ID interno se presente, altrimenti lascia che PinDetailCard lo risolva
        id: placeData.id && placeData.id !== googlePlaceId ? placeData.id : undefined,
        google_place_id: googlePlaceId,
        name: placeData.name || '',
        category: placeData.category || 'place',
        address: placeData.address || '',
        city: placeData.city || '',
        latitude: lat,
        longitude: lng,
        coordinates: { lat, lng },
        image_url: placeData.image_url || placeData.image || null,
        photos: placeData.photos || null
      },
      fromMessages: true,
      returnToUserId: otherUserId
    }
  });
}}
```

**Modifiche a `HomePage.tsx` (handling locationData, linee 237-270)**:

```typescript
if (state?.showLocationCard && state?.locationData) {
  const locData = state.locationData;
  
  // Se non abbiamo un ID interno ma abbiamo google_place_id, risolvi prima
  let internalId = locData.id;
  if (!internalId && locData.google_place_id) {
    // Il PinDetailCard risolve l'ID internamente, ma possiamo pre-risolvere qui
    const { data: locationRow } = await supabase
      .from('locations')
      .select('id')
      .eq('google_place_id', locData.google_place_id)
      .maybeSingle();
    
    if (locationRow) {
      internalId = locationRow.id;
    }
  }
  
  const placeToShow: Place = {
    id: internalId || locData.google_place_id || '', // Fallback a google_place_id per display
    google_place_id: locData.google_place_id,
    name: locData.name,
    // ... resto invariato
  };
  // ...
}
```

---

## Problema 2: Redesign PlaceMessageCard

### Requisiti
- Rimuovere icona categoria dalla foto (gia presente nel testo)
- Ridurre altezza verticale della card
- Rimuovere bottone "Vedi Posizione"
- Migliorare UI (cambiare lo sfondo bianco)

### Nuovo Design

Layout compatto e moderno:
- Foto orizzontale con aspect ratio 16:9 (ridotta da h-36 a h-24)
- Gradiente overlay sottile per leggibilita
- Padding ridotto
- Sfondo con leggero colore/blur invece di bianco puro
- Click su tutta la card per vedere la posizione

**Modifiche a `PlaceMessageCard.tsx`**:

```tsx
const PlaceMessageCard = ({ placeData, onViewPlace }: PlaceMessageCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const categoryImage = getCategoryImage(placeData.category);
  const thumbnail = getLocationThumbnail(placeData);
  
  const translatedCategory = t(`categories.${placeData.category}`, { 
    ns: 'common', 
    defaultValue: placeData.category || 'Place' 
  });

  const handleViewLocation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewPlace) {
      onViewPlace(placeData);
      return;
    }
    navigate('/', { 
      state: { 
        showLocationCard: true,
        locationData: placeData,
        fromMessages: true
      } 
    });
  };

  return (
    <div 
      onClick={handleViewLocation}
      className="bg-accent/40 backdrop-blur-sm rounded-2xl overflow-hidden cursor-pointer 
                 hover:bg-accent/60 transition-all duration-200 active:scale-[0.98] max-w-[260px]"
    >
      {/* Foto compatta */}
      <div className="relative w-full h-24 bg-muted overflow-hidden">
        {thumbnail ? (
          <>
            <img 
              src={thumbnail} 
              alt={placeData.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <img 
              src={categoryImage} 
              alt={placeData.category}
              className="w-12 h-12 object-contain opacity-70"
            />
          </div>
        )}
      </div>
      
      {/* Info compatte */}
      <div className="p-2.5">
        <h4 className="font-semibold text-sm text-foreground leading-tight line-clamp-1">
          {placeData.name}
        </h4>
        
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
          {(placeData.city || placeData.address || placeData.coordinates) && (
            <span className="truncate">
              <CityLabel 
                id={placeData.google_place_id || placeData.id}
                city={placeData.city}
                address={placeData.address}
                coordinates={placeData.coordinates}
              />
            </span>
          )}
          <span className="text-muted-foreground/50">•</span>
          <span className="capitalize shrink-0">{translatedCategory}</span>
        </div>
      </div>
    </div>
  );
};
```

### Differenze Chiave

| Elemento | Prima | Dopo |
|----------|-------|------|
| Altezza foto | h-36 (144px) | h-24 (96px) |
| Badge categoria su foto | Si | Rimosso |
| Bottone "Vedi Posizione" | Si | Rimosso |
| Sfondo card | bg-card (bianco) | bg-accent/40 backdrop-blur |
| Padding contenuto | p-3.5 | p-2.5 |
| Linee nome | line-clamp-2 | line-clamp-1 |
| Larghezza max | 280px | 260px |
| Margine citta-categoria | mb-3 | mt-0.5 |

---

## File da Modificare

| File | Modifica |
|------|----------|
| `src/pages/MessagesPage.tsx` | Fix onViewPlace handler per passare dati corretti |
| `src/components/HomePage.tsx` | Pre-risolvere internal ID da google_place_id |
| `src/components/messages/PlaceMessageCard.tsx` | Redesign completo della card |

---

## Risultato Atteso

1. **Bug Risolto**: Cliccando su una posizione condivisa, il PinDetailCard mostrera:
   - Foto corrette (business o Google)
   - Stato salvataggio corretto
   - Post e recensioni della location giusta

2. **UI Migliorata**: Card compatta con:
   - Altezza ridotta del 40%
   - Sfondo elegante semi-trasparente
   - Nessun bottone ridondante
   - Click su tutta la card per navigare
