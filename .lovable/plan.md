

# Piano: Premium iOS-Style Back Buttons e UX Improvements

## Analisi Attuale

Dall'esplorazione del codice, ho identificato **3 stili diversi di back button** attualmente in uso:

| Stile Attuale | Pagine | Problema |
|---------------|--------|----------|
| `ArrowLeft` semplice senza sfondo | SettingsPage, NotificationsPage, RewardsPage, UserProfilePage | Poco visibile, nessun feedback tattile |
| `ChevronLeft` con Button ghost | LeaderboardPage | Inconsistente con gli altri |
| SVG custom inline | PostDetailModalMobile | Non riutilizzabile |

**Problemi identificati:**
1. Nessun active state sui back buttons
2. Inconsistenza tra ArrowLeft e ChevronLeft
3. Mancanza di sfondo/blur per visibilità
4. Nessun feedback haptic al tap

---

## Soluzione: Componente BackButton Riutilizzabile

### 1. Nuovo Componente `BackButton.tsx`

Creare un componente iOS-style standardizzato:

```tsx
// src/components/common/BackButton.tsx
import { ChevronLeft } from 'lucide-react';
import { haptics } from '@/utils/haptics';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  variant?: 'default' | 'blur' | 'solid';
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  label,
  variant = 'default',
  className
}) => {
  const handleClick = () => {
    haptics.impact('light');
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-1 transition-all duration-150",
        "active:scale-[0.95] active:opacity-70",
        variant === 'blur' && "px-2 py-1.5 rounded-full bg-white/60 dark:bg-white/10 backdrop-blur-md shadow-sm border border-white/30 dark:border-white/10",
        variant === 'solid' && "px-2 py-1.5 rounded-full bg-muted/80 shadow-sm",
        variant === 'default' && "p-2 -ml-2 rounded-full hover:bg-muted/50",
        className
      )}
      aria-label="Go back"
    >
      <ChevronLeft className={cn(
        "text-foreground transition-transform",
        variant === 'default' ? "w-6 h-6" : "w-5 h-5"
      )} />
      {label && (
        <span className="text-sm font-medium text-foreground pr-1">{label}</span>
      )}
    </button>
  );
};
```

**Caratteristiche iOS-premium:**
- **ChevronLeft** (iOS standard) invece di ArrowLeft
- **Active scale** `active:scale-[0.95]` per feedback tattile
- **Haptic feedback** integrato
- **3 varianti**: default, blur (glassmorphism), solid
- **Supporto per label** opzionale (es: "< Back" o "< Settings")

---

### 2. Nuova Animazione CSS per Transizioni

**File**: `src/index.css`

Aggiungere una sottile animazione per il chevron al press:

```css
/* iOS-style back button chevron animation */
@keyframes chevron-press {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(-2px); }
}

.back-button-chevron:active {
  animation: chevron-press 150ms ease-out;
}

/* Smooth slide transition for page navigation */
@keyframes slide-in-from-right {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slide-out-to-right {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
}

.animate-slide-in-right {
  animation: slide-in-from-right 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.animate-slide-out-right {
  animation: slide-out-to-right 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
```

---

### 3. Aggiornamento Pagine Esistenti

**Pagine da aggiornare** (usando il nuovo BackButton):

| Pagina | Da | A |
|--------|----|----|
| `SettingsPage.tsx` | ArrowLeft semplice | `<BackButton variant="default" />` |
| `NotificationsPage.tsx` | ArrowLeft con Button ghost | `<BackButton variant="default" />` |
| `LeaderboardPage.tsx` | ChevronLeft con Button ghost | `<BackButton variant="default" />` |
| `RewardsPage.tsx` | ArrowLeft semplice | `<BackButton variant="default" />` |
| `UserProfilePage.tsx` | ArrowLeft senza padding | `<BackButton variant="default" />` |
| `PostDetailModalMobile.tsx` | SVG custom | `<BackButton variant="blur" label={backLabel} />` |
| `SwipeDiscovery.tsx` | ArrowLeft semplice | `<BackButton variant="default" />` |
| `EditProfileModal.tsx` | ArrowLeft semplice | `<BackButton variant="default" />` |
| `LanguageModal.tsx` | ArrowLeft semplice | `<BackButton variant="default" />` |
| `PostEditor.tsx` | ArrowLeft con rounded-lg | `<BackButton variant="default" />` |

---

### 4. Ulteriori Miglioramenti UX Premium

#### A. Segmented Controls iOS-Style

**File**: `src/components/ui/segmented-control.tsx` (nuovo)

Per tab/toggle come in LeaderboardPage, ExplorePage:

```tsx
interface SegmentedControlProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options, value, onChange
}) => (
  <div className="flex rounded-xl bg-muted/50 p-1 gap-1">
    {options.map(opt => (
      <button
        key={opt.value}
        onClick={() => {
          haptics.selection();
          onChange(opt.value);
        }}
        className={cn(
          "flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all duration-200",
          "active:scale-[0.97]",
          value === opt.value 
            ? "bg-background shadow-sm text-foreground" 
            : "text-muted-foreground"
        )}
      >
        {opt.label}
      </button>
    ))}
  </div>
);
```

#### B. Pull-to-Refresh Indicator Premium

**File**: `src/components/common/PullToRefreshIndicator.tsx` (nuovo)

Aggiungere un indicatore iOS-style durante il pull:

```tsx
export const PullToRefreshIndicator: React.FC<{ progress: number }> = ({ progress }) => (
  <div 
    className="flex items-center justify-center py-4"
    style={{ opacity: Math.min(progress, 1) }}
  >
    <div 
      className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full"
      style={{ 
        transform: `rotate(${progress * 360}deg)`,
        animation: progress >= 1 ? 'spin 0.8s linear infinite' : 'none'
      }}
    />
  </div>
);
```

#### C. Sheet/Modal Header Standard

Standardizzare gli header delle modali con pattern iOS:

```tsx
// Pattern da applicare a tutte le Sheet/Modal
<SheetHeader className="px-4 py-3 border-b border-border/20">
  <div className="flex items-center justify-between">
    <BackButton onClick={onClose} />
    <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
    <div className="w-10" /> {/* Spacer per centrare il titolo */}
  </div>
</SheetHeader>
```

#### D. Floating Action Button Consistency

Standardizzare i FAB (come il bottone "+" per aggiungere):

```tsx
// Pattern FAB iOS-style
<button className={cn(
  "fixed bottom-24 right-4 z-40",
  "w-14 h-14 rounded-full",
  "bg-primary text-primary-foreground",
  "shadow-lg shadow-primary/30",
  "flex items-center justify-center",
  "active:scale-[0.92] transition-transform duration-150",
  "active:shadow-md"
)}>
  <Plus className="w-6 h-6" />
</button>
```

---

## Riepilogo File da Modificare

| File | Modifica |
|------|----------|
| `src/components/common/BackButton.tsx` | **NUOVO** - Componente riutilizzabile |
| `src/index.css` | Aggiungere animazioni chevron e slide |
| `src/pages/SettingsPage.tsx` | Usare BackButton |
| `src/pages/NotificationsPage.tsx` | Usare BackButton |
| `src/pages/LeaderboardPage.tsx` | Usare BackButton |
| `src/pages/RewardsPage.tsx` | Usare BackButton |
| `src/components/UserProfilePage.tsx` | Usare BackButton |
| `src/components/explore/PostDetailModalMobile.tsx` | Usare BackButton con variant="blur" |
| `src/components/home/SwipeDiscovery.tsx` | Usare BackButton |
| `src/components/settings/EditProfileModal.tsx` | Usare BackButton |
| `src/components/settings/LanguageModal.tsx` | Usare BackButton |
| `src/components/add/PostEditor.tsx` | Usare BackButton |
| `src/pages/MessagesPage.tsx` | Usare BackButton |

---

## Priorità di Implementazione

1. **Alta**: Creare `BackButton.tsx` + animazioni CSS
2. **Alta**: Aggiornare le pagine principali (Settings, Notifications, Profile)
3. **Media**: Aggiornare modali e sheet (EditProfile, Language, etc.)
4. **Bassa**: Creare SegmentedControl e PullToRefreshIndicator

Queste modifiche renderanno la navigazione **consistente, premium e tattile** su tutta l'app, seguendo le iOS Human Interface Guidelines.

