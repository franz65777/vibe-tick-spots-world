

# Piano: Migliorare la barra dei filtri del profilo

## Situazione attuale
La barra dei filtri (ProfileTabs) ha attualmente:
- Background scuro semitrasparente (`bg-gray-200/40 dark:bg-slate-800/65`)
- Bordo sfumato complesso con mask
- Icone piccole (4×4) e testo nascosto su mobile
- Stile "piatto" che non si integra bene con il resto della pagina

## Problemi identificati
1. **Aspetto poco raffinato**: Il bordo gradient mask è troppo sottile e poco visibile
2. **Icone troppo piccole**: Le icone da 16px (w-4 h-4) sono poco visibili
3. **Mancanza di profondità**: Non c'è shadow né effetto di "elevazione"
4. **Tab attivo poco evidente**: Il primary piatto non è elegante come il resto dell'UI

## Soluzione proposta

### Design migliorato
Ispirandomi alle category cards già presenti nel ProfileHeader e ai FilterButtons della home:

1. **Container più elegante**
   - Bordo più visibile con inner shadow per effetto "incassato"
   - Padding aumentato per respiro
   - Border-radius più morbido (rounded-2xl)

2. **Icone più grandi e visibili**
   - Da w-4 h-4 (16px) a w-5 h-5 (20px)
   - Maggiore spaziatura tra icona e bordi

3. **Tab attivo con gradient**
   - Gradient blu primario invece del colore piatto
   - Shadow colorata per effetto "glow"
   - Leggera animazione scale (105%)

4. **Tab inattivi più sottili**
   - Colore muted più leggero
   - Hover effect con leggero background
   - Transizione smooth

### Modifiche tecniche

**File: `src/components/profile/ProfileTabs.tsx`**

```tsx
// Container esterno
<div className="relative flex bg-gray-100/60 dark:bg-slate-800/50 backdrop-blur-md 
     rounded-2xl p-1.5 mb-4 mx-3 shadow-inner border border-gray-200/50 dark:border-white/5">

// Tab attivo
className={cn(
  "flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 
   flex items-center justify-center gap-2",
  activeTab === 'posts'
    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 scale-[1.02]"
    : "text-muted-foreground hover:bg-white/50 dark:hover:bg-white/10"
)}

// Icone più grandi
<Grid3X3 className="w-5 h-5" />
```

### Risultato visivo atteso
- Barra con aspetto "incassato" (inset) elegante
- Tab attivo con gradient blu e glow sottile
- Icone più grandi e visibili (20px invece di 16px)
- Transizioni fluide al cambio tab
- Stile coerente con i category cards sopra

### File da modificare
- `src/components/profile/ProfileTabs.tsx`

