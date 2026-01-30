

# Piano: Fix Feed Vuoto

## Problema identificato

La pagina Feed mostra "Il tuo feed è vuoto" anche se il database contiene 13+ post che dovrebbero essere visualizzati.

## Causa radice

Conflitto tra `initialData` e `refetchOnMount: false` in `useOptimizedFeed.ts`:

1. **`initialData` restituisce `[]`** - Quando la cache localStorage è assente o più vecchia di 2 secondi (linea 96), la funzione restituisce un array vuoto
2. **`refetchOnMount: false`** (linea 84) - Dice a React Query di NON fare refetch quando il componente viene montato
3. **Risultato**: React Query vede che `initialData` ha fornito dati (anche se vuoti), e non avvia il fetch reale

Questo significa che se l'utente naviga al feed e la cache localStorage è scaduta o inesistente, il feed rimane vuoto indefinitamente.

## Soluzione

Modificare la logica in `useOptimizedFeed.ts` per garantire che il feed venga caricato correttamente:

### Opzione scelta: Rimuovere `refetchOnMount: false` e usare `placeholderData` invece di `initialData`

La differenza tra `initialData` e `placeholderData`:
- **`initialData`**: React Query considera questi come "dati reali" e rispetta `staleTime`
- **`placeholderData`**: Mostra dati temporanei mentre il fetch è in corso, ma avvia sempre il fetch

### Implementazione

```typescript
export const useOptimizedFeed = () => {
  const { user } = useAuth();

  const { data: posts = [], isLoading, isFetching } = useQuery({
    queryKey: ['feed', user?.id],
    queryFn: async () => {
      // ... logica esistente ...
    },
    enabled: !!user?.id,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes in memory
    // RIMOSSO: refetchOnMount: false - questo bloccava il fetch quando initialData era vuoto
    refetchOnMount: true, // Esplicito: fetch sempre al mount se stale
    // CAMBIATO: da initialData a placeholderData
    // placeholderData non viene considerato "dati reali" quindi non blocca il fetch
    placeholderData: () => {
      if (!user?.id) return [];
      try {
        const cachedRaw = localStorage.getItem(`feed_cache_${user.id}`);
        if (!cachedRaw) return undefined; // undefined = no placeholder
        
        const cached = JSON.parse(cachedRaw) as { ts?: number; data?: any[] };
        const ageMs = Date.now() - (cached.ts || 0);
        
        // Mostra placeholder solo se cache < 5 minuti (non 2 secondi)
        if (!cached.ts || ageMs > 5 * 60 * 1000) return undefined;
        return Array.isArray(cached.data) ? cached.data : undefined;
      } catch {
        return undefined;
      }
    },
  });

  return {
    posts,
    loading: isLoading || (isFetching && posts.length === 0),
  };
};
```

### Modifiche chiave

| Prima | Dopo |
|-------|------|
| `refetchOnMount: false` | `refetchOnMount: true` (o omesso) |
| `initialData: () => ...` | `placeholderData: () => ...` |
| Cache valida per 2s | Cache placeholder valida per 5 minuti |
| Restituisce `[]` se cache scaduta | Restituisce `undefined` se cache scaduta |

### Perché funziona

1. **`placeholderData`** mostra immediatamente i dati cached (se disponibili) per UX istantanea
2. **`refetchOnMount: true`** (default) garantisce che il fetch parta sempre
3. **`staleTime: 3 minuti`** evita refetch inutili se i dati sono ancora freschi
4. **Restituire `undefined`** (non `[]`) quando non c'è cache valida permette lo skeleton loading corretto

## File da modificare

- `src/hooks/useOptimizedFeed.ts`

## Benefici

- Il feed si carica sempre correttamente
- UX istantanea grazie a placeholderData (dati cached mostrati subito)
- Nessun impatto su performance (staleTime evita refetch inutili)
- Fix del bug senza side effects

## Test da fare

- [ ] Navigare al feed → post visibili
- [ ] Refresh della pagina → post visibili  
- [ ] Clear localStorage → feed si carica comunque
- [ ] Tornare al feed da altra pagina → dati cached mostrati + eventuale aggiornamento

