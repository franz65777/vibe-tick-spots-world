
# Piano: Abilitare il Tasto Add da Explore, Feed e Profile

## Problema Attuale
Il tasto "Add" nella barra di navigazione funziona **solo dalla home page** perché:
1. Il tasto emette un evento `CustomEvent('open-add-overlay')`
2. Il listener per questo evento esiste **solo in `HomePage.tsx`**
3. Quando l'utente è su `/explore`, `/feed`, o `/profile`, la `HomePage` non è montata
4. Quindi l'evento non viene mai ricevuto

## Soluzione
Spostare la gestione dell'Add overlay a livello di `AuthenticatedLayout` (che è sempre montato per tutte le pagine autenticate). Quando l'overlay si apre da una pagina diversa dalla home:
1. L'overlay si apre normalmente
2. La home viene precaricata in background
3. Alla chiusura, l'utente viene reindirizzato alla home

---

## Modifiche Richieste

### 1. Creare un nuovo Context per l'Add Overlay
**Nuovo file:** `src/contexts/AddOverlayContext.tsx`

Questo context gestirà:
- `isAddOverlayOpen` / `setIsAddOverlayOpen`
- `addContributionLocation` / `setAddContributionLocation`  
- `isAddContributionModalOpen` / `setIsAddContributionModalOpen`
- `originPath` - per tracciare da dove è stato aperto

```text
┌─────────────────────────────────────┐
│         AddOverlayProvider          │
│  (wraps AuthenticatedLayout)        │
│                                     │
│  ┌───────────────┐ ┌─────────────┐  │
│  │  Add Overlay  │ │ Contribution│  │
│  │    Portal     │ │    Modal    │  │
│  └───────────────┘ └─────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │         <Outlet />            │  │
│  │  (HomePage/ExplorePage/etc)   │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 2. Modificare `AuthenticatedLayout.tsx`
- Importare e usare `AddOverlayProvider`
- Aggiungere i componenti `AddPageOverlay` e `LocationContributionModal` a questo livello
- Ascoltare l'evento `open-add-overlay` qui invece che in HomePage

### 3. Modificare `HomePage.tsx`
- Rimuovere la gestione locale di Add overlay (listener evento, stato, componenti)
- Questi sono ora gestiti a livello superiore

### 4. Aggiornare `NewBottomNavigation.tsx`
- Modificare la `customAction` per l'Add button
- Includere il pathname corrente nell'evento per tracciare l'origine
- Se non siamo sulla home, navigare alla home dopo aver aperto l'overlay

### 5. Gestione della Chiusura
Quando l'overlay viene chiuso:
- Se originPath era "/" (home) → comportamento attuale (resta sulla home)
- Se originPath era altro → naviga alla home

---

## Dettagli Tecnici

### AddOverlayContext
```tsx
interface AddOverlayContextType {
  isAddOverlayOpen: boolean;
  openAddOverlay: (fromPath: string) => void;
  closeAddOverlay: () => void;
  addContributionLocation: SelectedLocation | null;
  setAddContributionLocation: (loc: SelectedLocation | null) => void;
  isAddContributionModalOpen: boolean;
  setIsAddContributionModalOpen: (open: boolean) => void;
}
```

### Flusso di Navigazione

```text
User on /feed → clicks Add
         │
         ▼
┌─────────────────────────┐
│  open-add-overlay event │
│  with originPath='/feed'│
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  AuthenticatedLayout    │
│  catches event          │
│  - opens AddPageOverlay │
│  - stores originPath    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  User searches & selects│
│  a location             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  LocationContribution   │
│  Modal opens            │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  User saves/closes      │
│  modal closes           │
│  navigate('/')          │◄── Goes to home
└─────────────────────────┘
```

---

## File da Modificare

| File | Azione |
|------|--------|
| `src/contexts/AddOverlayContext.tsx` | **Nuovo** - Context per gestione stato Add |
| `src/components/AuthenticatedLayout.tsx` | Aggiungere AddOverlayProvider, AddPageOverlay, LocationContributionModal |
| `src/components/HomePage.tsx` | Rimuovere gestione locale Add overlay |
| `src/components/NewBottomNavigation.tsx` | Modificare evento per includere originPath |
| `src/hooks/useHomePageState.ts` | Rimuovere stati Add overlay (opzionale, per pulizia) |

---

## Risultato Atteso

1. **Tasto Add funziona ovunque**: Da home, explore, feed e profile
2. **Transizione fluida**: Overlay si apre sopra la pagina corrente
3. **Ritorno alla home**: Dopo la chiusura, l'utente si trova sulla home con la mappa visibile
4. **Nessuna perdita di funzionalità**: Tutto il comportamento esistente (ricerca luoghi, selezione, upload foto, rating, liste) rimane invariato
5. **Preload efficiente**: La home è già precaricata grazie all'architettura esistente con `useTabPrefetch`
