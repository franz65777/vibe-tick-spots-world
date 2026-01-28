
# Piano: Fix Photo Upload - Separare Upload Manuali da Foto Vicine

## Problema Attuale

Quando l'utente clicca il bottone `+` e seleziona una foto:
1. La foto viene processata da `scanPhotos()` per analizzare i dati GPS
2. La foto finisce nell'array `nearbyPhotos` o `allPhotos`
3. Queste foto appaiono nella sezione "abbiamo trovato X foto" in basso
4. L'utente deve cliccare DI NUOVO sulla foto per aggiungerla a `selectedPhotos`

Questo e sbagliato! Le foto uploadate manualmente devono apparire immediatamente nella preview principale.

## Comportamento Corretto

```text
┌─────────────────────────────────────────────────────────────┐
│                    ADD PHOTOS SECTION                       │
├─────────────────────────────────────────────────────────────┤
│  [FOTO 1] [FOTO 2] [+]   ←── Foto uploadate manualmente    │
│                               (selectedPhotos)              │
├─────────────────────────────────────────────────────────────┤
│  • abbiamo trovato 3 foto vicine >                         │
│                                                             │
│  Questa sezione mostra foto dal rullino del dispositivo    │
│  che hanno GPS vicino alla location selezionata.           │
│  NON le foto appena uploadate.                             │
└─────────────────────────────────────────────────────────────┘
```

## Soluzione

### Modificare `handleFileSelect` in `LocationContributionModal.tsx`

Invece di chiamare `scanPhotos()`, creare direttamente oggetti `NearbyPhoto` e aggiungerli a `selectedPhotos`:

```tsx
const handleFileSelect = useCallback(
  async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Creare NearbyPhoto objects per ogni file selezionato
    const newPhotos: NearbyPhoto[] = Array.from(files).map(file => ({
      file,
      url: URL.createObjectURL(file),
      distance: Infinity, // Non mostrare badge distanza
      timestamp: undefined,
    }));

    // Aggiungerli direttamente a selectedPhotos (max 5 totali)
    setSelectedPhotos(prev => {
      const combined = [...prev, ...newPhotos];
      return combined.slice(0, 5); // Max 5 foto
    });
    
    // Reset input per permettere riselection
    e.target.value = '';
  },
  []
);
```

### La sezione "abbiamo trovato X foto" (Nearby Photos)

Questa sezione dovrebbe mostrare foto rilevate automaticamente dal rullino del dispositivo, non le foto appena uploadate.

Per ora, la logica `useNearbyPhotos` resta disponibile ma non viene piu chiamata durante l'upload manuale. La sezione "nearby photos" apparira vuota finche non viene implementata la scansione del rullino (funzionalita nativa con Capacitor).

---

## Modifiche Tecniche

### File: `src/components/explore/LocationContributionModal.tsx`

**1. Modificare `handleFileSelect`** (linee 234-242):
- NON chiamare `scanPhotos(files)`
- Creare direttamente `NearbyPhoto` objects
- Aggiungerli subito a `selectedPhotos`
- Reset del file input

**2. La UI esistente e gia corretta**:
- `selectedPhotos.length > 0` mostra le preview in alto con il bottone `+` verde
- `displayPhotos` (nearbyPhotos/allPhotos) mostra foto rilevate automaticamente sotto

---

## File da Modificare

| File | Modifica |
|------|----------|
| `src/components/explore/LocationContributionModal.tsx` | Modificare `handleFileSelect` per aggiungere direttamente a `selectedPhotos` |

---

## Risultato Atteso

1. **Upload immediato**: Le foto selezionate appaiono subito nella preview principale (in alto)
2. **Nessuna confusione**: La sezione "abbiamo trovato foto" rimane separata (per future implementazioni di scansione rullino)
3. **UX fluida**: Nessun doppio click richiesto - la foto appare dove l'utente si aspetta
4. **Max 5 foto**: Il limite viene rispettato correttamente
