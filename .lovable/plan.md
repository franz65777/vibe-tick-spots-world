

## Sfondo Omogeneo per Overlay Notifiche e Messaggi

### Problema Attuale
Gli overlay usano `bg-background/40 backdrop-blur-xl` che mostra la mappa sotto con blur. I colori variabili della mappa (strade, aree verdi, acqua) creano uno sfondo disomogeneo visivamente.

### Soluzione
Sostituire lo sfondo semi-trasparente con uno sfondo quasi opaco che mantenga un leggero effetto blur per profondità ma nasconda efficacemente la mappa.

---

### Modifiche Tecniche

#### 1. NotificationsOverlay.tsx (riga 172)

**Attuale:**
```tsx
<div className="fixed inset-0 z-[2147483640] flex flex-col bg-background/40 backdrop-blur-xl">
```

**Nuovo:**
```tsx
<div className="fixed inset-0 z-[2147483640] flex flex-col bg-background/95 dark:bg-background/95 backdrop-blur-xl">
```

---

#### 2. MessagesOverlay.tsx (riga 687)

**Attuale:**
```tsx
<div className="fixed inset-0 z-[2147483640] flex flex-col bg-background/40 backdrop-blur-xl">
```

**Nuovo:**
```tsx
<div className="fixed inset-0 z-[2147483640] flex flex-col bg-background/95 dark:bg-background/95 backdrop-blur-xl">
```

---

### Risultato

| Prima | Dopo |
|-------|------|
| Mappa visibile con blur (colori variabili) | Sfondo quasi solido, omogeneo |
| Effetto glassmorphism forte | Effetto più sottile ma uniforme |
| Distrazioni visive | Aspetto pulito e professionale |

### File da Modificare

| File | Riga | Modifica |
|------|------|----------|
| `src/components/notifications/NotificationsOverlay.tsx` | 172 | `bg-background/40` → `bg-background/95` |
| `src/components/messages/MessagesOverlay.tsx` | 687 | `bg-background/40` → `bg-background/95` |

