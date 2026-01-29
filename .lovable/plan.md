

## Applicare Effetto Glassmorphism a Explore e Feed Page

### Contesto
L'utente vuole applicare lo stesso effetto glassmorphism (`bg-background/40 backdrop-blur-xl`) anche alle pagine Explore e Feed per coerenza visiva con gli overlay Notifiche e Messaggi.

**Nota:** Queste sono pagine complete, non overlay. L'effetto blur sarà visibile ma meno pronunciato dato che non c'è una mappa sotto.

---

### Modifiche Tecniche

#### 1. ExplorePage.tsx (riga 435)

**Attuale:**
```tsx
<div className="flex flex-col h-full pt-[env(safe-area-inset-top)] pb-0">
```

**Nuovo:**
```tsx
<div className="flex flex-col h-full pt-[env(safe-area-inset-top)] pb-0 bg-background/40 backdrop-blur-xl">
```

---

#### 2. FeedPage.tsx (riga 537)

**Attuale:**
```tsx
<div className="h-screen bg-background flex flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
```

**Nuovo:**
```tsx
<div className="h-screen bg-background/40 backdrop-blur-xl flex flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
```

---

### File da Modificare

| File | Riga | Modifica |
|------|------|----------|
| `src/components/ExplorePage.tsx` | 435 | Aggiungere `bg-background/40 backdrop-blur-xl` |
| `src/pages/FeedPage.tsx` | 537 | Sostituire `bg-background` con `bg-background/40 backdrop-blur-xl` |

---

### Risultato Atteso

Tutte le pagine principali (Explore, Feed, Notifiche, Messaggi) avranno lo stesso stile glassmorphism coerente con:
- Sfondo semi-trasparente al 40%
- Effetto blur (xl) per profondità visiva
- Aspetto uniforme in tutta l'app

