
## Applicare l'Effetto "Frosted Glass" al Drawer "Posizioni"

### Problema Identificato
Guardando lo screenshot, l'area superiore del drawer "Posizioni" (header con titolo e filtri) appare con uno sfondo più opaco rispetto all'effetto vetro smerigliato desiderato. Il drawer ha già `bg-gray-200/40 backdrop-blur-md`, ma:

1. Il `DrawerHeader` non ha uno stile specifico per mantenere la trasparenza
2. I pulsanti `Button` con variant `outline` usano `bg-background` che è solido
3. La `Badge` "secondary" usa `bg-secondary` che è anche solido

### Obiettivo
Rendere tutto il drawer (header incluso) più trasparente per mostrare la mappa dietro con effetto blur, simile all'immagine di riferimento.

---

### Modifiche Tecniche

#### 1. MapSection.tsx - Aggiungere sfondo trasparente al DrawerHeader

Modificare la riga 636 per aggiungere uno sfondo frosted glass al `DrawerHeader`:

```tsx
// DA
<DrawerHeader className="pt-1 pb-2 flex-shrink-0 sticky top-0 z-10">

// A
<DrawerHeader className="pt-1 pb-2 flex-shrink-0 sticky top-0 z-10 bg-gray-200/60 dark:bg-slate-800/60 backdrop-blur-md rounded-t-[20px]">
```

---

#### 2. MapSection.tsx - Modificare i Button dei filtri per trasparenza

Modificare i pulsanti dei filtri (Amici, Tutti, Salvati) per usare sfondi trasparenti invece di solidi:

**Button Outline (non attivo):**
```tsx
// DA
variant={activeFilter === 'following' ? 'default' : 'outline'}

// A - Aggiungere className personalizzato
className={cn(
  "rounded-full whitespace-nowrap flex-shrink-0 h-8",
  activeFilter !== 'following' && "bg-white/50 dark:bg-slate-700/50 border-border/30"
)}
```

---

#### 3. MapSection.tsx - Modificare la Badge del conteggio

Modificare la Badge per essere più trasparente:

```tsx
// DA
<Badge variant="secondary" className="text-sm font-medium">

// A
<Badge variant="secondary" className="text-sm font-medium bg-white/50 dark:bg-slate-700/50">
```

---

#### 4. LocationListItem.tsx - Rendere gli item più trasparenti

Attualmente gli item usano `bg-white/70`. Mantenere questo valore o ridurlo leggermente:

```tsx
// Riga 48 - già usa bg-white/70 che è appropriato
// Opzionale: ridurre a bg-white/60 per più trasparenza
```

---

### File da Modificare

| File | Modifica |
|------|----------|
| `src/components/home/MapSection.tsx` | Aggiungere sfondo frosted glass al DrawerHeader e rendere i Button più trasparenti |
| `src/components/home/LocationListItem.tsx` | (Opzionale) Ridurre opacità sfondo item se necessario |

---

### Nota sui Filtri Save Tag per "Amici"

Ho verificato il codice in `useMapLocations.ts` e i filtri save tag (Been, To Try, Favourite) sono **già implementati** per il filtro "following" (Amici):

- Righe 314-317: Applicato per query con mapBounds su `user_saved_locations`
- Righe 327-330: Applicato per query con mapBounds su `saved_places`  
- Righe 620-623: Applicato per query senza bounds su `user_saved_locations`
- Righe 634-637: Applicato per query senza bounds su `saved_places`

Il codice usa correttamente:
```typescript
if (selectedSaveTags.length > 0) {
  savedInternalQuery = savedInternalQuery.in('save_tag', selectedSaveTags);
}
```

Quindi **non sono necessarie modifiche** per far funzionare i filtri save tag con il filtro "Amici" - dovrebbe già funzionare.

---

### Risultato Atteso

Dopo le modifiche:
1. Il drawer "Posizioni" mostrerà la mappa sfumata dietro l'intera area (header + contenuto)
2. L'header sticky manterrà l'effetto vetro smerigliato durante lo scroll
3. I pulsanti dei filtri avranno uno sfondo semi-trasparente coordinato
4. I filtri Been/To Try/Favourite continueranno a funzionare sia per "Salvati" che per "Amici"
