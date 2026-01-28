

## Rimozione Linea di Divisione Grigia

### Problema
Ho aggiunto `border-b border-border/50` all'header delle pagine Messaggi e Notifiche, creando quella linea grigia che non desideri.

### Soluzione
Rimuovere completamente il border dall'header, tornando a uno stile pulito senza divisori visibili.

---

### Modifiche

#### 1. MessagesPage.tsx (riga 841)

**Attuale:**
```tsx
<header className="shrink-0 bg-background/95 backdrop-blur-sm border-b border-border/50 w-full">
```

**Nuovo:**
```tsx
<header className="shrink-0 bg-background w-full">
```

---

#### 2. NotificationsPage.tsx (riga 125)

**Attuale:**
```tsx
className="shrink-0 bg-background/95 backdrop-blur-sm border-b border-border/50 w-full"
```

**Nuovo:**
```tsx
className="shrink-0 bg-background w-full"
```

---

### Risultato
- Header pulito senza linea di divisione
- Sfondo solido coerente (`bg-background`)
- Nessun effetto blur inutile
- Aspetto minimal e moderno

### File da Modificare
| File | Modifica |
|------|----------|
| `src/pages/MessagesPage.tsx` | Rimuovere `border-b border-border/50` e blur dall'header |
| `src/pages/NotificationsPage.tsx` | Stesso trattamento |

