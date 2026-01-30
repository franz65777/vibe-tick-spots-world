
# Piano: Sostituire il logo SPOTT con quello corretto

## Problema
L'asset `spott-logo-transparent.png` attualmente nel progetto non è il logo corretto. Devo sostituirlo con il logo "Spott" stile collage colorato (foto 2 fornita dall'utente).

## Soluzione

### 1. Copiare il logo corretto
- Copiare `user-uploads://image-1769767572.png` → `src/assets/spott-logo-transparent.png` (sovrascrivendo il file sbagliato attuale)

### 2. Verificare gli import nei componenti
I componenti già importano `spott-logo-transparent.png`, quindi non serve modificare codice:

**SearchDrawer.tsx** (search bar al load):
```tsx
import spottLogoTransparent from '@/assets/spott-logo-transparent.png';
```

**InviteFriendOverlay.tsx** (pagina invita amico):
```tsx
import spottLogoTransparent from '@/assets/spott-logo-transparent.png';
```

### 3. Risultato atteso
- **Search bar**: Al caricamento post-splash, mostra il logo "Spott" colorato allineato a sinistra per 3 secondi
- **Invita un amico**: Mostra lo stesso logo colorato nella card principale

---

## Note tecniche
- Il file verrà sovrascritto quindi tutti i componenti che lo importano vedranno automaticamente il logo corretto
- Potrebbe essere necessario un hard refresh (Ctrl+Shift+R) per svuotare la cache del browser
