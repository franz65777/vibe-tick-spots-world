
## Fix Sfondo Blur per Notifiche e Messaggi

### Il Problema

L'effetto `backdrop-blur-xl` non funziona perché:
- **AddPageOverlay** usa `createPortal` + `fixed inset-0` ed è renderizzato **sopra** la mappa → il blur sfuma il contenuto sottostante
- **NotificationsPage/MessagesPage** sono **route separate** → quando navighi via, la mappa viene smontata, quindi non c'è contenuto da sfocare

Lo screenshot mostra uno sfondo solido crema/bianco perché `bg-background/40` è semitrasparente, ma sotto c'è solo il colore di default del body.

---

### Soluzioni Disponibili

#### Opzione A: Sfondo Decorativo (Consigliata - Veloce)

Invece di cercare di sfocare contenuto che non esiste, creare un effetto visivo simile usando:
- Un gradiente sottile o pattern di sfondo
- Oppure mantenere uno sfondo solido ma più coerente col tema

```tsx
// Invece di bg-background/40 backdrop-blur-xl
// Usare uno sfondo solido con leggera texture
<div className="h-screen w-full bg-gradient-to-b from-background via-background to-muted/30 flex flex-col">
```

#### Opzione B: Convertire in Overlay (Complesso)

Rendere NotificationsPage e MessagesPage come overlay sopra la home (come AddPageOverlay):
- Usare `createPortal` per renderizzare sopra tutto
- Mantenere la mappa montata sotto
- Richiede refactoring significativo delle route e della navigazione

---

### Piano di Implementazione (Opzione A)

Ripristinare uno sfondo coerente e visivamente piacevole:

**File: `src/pages/NotificationsPage.tsx`**
```tsx
// Riga 122: Rimuovere il blur inefficace
<div className="h-screen w-full bg-background flex flex-col overflow-hidden">

// Header (riga 125)
<header className="shrink-0 bg-background/95 backdrop-blur-sm border-b border-border/50 w-full">
```

**File: `src/pages/MessagesPage.tsx`**
```tsx
// Container principale
<div className="h-screen w-full bg-background flex flex-col overflow-hidden">

// Header  
<header className="shrink-0 bg-background/95 backdrop-blur-sm border-b border-border/50 w-full">
```

---

### Alternativa: Effetto Glassmorphism Simulato

Se vuoi comunque un effetto "vetro smerigliato" senza contenuto reale sotto, posso usare:

```tsx
// Sfondo con gradiente e noise simulato
<div className="h-screen w-full bg-gradient-to-br from-background via-background to-accent/10 flex flex-col">
```

Oppure aggiungere un pattern decorativo di sfondo.

---

### Domanda

Quale approccio preferisci?

1. **Sfondo solido pulito** (come prima delle modifiche)
2. **Gradiente decorativo** (effetto moderno senza blur reale)
3. **Conversione in overlay** (come AddPage - richiede più lavoro)

---

### File da Modificare

| File | Modifica |
|------|----------|
| `src/pages/NotificationsPage.tsx` | Rimuovere `backdrop-blur-xl`, usare sfondo appropriato |
| `src/pages/MessagesPage.tsx` | Stesso trattamento |
