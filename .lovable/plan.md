
# Piano: Correzioni Add Page Overlay - Background e Visibilità

## Problemi Identificati

### Problema 1: Barra di ricerca visibile in background
Quando l'Add overlay si apre sulla home page, la barra di ricerca (MapFilterDropdown) nell'Header rimane visibile dietro l'overlay semi-trasparente (`bg-background/40`), creando un contrasto visivo fastidioso.

**Causa tecnica**: L'Header.tsx controlla la visibilità tramite l'attributo `data-modal-open` sul body, ma AddPageOverlay non imposta questo attributo quando si apre.

### Problema 2: Pagina di provenienza visibile invece della home
Quando l'Add overlay si apre da `/feed`, `/explore` o `/profile`, la pagina corrente rimane visibile in background (es. feed con le card). La navigazione alla home (`navigate('/')`) avviene solo alla **chiusura** dell'overlay, causando un caricamento visibile della home in quel momento.

**Causa tecnica**: L'`openAddOverlay` memorizza solo il pathname ma non naviga immediatamente. L'overlay mostra quindi la pagina corrente dietro di sé.

---

## Soluzione Proposta

### Fix 1: Nascondere la barra di ricerca
Quando AddPageOverlay si apre, impostare `data-modal-open` sul body per nascondere automaticamente l'Header della home (che già reagisce a questo attributo).

```text
AddPageOverlay opens
       │
       ▼
document.body.setAttribute('data-modal-open', 'true')
       │
       ▼
Header detects change → returns null → hidden
```

### Fix 2: Navigare alla home prima di aprire l'overlay
Quando l'overlay viene aperto da una pagina diversa dalla home, prima navigare alla home (in background), poi aprire l'overlay. Questo garantisce che:
1. La home sia già caricata e visibile dietro l'overlay
2. Alla chiusura, l'utente sia già sulla home (transizione istantanea)

```text
User on /feed → clicks Add
         │
         ▼
┌─────────────────────────────┐
│ Check: pathname !== '/'?   │
│        YES                  │
└───────────┬─────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ 1. navigate('/', {replace}) │
│ 2. Open overlay             │
└───────────┬─────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ Home page loads behind      │
│ Add overlay (blurred)       │
└───────────┬─────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ User closes overlay         │
│ → Already on home           │
│ → Instant, no loading       │
└─────────────────────────────┘
```

---

## Modifiche Tecniche

### File 1: `src/components/add/AddPageOverlay.tsx`
**Aggiungere**: Impostazione attributo `data-modal-open` quando l'overlay si apre

```tsx
// Nell'useEffect esistente (linea 86-108)
useEffect(() => {
  if (isOpen) {
    // NUOVO: Nascondere header/search bar
    document.body.setAttribute('data-modal-open', 'true');
    
    // ... codice esistente ...
  }

  return () => {
    // NUOVO: Rimuovere attributo alla chiusura
    document.body.removeAttribute('data-modal-open');
    // ... codice esistente ...
  };
}, [isOpen, onClose]);
```

### File 2: `src/contexts/AddOverlayContext.tsx`
**Modificare `openAddOverlay`**: Navigare alla home prima di aprire l'overlay

```tsx
const openAddOverlay = useCallback(() => {
  // Store the current path before opening
  originPathRef.current = location.pathname;
  
  // NUOVO: Se non siamo sulla home, navigare prima alla home
  if (location.pathname !== '/') {
    // Navigate to home first, then open overlay
    navigate('/', { replace: true });
  }
  
  setIsAddOverlayOpen(true);
}, [location.pathname, navigate]);
```

**Modificare `closeAddOverlay`**: Rimuovere la navigazione (ora non più necessaria)

```tsx
const closeAddOverlay = useCallback(() => {
  setIsAddOverlayOpen(false);
  // La navigazione è già avvenuta in openAddOverlay
  // Reset origin
  originPathRef.current = '/';
}, []);
```

**Nota**: Lo stesso per `handleCloseContributionModal`.

---

## File da Modificare

| File | Modifica |
|------|----------|
| `src/components/add/AddPageOverlay.tsx` | Aggiungere `data-modal-open` attribute |
| `src/contexts/AddOverlayContext.tsx` | Navigare alla home in `openAddOverlay` |

---

## Flusso Risultante

```text
Scenario A: Add button cliccato dalla Home (/)
┌────────────────────────────────────────────┐
│ 1. originPathRef = '/'                     │
│ 2. pathname === '/' → no navigation        │
│ 3. setIsAddOverlayOpen(true)               │
│ 4. Overlay opens with home behind          │
│ 5. Header hidden via data-modal-open       │
│ 6. Close → stay on home                    │
└────────────────────────────────────────────┘

Scenario B: Add button cliccato da Feed (/feed)
┌────────────────────────────────────────────┐
│ 1. originPathRef = '/feed'                 │
│ 2. pathname !== '/' → navigate('/')        │
│ 3. setIsAddOverlayOpen(true)               │
│ 4. Home loads behind overlay               │
│ 5. Header hidden via data-modal-open       │
│ 6. Close → already on home (instant)       │
└────────────────────────────────────────────┘
```

---

## Risultato Atteso

1. **Nessun contrasto visivo**: La barra di ricerca della home scompare quando l'Add overlay è aperto
2. **Home sempre in background**: Aprendo da qualsiasi pagina, la home è visibile (sfocata) dietro l'overlay
3. **Chiusura istantanea**: Alla chiusura dell'overlay, l'utente è già sulla home - nessun caricamento visibile
4. **Comportamento consistente**: L'esperienza è identica sia aprendo dalla home che da altre pagine
