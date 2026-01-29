
# Inviti Pagina - Traduzioni, Logo e Avatar

## Panoramica
Tre modifiche principali per la pagina "Invita un amico":
1. Aggiungere le traduzioni in 12 lingue per tutti i testi
2. Sostituire il logo SPOTT testuale con l'immagine fornita + animazione bouncing
3. Usare avatar reali (yungtrinky, ore, sarita) nella sezione "Trova amici"

---

## 1. Creare File Traduzioni per Namespace "invite"

Creare un nuovo file `src/i18n-invite.ts` con traduzioni per tutte e 12 le lingue supportate:

| Chiave | EN | IT | ES | FR | ... |
|--------|----|----|----|----|-----|
| pageTitle | Invite a Friend | Invita un Amico | Invita a un Amigo | Inviter un Ami | ... |
| haveFriendsTitle | have friends with good taste? | hai amici con buon gusto? | ¿tienes amigos con buen gusto? | des amis avec du goût? | ... |
| inviteDescription | Share the app and discover places together | Condividi l'app e scopri posti insieme | Comparte la app y descubre lugares juntos | ... | ... |
| inviteThem | invite them | invitali | invítalos | invite-les | ... |
| findYourFriends | find your friends | trova i tuoi amici | encuentra a tus amigos | trouve tes amis | ... |
| privacyNote | we never upload or store your contacts | non carichiamo né memorizziamo i tuoi contatti | nunca subimos ni almacenamos tus contactos | ... | ... |
| checkContacts | check contacts | controlla contatti | verificar contactos | vérifier contacts | ... |
| ... | ... | ... | ... | ... | ... |

---

## 2. Registrare il Namespace "invite"

**File**: `src/i18n.ts`

- Importare `inviteTranslations` dal nuovo file
- Aggiungere 'invite' alla lista dei namespace (linea 10146)
- Merge delle traduzioni nei resources

---

## 3. Aggiungere Logo Immagine e Animazione Bouncing

### 3.1 Salvare Immagine Logo
Copiare l'immagine caricata in `src/assets/spott-logo-colorful.png`

### 3.2 Aggiungere Keyframe Bouncing in Tailwind

**File**: `tailwind.config.ts`

```typescript
keyframes: {
  // ... existing keyframes
  'bounce-gentle': {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-8px)' }
  }
},
animation: {
  // ... existing animations
  'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite'
}
```

### 3.3 Aggiornare InviteFriendOverlay

**File**: `src/components/notifications/InviteFriendOverlay.tsx`

Sostituire il logo testuale con:

```tsx
import spottLogoColorful from '@/assets/spott-logo-colorful.png';

// Nel JSX, sostituire il div del logo con:
<div className="flex justify-center mb-6">
  <img 
    src={spottLogoColorful} 
    alt="SPOTT" 
    className="h-16 w-auto animate-bounce-gentle"
  />
</div>
```

---

## 4. Avatar Reali per "Trova Amici"

### Utenti Disponibili nel Database

| Username | Avatar URL |
|----------|-----------|
| yungtrinky | https://...avatar-1765123237885.jpg |
| ore | https://...6e627794-...-1763140984090.jpg |
| sarita | https://...avatar-1750188571035.jpeg |

### Aggiornare Placeholder Avatars

**File**: `src/components/notifications/InviteFriendOverlay.tsx`

```tsx
// Sostituire placeholderAvatars con URL reali
const placeholderAvatars = [
  { 
    url: 'https://hrmklsvewmhpqixgyjmy.supabase.co/storage/v1/object/public/avatars/101423bc-a06c-40cc-8bb9-42af76946e4d/avatar/avatar-1765123237885.jpg', 
    name: 'yungtrinky' 
  },
  { 
    url: 'https://hrmklsvewmhpqixgyjmy.supabase.co/storage/v1/object/public/avatars/avatars/6e627794-6ac1-4830-9737-de5158761904-1763140984090.jpg', 
    name: 'ore' 
  },
  { 
    url: 'https://hrmklsvewmhpqixgyjmy.supabase.co/storage/v1/object/public/media/4ff2a819-7556-4b74-a0ad-6950a03285c9/avatar/avatar-1750188571035.jpeg', 
    name: 'sarita' 
  },
];
```

---

## Riepilogo File da Modificare

| File | Azione |
|------|--------|
| `src/i18n-invite.ts` | Creare - traduzioni 12 lingue |
| `src/i18n.ts` | Modificare - importare e registrare namespace 'invite' |
| `tailwind.config.ts` | Modificare - aggiungere keyframe bouncing |
| `src/assets/spott-logo-colorful.png` | Creare - copiare immagine logo |
| `src/components/notifications/InviteFriendOverlay.tsx` | Modificare - logo, avatar, rimuovere MapPin import |

---

## Sezione Tecnica

### Struttura File Traduzioni

```typescript
// src/i18n-invite.ts
export const inviteTranslations = {
  en: {
    pageTitle: 'Invite a Friend',
    haveFriendsTitle: 'have friends with good taste?',
    inviteDescription: 'Share the app and discover places together',
    inviteThem: 'invite them',
    findYourFriends: 'find your friends',
    privacyNote: 'we never upload or store your contacts',
    checkContacts: 'check contacts',
    mobileOnly: 'Available on mobile app',
    permissionDenied: 'Contact access denied. Please enable in settings.',
    noFriendsFound: 'No friends found on SPOTT yet',
    linkCopied: 'Link copied to clipboard!',
    copyFailed: 'Failed to copy',
    inviteShareMessage: 'Join me on SPOTT to discover the best places! Download the app:',
    friendsFound: '{{count}} friends on SPOTT!',
    followToSee: 'Follow them to see their saved places',
    followed: 'Followed!',
    followFailed: 'Failed to follow',
    follow: 'Follow',
    following: 'Following',
    done: 'Done',
    inviteFriend: 'Invite Friend',
  },
  it: {
    pageTitle: 'Invita un Amico',
    haveFriendsTitle: 'hai amici con buon gusto?',
    // ... tutte le altre chiavi in italiano
  },
  // ... es, fr, de, pt, zh-CN, ja, ko, ar, hi, ru
};
```

### Merge nel File i18n.ts

```typescript
import { inviteTranslations } from './i18n-invite';

// Dopo gli altri merge, aggiungere:
Object.keys(inviteTranslations).forEach(lang => {
  if (resources[lang]) {
    resources[lang].invite = inviteTranslations[lang];
  }
});

// Aggiornare la lista ns:
ns: ['common', ... 'invite'],
```
