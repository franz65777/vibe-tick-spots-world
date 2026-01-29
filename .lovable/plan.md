
## Correggere il Drawer delle Posizioni

### Problemi Identificati dallo Screenshot

1. **Sfondi diversi**: L'header ("Posizioni 67" + filtri) usa `bg-gray-200/60` mentre il drawer generale usa `bg-gray-200/40` - visivamente diversi
2. **Mappa non visibile**: Gli item della lista usano `bg-white/70` che e troppo opaco - la mappa dovrebbe trasparire
3. **Altezza fissa**: Il drawer usa sempre `h-[85vh]` indipendentemente dal numero di elementi

---

### Modifiche Tecniche

#### 1. MapSection.tsx - Unificare sfondi e rendere altezza dinamica

**DrawerContent (riga 631-634):**
- Rimuovere lo sfondo solido dal drawer principale
- Rendere l'altezza dinamica basata sul numero di elementi
- Usare solo `backdrop-blur-xl` senza colore di sfondo semi-opaco

```tsx
// DA
className="h-[85vh] flex flex-col z-[150] bg-gray-200/40 dark:bg-slate-800/65 backdrop-blur-md border-t border-border/10 shadow-2xl"

// A
className={cn(
  "flex flex-col z-[150] backdrop-blur-xl border-t border-border/10 shadow-2xl",
  // Altezza dinamica: max 85vh, min basato sul contenuto
  places.length <= 3 ? "max-h-[45vh]" :
  places.length <= 5 ? "max-h-[60vh]" :
  places.length <= 8 ? "max-h-[72vh]" :
  "max-h-[85vh]"
)}
```

**DrawerHeader (riga 636):**
- Rimuovere sfondo separato per unificare con il resto
- Mantenere solo backdrop-blur per coerenza

```tsx
// DA
className="pt-1 pb-2 flex-shrink-0 sticky top-0 z-10 bg-gray-200/60 dark:bg-slate-800/60 backdrop-blur-md rounded-t-[20px]"

// A
className="pt-1 pb-2 flex-shrink-0 sticky top-0 z-10 backdrop-blur-xl rounded-t-[20px]"
```

---

#### 2. LocationListItem.tsx - Rendere la mappa piu visibile dietro

**Item principale (riga 48):**
- Ridurre opacita da `bg-white/70` a `bg-white/50` per light mode
- Ridurre opacita da `bg-slate-700/70` a `bg-slate-800/40` per dark mode
- La mappa sara piu visibile dietro ogni elemento

```tsx
// DA
className="group flex items-center gap-2.5 p-2.5 rounded-xl bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm border border-white/50 dark:border-slate-600/50 cursor-pointer transition-all duration-200 hover:bg-white/90 dark:hover:bg-slate-700/90 hover:shadow-sm active:scale-[0.98]"

// A
className="group flex items-center gap-2.5 p-2.5 rounded-xl bg-white/50 dark:bg-slate-800/40 backdrop-blur-sm border border-white/30 dark:border-slate-600/30 cursor-pointer transition-all duration-200 hover:bg-white/70 dark:hover:bg-slate-700/60 hover:shadow-sm active:scale-[0.98]"
```

**Skeleton loader (riga 136):**
```tsx
// DA
className="flex items-center gap-2.5 p-2.5 rounded-xl bg-background/60 border border-border/30"

// A
className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/40 dark:bg-slate-800/30 backdrop-blur-sm border border-white/30 dark:border-slate-600/30"
```

---

### Logica Altezza Dinamica

| Numero Elementi | Altezza Massima |
|-----------------|-----------------|
| 1-3 | 45vh |
| 4-5 | 60vh |
| 6-8 | 72vh |
| 9+ | 85vh (attuale) |

Questo fa si che con pochi elementi il drawer sia compatto, mostrando piu mappa.

---

### File da Modificare

| File | Modifica |
|------|----------|
| `src/components/home/MapSection.tsx` | Unificare sfondi header/content, altezza dinamica |
| `src/components/home/LocationListItem.tsx` | Ridurre opacita sfondo items per mostrare mappa |

---

### Risultato Visivo

- **Sfondo unificato**: Header e lista avranno lo stesso effetto glassmorphism
- **Mappa visibile**: Attraverso gli elementi della lista si vedra la mappa sottostante
- **Altezza adattiva**: Con poche posizioni il drawer sara piu basso, mostrando piu mappa
