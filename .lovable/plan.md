

## Ripristinare Effetto Glassmorphism per Notifiche e Messaggi

### Problema
Dopo l'ultima modifica, gli overlay usano `bg-background/95` che nasconde completamente la mappa e appare piatto/noioso, mentre l'Add page usa `bg-background/40 backdrop-blur-xl` che crea un bellissimo effetto vetro smerigliato.

### Soluzione
Tornare allo stesso stile dell'Add page (`bg-background/40 backdrop-blur-xl`) per entrambi gli overlay.

---

### Modifiche Tecniche

#### 1. NotificationsOverlay.tsx (riga 172)

**Attuale:**
```tsx
<div className="fixed inset-0 z-[2147483640] flex flex-col bg-background/95 dark:bg-background/95 backdrop-blur-xl">
```

**Nuovo:**
```tsx
<div className="fixed inset-0 z-[2147483640] flex flex-col bg-background/40 backdrop-blur-xl">
```

---

#### 2. MessagesOverlay.tsx (riga 687)

**Attuale:**
```tsx
<div className="fixed inset-0 z-[2147483640] flex flex-col bg-background/95 dark:bg-background/95 backdrop-blur-xl">
```

**Nuovo:**
```tsx
<div className="fixed inset-0 z-[2147483640] flex flex-col bg-background/40 backdrop-blur-xl">
```

---

### Risultato

Tutti e tre gli overlay (Add, Notifiche, Messaggi) avranno lo stesso identico aspetto glassmorphism con:
- Sfondo semi-trasparente al 40%
- Blur forte (xl) che sfuma la mappa sottostante
- Effetto vetro smerigliato coerente in tutta l'app

### File da Modificare

| File | Modifica |
|------|----------|
| `src/components/notifications/NotificationsOverlay.tsx` | `bg-background/95 dark:bg-background/95` → `bg-background/40` |
| `src/components/messages/MessagesOverlay.tsx` | `bg-background/95 dark:bg-background/95` → `bg-background/40` |

