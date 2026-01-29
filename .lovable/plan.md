

# Miglioramenti Pagina Invita Amici

## Panoramica
Tre modifiche principali per migliorare la pagina:
1. Ingrandire il logo SPOTT
2. Cambiare i testi per renderli originali (non copiati dal competitor)
3. Ridurre lo spazio bianco per un layout più compatto

**Nota importante**: La logica per "check contacts" è già completamente implementata! L'hook `usePhoneContacts.ts` e l'edge function `find-contacts-on-app` sono già connessi e funzionanti. Quando l'utente tappa "check contacts" su un dispositivo nativo:
- Viene richiesto il permesso ai contatti
- Gli indirizzi email vengono estratti e hashati client-side (SHA-256)
- Gli hash vengono inviati all'edge function
- La funzione li confronta con le email degli utenti nel database
- Restituisce i profili che matchano

---

## 1. Ingrandire il Logo SPOTT

**File**: `src/components/notifications/InviteFriendOverlay.tsx`

Cambiare la dimensione del logo da `h-16` a `h-24` (da 64px a 96px):

```tsx
// Prima
<img src={spottLogoColorful} alt="SPOTT" className="h-16 w-auto animate-bounce-gentle" />

// Dopo  
<img src={spottLogoColorful} alt="SPOTT" className="h-24 w-auto animate-bounce-gentle" />
```

---

## 2. Cambiare i Testi (Più Originali)

**File**: `src/i18n-invite.ts`

Testi attuali (simili al competitor):
- "have friends with good taste?" 
- "Share the app and discover places together"
- "find your friends"

**Nuovi testi proposti** (più originali e specifici per SPOTT):

| Chiave | Nuovo Testo EN | Nuovo Testo IT |
|--------|----------------|----------------|
| `haveFriendsTitle` | "know someone who loves hidden gems?" | "conosci qualcuno che ama i posti nascosti?" |
| `inviteDescription` | "bring them to SPOTT - share your favorite spots" | "portali su SPOTT - condividi i tuoi posti preferiti" |
| `findYourFriends` | "who's already here?" | "chi c'è già?" |
| `checkContacts` | "sync contacts" | "sincronizza contatti" |

Queste modifiche vanno applicate a tutte e 12 le lingue.

---

## 3. Ridurre lo Spazio Bianco

**File**: `src/components/notifications/InviteFriendOverlay.tsx`

Modifiche al layout:

| Elemento | Prima | Dopo |
|----------|-------|------|
| Container padding | `px-6 py-8 gap-6` | `px-5 py-4 gap-4` |
| Card padding | `p-8` | `p-6` |
| Logo margin | `mb-6` | `mb-4` |
| Description margin | `mb-6` | `mb-4` |
| Avatar margin | `mb-6` | `mb-4` |
| Privacy note margin | `mb-6` | `mb-4` |

Questo renderà le card più compatte e ridurrà lo spazio tra gli elementi.

---

## Riepilogo File da Modificare

| File | Azione |
|------|--------|
| `src/components/notifications/InviteFriendOverlay.tsx` | Modificare - logo più grande, padding ridotti |
| `src/i18n-invite.ts` | Modificare - testi originali per 12 lingue |

---

## Sezione Tecnica

### Logica Contatti (Già Implementata)

Il flusso completo è già funzionante:

```
usePhoneContacts.ts:
├── Controlla se è piattaforma nativa (Capacitor.isNativePlatform())
├── Richiede permessi (Contacts.requestPermissions())
├── Estrae email dai contatti (Contacts.getContacts())
├── Hasha le email client-side (SHA-256)
└── Invia hash a edge function (supabase.functions.invoke)

find-contacts-on-app/index.ts:
├── Verifica autenticazione utente
├── Riceve array di hash email
├── Recupera profili dal database
├── Hasha le email dei profili
├── Confronta gli hash
└── Restituisce profili matchanti
```

### Struttura Nuove Traduzioni

```typescript
// Esempio per EN e IT
en: {
  haveFriendsTitle: 'know someone who loves hidden gems?',
  inviteDescription: 'bring them to SPOTT - share your favorite spots',
  findYourFriends: "who's already here?",
  checkContacts: 'sync contacts',
  // ... resto invariato
},
it: {
  haveFriendsTitle: 'conosci qualcuno che ama i posti nascosti?',
  inviteDescription: 'portali su SPOTT - condividi i tuoi posti preferiti',
  findYourFriends: 'chi c\'è già?',
  checkContacts: 'sincronizza contatti',
  // ... resto invariato
}
```

