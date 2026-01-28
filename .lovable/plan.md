

## Applicare Sfondo Blur alle Pagine Notifiche e Messaggi

### Obiettivo
Applicare lo stesso effetto glassmorphism dell'AddPageOverlay (`bg-background/40 backdrop-blur-xl`) alle pagine di notifiche e messaggi per una UI più moderna e coerente.

---

### Analisi dello Stile AddPageOverlay

L'AddPageOverlay (riga 131) usa:
```tsx
<div className="fixed inset-0 z-[...] flex flex-col bg-background/40 backdrop-blur-xl">
```

Questo crea un effetto vetro smerigliato che lascia intravedere il contenuto sottostante.

---

### Modifiche da Implementare

#### 1. NotificationsPage.tsx

**Attuale (riga 122):**
```tsx
<div className="h-screen w-full bg-background flex flex-col overflow-hidden">
```

**Nuovo:**
```tsx
<div className="h-screen w-full bg-background/40 backdrop-blur-xl flex flex-col overflow-hidden">
```

**Header (riga 125):**
```tsx
className="shrink-0 bg-background w-full"
```
→ Cambiare in:
```tsx
className="shrink-0 bg-background/60 backdrop-blur-md w-full"
```

---

#### 2. MessagesPage.tsx

**Container principale** - Aggiungere lo sfondo blur al wrapper principale.

**Header threads** e **header chat** - Adattare con effetto blur semi-trasparente per coerenza.

**Nota**: La struttura di MessagesPage è più complessa (view threads/chat/search), quindi l'effetto va applicato in modo che funzioni per tutte le viste.

---

### File da Modificare

| File | Modifica |
|------|----------|
| `src/pages/NotificationsPage.tsx` | Applicare `bg-background/40 backdrop-blur-xl` al container, header con blur |
| `src/pages/MessagesPage.tsx` | Applicare stesso stile al container principale e headers |

---

### Risultato Visivo Atteso

- **Prima**: Sfondo bianco/nero solido (piatto)
- **Dopo**: Sfondo vetro smerigliato con blur che lascia intravedere la mappa/contenuto sottostante
- Coerenza visiva con AddPageOverlay e altre modali dell'app

---

### Considerazioni Tecniche

1. **Performance**: `backdrop-blur-xl` è GPU-accelerato su iOS/Chrome, non impatta le performance
2. **Safe area**: Il padding `safe-area-inset-top` resta invariato
3. **SwipeBackWrapper**: Il wrapper esterno non viene modificato, solo il contenuto interno
4. **Dark mode**: `bg-background/40` funziona automaticamente in entrambi i temi

