
## Piano: Unificare la Ricerca Add Page con Home Page

### Problema Identificato

1. **Ricerca inconsistente**: "Osteria da Gemma" viene trovata nella home page ma non nell'Add page
   - L'hook `useOptimizedPlacesSearch` usa `isCitySearch()` che classifica erroneamente "osteria da gemma" come ricerca di città (3 parole, nessuna keyword)
   - Viene usato Nominatim (fallback) invece di Google Text Search

2. **Categorie non filtrate**: L'Add page mostra locations fuori dalle 10 categorie consentite (restaurant, bar, cafe, bakery, hotel, museum, entertainment, park, historical, nightclub)

3. **UI dropdown brutta**: Il dropdown attuale usa icone piccole e stile diverso dalla home page

---

### Soluzione

Replicare la logica di ricerca della Home page (`SearchDrawer`) nell'Add page, rimuovendo le città e migliorando la UI.

---

### Modifiche Tecniche

#### 1. Rimuovere la logica `isCitySearch` e usare sempre Google

**File**: `src/hooks/useOptimizedPlacesSearch.ts`

Il problema è che `isCitySearch()` classifica "osteria da gemma" come città. La soluzione è:
- Rimuovere la detection city/place
- Usare sempre la stessa strategia: DB first → Google Text Search → Nominatim fallback
- Filtrare i risultati Google per escludere città e categorie non consentite

```typescript
// RIMUOVERE la funzione isCitySearch() e la logica di branching

// MODIFICARE performSearch per:
// 1. Cercare sempre nel database
// 2. Chiamare sempre Google Text Search se db ha pochi risultati
// 3. Fallback a Nominatim solo se Google fallisce
// 4. Filtrare città e categorie non consentite
```

#### 2. Aggiungere filtro categorie consentite

**File**: `src/hooks/useOptimizedPlacesSearch.ts`

Importare e usare `isAllowedNominatimType` e `mapGooglePlaceTypeToCategory`:

```typescript
import { 
  isAllowedNominatimType, 
  mapGooglePlaceTypeToCategory,
  isAllowedCategory 
} from '@/utils/allowedCategories';

// Filtrare risultati Google per categorie consentite
const filteredGoogleResults = results.filter((place: any) => {
  // Escludere città
  if (place.types?.some((t: string) => ['locality', 'administrative_area_level_3'].includes(t))) {
    return false;
  }
  // Verificare categoria consentita
  const category = mapGooglePlaceTypeToCategory(place.types || []);
  return isAllowedCategory(category);
});

// Filtrare risultati Nominatim
const filteredNominatimResults = results.filter(r => {
  if (['city', 'town', 'village'].includes(r.type || '')) return false;
  return isAllowedNominatimType(r.type, r.class);
});
```

#### 3. Ridisegnare il dropdown con stile Home Page

**File**: `src/components/OptimizedPlacesAutocomplete.tsx`

Usare le stesse dimensioni e 3D icons della home page:

```typescript
import { getCategoryImage } from '@/utils/categoryIcons';

// Nel dropdown:
<button className="w-full px-4 py-3 flex items-center gap-3 bg-muted/30 
                   hover:bg-muted/50 transition-colors rounded-xl text-left">
  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center 
                  justify-center flex-shrink-0">
    <img 
      src={getCategoryImage(result.category || 'restaurant')} 
      alt={result.category} 
      className="w-8 h-8 object-contain" 
    />
  </div>
  <div className="flex-1 min-w-0">
    <div className="font-medium text-foreground truncate">{result.name}</div>
    <div className="text-sm text-muted-foreground truncate">{result.address}</div>
  </div>
</button>
```

#### 4. Nascondere hero content quando ci sono risultati

**File**: `src/components/add/AddPageOverlay.tsx`

Passare lo stato `hasResults` e `isSearching` al componente per nascondere l'hero:

```typescript
// Aggiungere stato per tracciare se ci sono risultati
const [hasSearchResults, setHasSearchResults] = useState(false);

// Passare callback a OptimizedPlacesAutocomplete
<OptimizedPlacesAutocomplete
  onResultsChange={(hasResults, isSearching) => {
    setHasSearchResults(hasResults && isSearching);
  }}
  ...
/>

// Nascondere hero quando ci sono risultati
{!hasSearchResults && (
  <div className="flex-1 overflow-y-auto">
    {/* Hero content */}
  </div>
)}
```

---

### UI Comparison

| Aspetto | Prima (Add) | Dopo (Unificato) |
|---------|-------------|------------------|
| Icone | 36px, Lucide icons | 48px, 3D images |
| Stile risultato | `bg-accent/50` hover | `bg-muted/30` con `rounded-xl` |
| Sezioni | "Salvati" / "Suggerimenti" | "POSIZIONI" (unica lista) |
| Hero visibility | Sempre visibile | Nascosto durante ricerca |
| No results | Overlay su hero | Messaggio centrato pulito |

---

### File da Modificare

| File | Modifica |
|------|----------|
| `src/hooks/useOptimizedPlacesSearch.ts` | Rimuovere `isCitySearch`, usare sempre Google, filtrare categorie |
| `src/components/OptimizedPlacesAutocomplete.tsx` | UI dropdown come home, callback per risultati |
| `src/components/add/AddPageOverlay.tsx` | Nascondere hero durante ricerca attiva |

---

### Risultato Atteso

1. "Osteria da Gemma" sarà trovata nell'Add page esattamente come nella Home page
2. Solo locations nelle 10 categorie consentite saranno mostrate
3. Nessuna città nei risultati dell'Add page
4. Dropdown con stile identico alla Home page (icone 3D, rounded-xl, spacing corretto)
5. Hero content nascosto durante la ricerca per non interferire con i risultati
