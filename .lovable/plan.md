
## Piano: Correzione UI Add Page Search

### Problemi Identificati

Confrontando l'immagine attuale (Photo 1) con il riferimento desiderato (Photo 2):

1. **Bordo bianco sulla search bar**: L'Input component ha stili di default (`border border-input`, `focus-visible:ring-2`) che non vengono completamente sovrascritti
2. **Dropdown con card/container**: Attualmente il dropdown ha `bg-background/98 rounded-2xl shadow-2xl` che crea una "scatola" attorno ai risultati
3. **Design dei risultati**: La Photo 2 mostra righe semplici direttamente sullo sfondo della pagina, senza container

---

### Modifiche Tecniche

#### 1. Rimuovere completamente il bordo dall'input

**File**: `src/components/add/AddPageOverlay.tsx`

Aggiungere override CSS più aggressivi per rimuovere tutti i bordi e ring:

```typescript
className="w-full [&_input]:h-8 [&_input]:bg-transparent [&_input]:border-none 
           [&_input]:text-white [&_input]:dark:text-gray-900 
           [&_input]:placeholder:text-white/60 [&_input]:dark:placeholder:text-gray-500
           [&_input]:p-0 [&_input]:focus-visible:ring-0 [&_input]:focus-visible:ring-offset-0
           [&_input]:shadow-none [&_input]:outline-none"
```

#### 2. Rimuovere container dal dropdown

**File**: `src/components/OptimizedPlacesAutocomplete.tsx`

Cambiare il dropdown da un container con ombre a righe semplici:

**Prima:**
```typescript
<div className="absolute z-50 w-full mt-2 bg-background/98 backdrop-blur-xl rounded-2xl shadow-2xl ...">
```

**Dopo:**
```typescript
<div className="absolute z-50 w-full mt-4 max-h-[70vh] overflow-y-auto scrollbar-hide">
```

#### 3. Stile righe come Photo 2

Ogni riga deve essere:
- Sfondo trasparente/leggero
- Divider sottile tra le righe
- Immagine quadrata 56x56px con angoli arrotondati
- Testo: nome bold, categoria/descrizione grigia sotto

```typescript
<button className="w-full px-4 py-3.5 flex items-center gap-4 hover:bg-white/40 
                   dark:hover:bg-white/10 active:bg-white/60 transition-colors text-left
                   border-b border-black/5 dark:border-white/10">
  {/* Immagine */}
  <div className="w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-muted/20">
    <img src={categoryImage} className="w-full h-full object-cover" />
  </div>
  
  {/* Testo */}
  <div className="flex-1 min-w-0">
    <div className="font-bold text-lg text-foreground truncate">{result.name}</div>
    <div className="text-sm text-muted-foreground truncate">{result.category}</div>
  </div>
</button>
```

---

### Differenze Visive

| Elemento | Prima | Dopo (come Photo 2) |
|----------|-------|---------------------|
| Search bar | Bordo bianco visibile | Nessun bordo, solo sfondo nero |
| Dropdown container | `rounded-2xl shadow-2xl bg-background/98` | Nessun container, righe dirette |
| Righe risultati | Padding e hover con bg | Divider sottili, sfondo trasparente |
| Font nome | `text-base font-semibold` | `text-lg font-bold` |
| Spaziatura | `py-4 gap-4` | `py-3.5 gap-4` |

---

### File da Modificare

| File | Modifica |
|------|----------|
| `src/components/add/AddPageOverlay.tsx` | Override CSS più completi per input (border-none, ring-offset-0, shadow-none, outline-none) |
| `src/components/OptimizedPlacesAutocomplete.tsx` | Rimuovere container dropdown, usare righe con divider sottili |

---

### Risultato Atteso

1. Search bar completamente nera senza bordi bianchi
2. Risultati mostrati come lista semplice senza "card" attorno
3. UI identica alla Photo 2 di riferimento
