

## Convertire Notifiche e Messaggi in Overlay con Sfondo Blur

### Obiettivo
Trasformare le pagine Notifiche e Messaggi in overlay (come AddPageOverlay) per ottenere l'effetto glassmorphism con sfocatura reale della mappa sottostante.

---

### Architettura Attuale vs Nuova

**Attuale:**
```
Route /notifications → NotificationsPage (mappa smontata, niente da sfocare)
Route /messages → MessagesPage (mappa smontata, niente da sfocare)
```

**Nuova:**
```
Route / → HomePage (mappa sempre visibile)
         ├── NotificationsOverlay (sopra la mappa con blur)
         ├── MessagesOverlay (sopra la mappa con blur)
         └── AddPageOverlay (già funziona così)
```

---

### Modifiche da Implementare

#### 1. Creare NotificationsOverlay

Convertire NotificationsPage in un componente overlay basato su portal:

- Usare `createPortal` per renderizzare sopra tutto
- Applicare `bg-background/40 backdrop-blur-xl` (come AddPageOverlay)
- Mantenere tutta la logica esistente delle notifiche
- Gestire `data-modal-open` per nascondere elementi home

#### 2. Creare MessagesOverlay

Stessa conversione per la pagina Messaggi:

- Portal con `backdrop-blur-xl`
- Mantenere le tre viste (threads/chat/search)
- Gestire correttamente la navigazione e chiusura

#### 3. Aggiornare la Navigazione

Modificare come si aprono queste "pagine":

- Invece di `navigate('/notifications')` → dispatchare evento per aprire overlay
- Invece di `navigate('/messages')` → dispatchare evento per aprire overlay
- La bottom navigation triggerà l'apertura degli overlay

#### 4. Aggiornare HomePage

Aggiungere i nuovi overlay alla HomePage (come già fatto per AddPageOverlay):

```tsx
// In HomePage
<NotificationsOverlay isOpen={isNotificationsOpen} onClose={closeNotifications} />
<MessagesOverlay isOpen={isMessagesOpen} onClose={closeMessages} />
```

#### 5. Creare Context per Gestione Stato

Creare context (simile a AddOverlayContext) per gestire:

- `isNotificationsOpen` / `isMessagesOpen`
- Funzioni `open` / `close`
- Stato delle conversazioni (per messaggi)

---

### File da Creare/Modificare

| File | Azione |
|------|--------|
| `src/components/notifications/NotificationsOverlay.tsx` | Creare - overlay con blur |
| `src/components/messages/MessagesOverlay.tsx` | Creare - overlay con blur |
| `src/contexts/NotificationsOverlayContext.tsx` | Creare - gestione stato |
| `src/contexts/MessagesOverlayContext.tsx` | Creare - gestione stato |
| `src/pages/HomePage.tsx` | Modificare - aggiungere overlay |
| `src/components/navigation/BottomNav.tsx` | Modificare - aprire overlay invece di navigare |
| `src/App.tsx` | Modificare - aggiungere provider context |

---

### Stile Overlay (identico ad AddPage)

```tsx
<div className="fixed inset-0 z-[2147483640] flex flex-col bg-background/40 backdrop-blur-xl">
  <header className="sticky top-0 z-10" style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}>
    {/* Header content */}
  </header>
  {/* Content */}
</div>
```

---

### Risultato Visivo

- Sfondo vetro smerigliato con la mappa visibile e sfocata sotto
- Coerenza visiva con AddPageOverlay
- Transizioni fluide (nessun cambio route brusco)
- La mappa resta sempre montata → performance migliore

---

### Note Tecniche

1. **SwipeBackWrapper**: Va mantenuto per gesture di chiusura
2. **Safe area**: Gestito con `env(safe-area-inset-top)`
3. **data-modal-open**: Nasconde elementi home (search bar, drawer)
4. **Deep linking**: I vecchi URL `/notifications` e `/messages` verranno reindirizzati e apriranno gli overlay

