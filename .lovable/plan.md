

# Piano: Fix Notifiche Persistenti + UI Premium per Tasti Notifiche

## 🐛 Problema 1: Notifiche che Spariscono dopo 30 Giorni

### Root Cause Identificata
Il database ha un **default di `expires_at = now() + 30 days`** per TUTTE le notifiche. Questo significa che:
- Notifiche `like`, `comment`, `follow`, `follow_request`, `follow_accepted` → **Scadono dopo 30 giorni** (ma dovrebbero rimanere per sempre)
- Notifiche `location_share` → **Scadono dopo 30 giorni** (corretto che scadano, ma dovrebbe essere 24h, non 30 giorni)

### Soluzione

#### A. Modificare Default Database (Schema SQL)
Creare una migration che:
1. **Rimuove il default generico** di 30 giorni
2. **Imposta expires_at = NULL per notifiche permanenti** oppure una data molto lontana (es. 100 anni)
3. **Mantiene 24h per `location_share`** nel codice frontend

```sql
-- Cambia default a 100 anni (praticamente mai)
ALTER TABLE notifications 
ALTER COLUMN expires_at SET DEFAULT (now() + interval '100 years');

-- Update notifiche esistenti (escluse location_share) per non farle scadere
UPDATE notifications 
SET expires_at = now() + interval '100 years'
WHERE type NOT IN ('location_share', 'business_post', 'business_review', 'location_save', 'business_mention')
  AND expires_at < now() + interval '90 days';
```

#### B. Impostare `expires_at` Corretto per `location_share`
Nel file `src/pages/ShareLocationPage.tsx`, aggiungere esplicitamente `expires_at: 24h` alle notifiche:

```typescript
const notifications = closeFriends.map(friendId => ({
  user_id: friendId,
  type: 'location_share',
  // ... altri campi ...
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 ore
}));
```

---

## 🎨 Problema 2: Tasto "Arrivo" non Premium

### Stato Attuale
```typescript
className="px-4 h-7 text-[12px] font-semibold rounded-lg bg-primary hover:bg-primary/90"
```

Il tasto è:
- Troppo piccolo (`h-7`)
- Colore piatto senza gradiente
- Manca feedback tattile iOS
- Non ha icona

### Soluzione: Premium iOS-Style Button

```typescript
className="px-4 h-8 text-[13px] font-semibold rounded-full 
  bg-gradient-to-r from-blue-500 to-blue-600 
  hover:from-blue-600 hover:to-blue-700 
  active:scale-[0.97] 
  shadow-sm 
  text-white"
```

Miglioramenti:
- `rounded-full` per stile iOS più moderno (pill shape)
- `h-8` leggermente più alto per touch target migliore
- Gradiente blu premium
- `active:scale-[0.97]` per feedback tattile
- `shadow-sm` per profondità
- Possibilità di aggiungere un'icona 🚗 o NavigationIcon

---

## 🎨 Problema 3: Icona "Invita Amico" Sproporzionata

### Stato Attuale
Nel file `NotificationsOverlay.tsx` (linee 248-255):
```tsx
<button className="w-10 h-10 rounded-full bg-primary/10 ...">
  <img src={addFriendIcon} className="w-5 h-5" />
</button>
```

L'icona `add-friend.png` (1024x1024px) viene scalata a `w-5 h-5` (20x20px) ma visivamente sembra grande perché:
1. Il contenitore è `w-10 h-10` (40x40px)
2. L'immagine occupa metà del contenitore
3. L'icona stessa ha molto "peso visivo" (grande silhouette blu)

### Soluzione

Opzione A: **Ridurre dimensione icona e contenitore**
```tsx
<button className="w-9 h-9 rounded-full bg-primary/10 ...">
  <img src={addFriendIcon} className="w-4.5 h-4.5 opacity-90" />
</button>
```

Opzione B: **Usare icona Lucide invece dell'immagine** (più coerente con il design system)
```tsx
import { UserPlus } from 'lucide-react';

<button className="w-9 h-9 rounded-full bg-primary/10 ...">
  <UserPlus className="w-5 h-5 text-primary" />
</button>
```

**Raccomandazione**: Opzione B per coerenza con il resto dell'app.

---

## 📋 Riepilogo Modifiche

| File | Modifica | Impatto |
|------|----------|---------|
| Migration SQL | Default `expires_at` a 100 anni | 🔴 Critico |
| `src/pages/ShareLocationPage.tsx` | Aggiungere `expires_at: 24h` per location_share | 🔴 Critico |
| `src/components/notifications/MobileNotificationItem.tsx` | Premium styling tasto "Arrivo" | 🟢 UI |
| `src/components/notifications/NotificationsOverlay.tsx` | Ridimensionare icona invita amico | 🟢 UI |

---

## Dettagli Implementazione

### 1. Migration SQL

```sql
-- 1. Cambia default a 100 anni (notifiche permanenti)
ALTER TABLE notifications 
ALTER COLUMN expires_at SET DEFAULT (now() + interval '100 years');

-- 2. Aggiorna notifiche esistenti non-location_share
UPDATE notifications 
SET expires_at = now() + interval '100 years'
WHERE type NOT IN ('location_share', 'business_post', 'business_review', 'location_save', 'business_mention');
```

### 2. ShareLocationPage.tsx - Notifiche 24h

```typescript
// Linea 601-614 e 623-636
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 ore

const notifications = closeFriends.map(friendId => ({
  user_id: friendId,
  type: 'location_share',
  title: t('sharedLocation'),
  message: t('userAtLocation', { username, location: selectedLocation.name }),
  data: { ... },
  expires_at: expiresAt // NUOVO!
}));
```

### 3. MobileNotificationItem.tsx - Tasto Premium

```typescript
// Linea 1197-1213
<Button
  onClick={...}
  disabled={isLoading || !isLocationShareActive}
  size="sm"
  className="px-4 h-8 text-[13px] font-semibold rounded-full 
    bg-gradient-to-r from-blue-500 to-blue-600 
    hover:from-blue-600 hover:to-blue-700 
    active:scale-[0.97] 
    shadow-sm 
    text-white 
    transition-all duration-150
    disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
>
  {t('onMyWay', { ns: 'notifications' })}
</Button>
```

### 4. NotificationsOverlay.tsx - Icona Bilanciata

```tsx
// Linea 248-256 - Usa UserPlus da Lucide
import { UserPlus } from 'lucide-react';

<button
  onClick={() => setIsInviteOpen(true)}
  className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center 
    hover:bg-primary/20 active:scale-[0.95] transition-all duration-150"
  aria-label={t('inviteFriend', { ns: 'invite', defaultValue: 'Invite a Friend' })}
>
  <UserPlus className="w-5 h-5 text-primary" />
</button>
```

---

## Comportamento Finale

| Tipo Notifica | Durata | Prima | Dopo |
|---------------|--------|-------|------|
| `like`, `comment`, `follow` | Permanente | 30 giorni | ♾️ 100 anni |
| `follow_request`, `follow_accepted` | Permanente | 30 giorni | ♾️ 100 anni |
| `location_share` | 24 ore | 30 giorni | ✅ 24 ore |
| Business notifiche | Non mostrate | Filtrate | Invariato |

