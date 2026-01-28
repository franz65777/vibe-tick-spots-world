
## Piano: Fix Search Bar Border e Dropdown UI

### Problemi Identificati

1. **Cerchio bianco attorno alla search bar**: L'Input component ha `rounded-2xl border border-input` e `focus-visible:ring-2` come stili di default. Gli override CSS con `[&_input]` non funzionano completamente perché l'Input usa `cn()` per merge delle classi.

2. **Dropdown non usa tutto lo spazio orizzontale**: I risultati hanno padding eccessivo (px-4) e margini.

3. **Icone troppo grandi**: Attualmente `w-14 h-14` (56px), dovrebbe essere più piccolo.

4. **Seconda riga mostra categoria invece di indirizzo**: Deve mostrare l'indirizzo.

5. **Immagini dal database non usate**: I risultati dal database hanno `image_url` (business account) e `photos[]` disponibili ma non vengono mostrati.

---

### Modifiche Tecniche

#### 1. Rimuovere il cerchio bianco dall'Input

**File**: `src/components/OptimizedPlacesAutocomplete.tsx`

Passare direttamente le classi override all'Input invece di usare i child selectors:

```typescript
<Input
  ...
  className="pr-10 !border-none !ring-0 !ring-offset-0 !shadow-none !outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0"
/>
```

Oppure usare `style` prop per forzare:
```typescript
style={{ border: 'none', boxShadow: 'none', outline: 'none' }}
```

#### 2. Aggiornare SearchResult per includere immagini

**File**: `src/hooks/useOptimizedPlacesSearch.ts`

Aggiungere `image_url` e `photos` alla query del database:

```typescript
const { data: locations } = await supabase
  .from('locations')
  .select('id, name, address, city, latitude, longitude, category, google_place_id, image_url, photos')
  ...
```

E al tipo `SearchResult`:
```typescript
export interface SearchResult {
  ...
  image_url?: string;    // Business account image (priority)
  photos?: string[];     // User photos array
}
```

#### 3. Ridisegnare il Dropdown

**File**: `src/components/OptimizedPlacesAutocomplete.tsx`

```typescript
{/* Results dropdown - Full width rows */}
{showResults && hasResults && (
  <div className="absolute z-50 w-full left-0 right-0 mt-4 max-h-[70vh] overflow-y-auto scrollbar-hide">
    {allResults.map((result, index) => {
      // Priorità immagine: 1. Business (image_url), 2. Prima foto (photos[0]), 3. Categoria icon
      const displayImage = result.image_url 
        || (result.photos && result.photos[0]) 
        || getCategoryImage(result.category || 'restaurant');
      const isRealPhoto = result.image_url || (result.photos && result.photos.length > 0);
      
      return (
        <button
          key={result.id}
          onClick={() => handleSelect(result)}
          className={`w-full px-3 py-3 flex items-center gap-3 hover:bg-white/40 dark:hover:bg-white/10 
                     active:bg-white/60 dark:active:bg-white/20 transition-colors text-left
                     border-b border-black/5 dark:border-white/10 ${
            selectedIndex === index ? 'bg-white/30 dark:bg-white/10' : ''
          }`}
        >
          {/* Image - Smaller (40px), square with rounded corners */}
          <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-muted/20">
            <img 
              src={displayImage}
              alt={result.category || 'place'}
              className={`w-full h-full ${isRealPhoto ? 'object-cover' : 'object-contain p-1'}`}
              loading="eager"
            />
          </div>
          
          {/* Content - Name and ADDRESS */}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base text-foreground truncate">
              {result.name}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {result.address || result.city || ''}
            </div>
          </div>
        </button>
      );
    })}
  </div>
)}
```

---

### Modifiche Dettagliate

| Aspetto | Prima | Dopo |
|---------|-------|------|
| Search bar border | Cerchio bianco visibile | Nessun bordo (stile forzato) |
| Icona dimensione | `w-14 h-14` (56px) | `w-10 h-10` (40px) |
| Seconda riga | Categoria | Indirizzo |
| Immagine fonte | Solo categoria icon | Business image → Foto → Icon |
| Padding riga | `px-4 py-3.5` | `px-3 py-3` |

---

### File da Modificare

| File | Modifica |
|------|----------|
| `src/hooks/useOptimizedPlacesSearch.ts` | Aggiungere `image_url, photos` alla select e al tipo |
| `src/components/OptimizedPlacesAutocomplete.tsx` | Input senza bordo, dropdown compatto, mostra indirizzo |

---

### Risultato Atteso

1. Search bar completamente nera senza cerchio/bordo bianco
2. Ogni riga usa tutto lo spazio orizzontale disponibile
3. Icone più piccole (40px)
4. Mostra foto reale del locale se disponibile (business > user photos > icon)
5. Seconda riga mostra l'indirizzo invece della categoria
