
# Apply Unified Frosted Glass Background App-Wide

## Overview
Create a reusable background component with the enhanced frosted glass effect from the Explore page and apply it consistently across all app pages, **excluding** pages that use the map as their background (Home page and its overlays).

---

## 1. Create Shared Background Component

### New File: `src/components/common/FrostedGlassBackground.tsx`

A reusable component that renders the multi-layer frosted glass effect:

```text
┌─────────────────────────────────────────┐
│  Layer 5: Grain/Noise (subtle texture)  │
├─────────────────────────────────────────┤
│  Layer 4: Frosted Glass (backdrop-blur) │
├─────────────────────────────────────────┤
│  Layer 3: Vignette (radial gradient)    │
├─────────────────────────────────────────┤
│  Layer 2: Vertical Gradient             │
├─────────────────────────────────────────┤
│  Layer 1: Warm Base Color               │
└─────────────────────────────────────────┘
```

**Light Mode Colors:**
- Base: `#F7F3EC` (warm off-white)
- Gradient: `#FAF8F5` → `#F7F3EC` → `#F0EBE3`
- Glass: `bg-white/40 backdrop-blur-xl`

**Dark Mode Colors:**
- Base: `bg-background/40 backdrop-blur-xl` (matching Add page exactly)
- This creates the authentic glass effect using theme variables

---

## 2. Pages to Update

### Pages WITH Map Background (DO NOT CHANGE)
These pages use the Home map as their underlying background:
- `/` - Home Page (Index → HomePage)
- Add overlay (AddPageOverlay - uses `bg-background/40 backdrop-blur-xl`)
- Notifications overlay
- Messages overlay

### Pages TO UPDATE with Frosted Glass Background

| Page | File | Current Background |
|------|------|-------------------|
| Explore | `ExplorePage.tsx` | ✅ Already has it (source pattern) |
| Feed | `FeedPage.tsx` | Gradient + frosted glass (update to match) |
| Profile | `ProfilePage.tsx` | Gradient + frosted glass (update to match) |
| User Profile | `UserProfilePage.tsx` | `bg-background` only |
| Leaderboard | `LeaderboardPage.tsx` | Gradient + frosted glass (update to match) |
| Settings | `SettingsPage.tsx` | `bg-background` only |
| Rewards | `RewardsPage.tsx` | `bg-background` only |
| Discover | `DiscoverPage.tsx` | No background styling |

---

## 3. Implementation Details

### 3.1 Create the Shared Component

**src/components/common/FrostedGlassBackground.tsx**

```tsx
interface Props {
  className?: string;
}

const FrostedGlassBackground = ({ className }: Props) => {
  return (
    <div className={`absolute inset-0 z-0 ${className || ''}`}>
      {/* Warm base */}
      <div className="absolute inset-0 bg-[#F7F3EC] dark:bg-background" />
      {/* Subtle vertical gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F5] via-[#F7F3EC] to-[#F0EBE3] dark:from-transparent dark:via-transparent dark:to-transparent" />
      {/* Faint vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.04)_100%)] dark:opacity-30" />
      {/* Frosted glass overlay */}
      <div className="absolute inset-0 bg-white/40 dark:bg-background/40 backdrop-blur-xl" />
      {/* Subtle grain */}
      <div 
        className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,...")`
        }}
      />
    </div>
  );
};
```

### 3.2 Update Each Page

**FeedPage.tsx** (lines ~544-552):
- Replace current gradient + frosted glass layers with `<FrostedGlassBackground />`
- Keep content wrapper as `relative z-10`

**ProfilePage.tsx** (lines ~154-162):
- Replace current gradient + frosted glass layers with `<FrostedGlassBackground />`
- Keep content wrapper as `relative z-10`

**LeaderboardPage.tsx** (lines ~48-56):
- Replace current gradient + frosted glass layers with `<FrostedGlassBackground />`
- Keep content wrapper as `relative z-10`

**UserProfilePage.tsx** (line ~225):
- Add `<FrostedGlassBackground />` at start of return
- Change `bg-background` to just `relative`
- Wrap content in `relative z-10`

**SettingsPage.tsx** (line ~146):
- Add `<FrostedGlassBackground />` at start of return
- Change `bg-background` to `relative`
- Wrap content in `relative z-10`

**RewardsPage.tsx** (line ~95):
- Add `<FrostedGlassBackground />` at start of return
- Change `bg-background` to `relative`
- Wrap content in `relative z-10`

**DiscoverPage.tsx** (line ~63):
- Add `<FrostedGlassBackground />` at start of return
- Wrap content in `relative z-10`

---

## 4. Dark Mode Consistency

The key insight from the Add page pattern:
```tsx
bg-background/40 backdrop-blur-xl
```

This uses CSS variables (`--background`) which automatically adapts to the theme, creating a true frosted glass effect that shows content behind it.

For dark mode, we use:
- `dark:bg-background` as base (solid fallback)
- `dark:bg-background/40 backdrop-blur-xl` for the glass layer
- No custom dark blue colors - let the theme handle it

---

## 5. Files to Modify

| File | Action |
|------|--------|
| `src/components/common/FrostedGlassBackground.tsx` | **CREATE** - Shared background component |
| `src/pages/FeedPage.tsx` | **UPDATE** - Replace background layers |
| `src/components/ProfilePage.tsx` | **UPDATE** - Replace background layers |
| `src/pages/LeaderboardPage.tsx` | **UPDATE** - Replace background layers |
| `src/components/UserProfilePage.tsx` | **UPDATE** - Add background |
| `src/pages/SettingsPage.tsx` | **UPDATE** - Add background |
| `src/pages/RewardsPage.tsx` | **UPDATE** - Add background |
| `src/pages/DiscoverPage.tsx` | **UPDATE** - Add background |
| `src/components/ExplorePage.tsx` | **UPDATE** - Use shared component |

---

## 6. Visual Result

All pages (except map-based Home) will have:
- **Light Mode**: Warm off-white frosted glass with subtle grain
- **Dark Mode**: Authentic glass effect using theme colors (matching Add page)
- **Consistent visual language** across the entire app
- **Performance**: Single reusable component, no code duplication
