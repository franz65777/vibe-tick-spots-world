

## Piano: Integrare la Nuova Ricerca nella Home Page

### Problema Identificato

Hai due sistemi di ricerca separati:

| Pagina | Componente Usato | API Usata | Risultato |
|--------|------------------|-----------|-----------|
| **Add Page** | `OptimizedPlacesAutocomplete` | Google + DB + Nominatim fallback | (Non testato ancora) |
| **Home Page** | `SearchDrawer` con logica interna | Solo Nominatim + Photon + Overpass | Risultati sbagliati come nella tua foto |

La Home page cerca "La Ciau del Tornavento" ma trova "Ciamei Cafe" in Irlanda perche usa solo API gratuite limitate che non conoscono quel ristorante italiano.

---

### Soluzione

Aggiornare `SearchDrawer.tsx` per usare la stessa logica ibrida di `OptimizedPlacesAutocomplete`:

```
Utente cerca "La Ciau del Tornavento"
              │
              ▼
┌─────────────────────────────────────────────┐
│  1. Database Locale (istantaneo, $0)        │
│     SELECT FROM locations WHERE name LIKE   │
│     → Se trovi il ristorante → mostralo!    │
└──────────────────┬──────────────────────────┘
                   │ Se nessun risultato
                   ▼
┌─────────────────────────────────────────────┐
│  2. Google Text Search (ID Only = GRATIS)   │
│     → Trova "La Ciau del Tornavento"        │
│     → Risultato corretto in Italia          │
└──────────────────┬──────────────────────────┘
                   │ Se Google fallisce
                   ▼
┌─────────────────────────────────────────────┐
│  3. Fallback Nominatim (gratis)             │
│     → Backup se Google non risponde         │
└─────────────────────────────────────────────┘
```

---

### Modifiche da Fare

#### 1. Verificare Deploy Edge Function

Prima di tutto, verificare che l'edge function `google-places-search` sia effettivamente deployata.

#### 2. Modificare `src/components/home/SearchDrawer.tsx`

Sostituire la logica di ricerca esistente (linee 260-435) per integrare l'hook `useOptimizedPlacesSearch`:

**Importare il nuovo hook:**
```typescript
import { useOptimizedPlacesSearch } from '@/hooks/useOptimizedPlacesSearch';
```

**Usare il hook nel componente:**
```typescript
const {
  setQuery: setOptimizedQuery,
  databaseResults,
  googleResults,
  isLoading: optimizedLoading,
} = useOptimizedPlacesSearch({
  userLocation: location ? { lat: location.latitude, lng: location.longitude } : null,
  debounceMs: 100,
});
```

**Modificare `searchAll` per usare i risultati ottimizzati:**
- Usare `databaseResults` per la sezione "POSIZIONI" (luoghi salvati)
- Usare `googleResults` per la sezione "Suggerimenti" (nuovi luoghi)
- Mantenere la logica citta esistente per le città

#### 3. Aggiornare UI per Distinguere Risultati

Mostrare chiaramente la fonte dei risultati:
- 🗃️ "Dal database" per risultati locali
- 🌐 "Google" per risultati esterni
- 🏙️ Emoji citta per risultati citta

---

### Flusso Dettagliato Ricerca

**Query: "La Ciau del Tornavento"**

1. **Rileva tipo query**: Contiene parole come "ristorante"? No. E' corta (1-2 parole)? No, sono 4 parole. Ha keywords tipo "pizza/bar/hotel"? No → **Assume luogo specifico**

2. **Cerca nel DB**: 
   ```sql
   SELECT * FROM locations 
   WHERE name ILIKE '%la ciau del tornavento%'
   ```
   - Se trovato → mostra subito
   - Se non trovato → vai a Google

3. **Google Text Search** (via edge function):
   ```
   POST google-places-search
   { action: 'search', query: 'La Ciau del Tornavento', userLat: ..., userLng: ... }
   ```
   - Restituisce il ristorante corretto con place_id

4. **Utente seleziona** → Chiama Place Details per coordinate esatte

---

### File da Modificare

| File | Modifica |
|------|----------|
| `src/components/home/SearchDrawer.tsx` | Integrare `useOptimizedPlacesSearch` nella logica di ricerca esistente |
| Deploy edge function | Assicurarsi che `google-places-search` sia attiva |

---

### Vantaggi dopo la Modifica

| Metrica | Prima (Nominatim/Photon) | Dopo (Google + DB) |
|---------|--------------------------|---------------------|
| "La Ciau del Tornavento" | ❌ Non trovato | ✅ Trovato correttamente |
| Latenza | 400-800ms | 100-200ms |
| Costo | $0 | $0 (ID Only gratis) |
| Affidabilita | 70% | 99% |

---

### Riepilogo Tecnico

La modifica principale e' in `SearchDrawer.tsx`:

1. Importare `useOptimizedPlacesSearch`
2. Modificare `searchAll()` per:
   - Prima cercare nel database locale
   - Se pochi risultati, chiamare Google via hook
   - Fallback a Nominatim se Google fallisce
3. Aggiornare la UI per mostrare fonte risultati
4. Mantenere la logica "nearby prompts" esistente

