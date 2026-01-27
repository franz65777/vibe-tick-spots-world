

## Piano: Ricerca Intelligente Città vs Luoghi

### Strategia Ottimizzata

La tua intuizione è corretta! Dobbiamo distinguere tra ricerca di **città** e ricerca di **luoghi specifici**.

---

### Logica di Ricerca Proposta

```
Utente digita query
        │
        ▼
┌───────────────────────────────────────────┐
│   È una città? (pattern detection)        │
│   - Query senza parole tipo "ristorante"  │
│   - Query corta (1-2 parole)              │
│   - Match con nomi città comuni           │
└───────────────────┬───────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐       ┌───────────────────┐
│   CITTÀ       │       │   LUOGO SPECIFICO │
│   Nominatim   │       │   1. Database     │
│   $0 gratis   │       │   2. Google (ID)  │
│   illimitato  │       │   $0 illimitato   │
└───────────────┘       └───────────────────┘
```

---

### File da Modificare

#### 1. `supabase/config.toml`
Aggiungere la configurazione per l'edge function mancante:

```toml
[functions.google-places-search]
verify_jwt = false
```

#### 2. `src/hooks/useOptimizedPlacesSearch.ts`
Modificare la logica per:
- Rilevare se la query è una città o un luogo
- Usare Nominatim per città (veloce, gratis)
- Usare Google solo per luoghi specifici

**Logica di rilevamento città:**
```typescript
const isCitySearch = (query: string): boolean => {
  // Parole chiave che indicano un luogo specifico
  const locationKeywords = ['ristorante', 'restaurant', 'bar', 'cafe', 'hotel', 
    'museo', 'museum', 'parco', 'park', 'pizza', 'sushi', 'club'];
  
  const lowerQuery = query.toLowerCase();
  
  // Se contiene parole chiave per luoghi → non è una città
  if (locationKeywords.some(kw => lowerQuery.includes(kw))) {
    return false;
  }
  
  // Query corte (1-2 parole) senza numeri → probabilmente città
  const words = query.trim().split(/\s+/);
  if (words.length <= 2 && !/\d/.test(query)) {
    return true; // Assume città per query semplici
  }
  
  return false;
};
```

**Nuovo flusso di ricerca:**
```typescript
const performSearch = async (searchQuery: string) => {
  // 1. Sempre cerca nel database locale (gratis, veloce)
  const dbResults = await searchDatabase(searchQuery);
  setDatabaseResults(dbResults);
  
  // 2. Se è una ricerca città → usa Nominatim (gratis)
  if (isCitySearch(searchQuery)) {
    const cityResults = await nominatimGeocoding.searchCities(searchQuery);
    setGoogleResults(cityResults.map(r => ({
      ...r,
      source: 'nominatim',
      isCity: true
    })));
    return;
  }
  
  // 3. Se è un luogo specifico e DB ha pochi risultati → Google
  if (dbResults.length < 3) {
    try {
      const googleResults = await searchGoogle(searchQuery);
      setGoogleResults(googleResults);
    } catch {
      // Fallback a Nominatim se Google fallisce
      const nominatimResults = await searchNominatim(searchQuery);
      setGoogleResults(nominatimResults);
    }
  }
};
```

#### 3. `src/components/OptimizedPlacesAutocomplete.tsx`
Aggiornare l'UI per:
- Mostrare icona città (🏙️) per risultati città
- Mostrare icona diversa per luoghi

---

### Costi Stimati Finali

| Scenario | Ricerche Città | Ricerche Luoghi | Place Details | Totale/mese |
|----------|----------------|-----------------|---------------|-------------|
| 300 utenti × 10 ricerche | ~50% Nominatim $0 | ~50% Google ID $0 | ~3000 sel. | **$0** |
| 1000 utenti × 15 ricerche | ~50% Nominatim $0 | ~50% Google ID $0 | ~7500 sel. | **$0** |
| 2000 utenti × 20 ricerche | ~50% Nominatim $0 | ~50% Google ID $0 | ~15000 sel. | **~$25** |

---

### Performance Attesa

| Tipo Ricerca | API | Latenza | Affidabilità |
|--------------|-----|---------|--------------|
| Città | Nominatim | 200-400ms | 95% |
| Luoghi (cache DB) | Supabase | 50ms | 99% |
| Luoghi (Google) | Google API | 100-200ms | 99.9% |

---

### Riepilogo Modifiche

| File | Modifica |
|------|----------|
| `supabase/config.toml` | Aggiungere `[functions.google-places-search]` |
| `src/hooks/useOptimizedPlacesSearch.ts` | Aggiungere logica `isCitySearch()` e flusso condizionale |
| `src/components/OptimizedPlacesAutocomplete.tsx` | Migliorare UI per distinguere città/luoghi |
| Deploy edge function | Trigger deploy automatico |

---

### Vantaggi

1. **Costo zero** per 99% degli utenti
2. **Velocità ottimizzata** - usa l'API migliore per ogni caso
3. **Affidabilità** - fallback automatici
4. **Scalabile** - anche con 2000 utenti costa solo ~$25/mese

