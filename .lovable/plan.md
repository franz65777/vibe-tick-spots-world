
## Goal
Remove any chance of seeing a loading spinner (“Loading…”) and/or the bottom navigation bar before the intro video is visible. The splash/video must be the first thing users see on app open (for authenticated sessions), with no UI “flash”.

---

## What’s happening now (root causes)

### A) Spinner + “Loading…” before the video
This is coming from **`ProtectedRoute`**:
- `src/components/ProtectedRoute.tsx` currently renders a centered spinner + “Loading...” whenever `useAuth().loading === true`.
- During a cold start, auth resolution can take a moment, so this screen appears briefly *before* React reaches `Index` and shows `SplashScreen`.

### B) Bottom navigation bar flashes behind/around splash
This is coming from **`AuthenticatedLayout`**:
- `src/components/AuthenticatedLayout.tsx` always renders the bottom nav (unless `shouldHideNav` is true).
- `Index` can render the splash video, but the layout’s nav is outside the Outlet and can still appear (it’s fixed to the bottom).
- Right now, `shouldHideNav` has no awareness of “splash active / app initializing”.

---

## Implementation plan (safe, minimal, aligned with existing patterns)

### 1) Remove the pre-splash loader UI in `ProtectedRoute`
**File:** `src/components/ProtectedRoute.tsx`

**Change:**
- Replace the current spinner “Loading...” screen with a completely blank, solid background (same as you already do in `Index` while initializing), e.g.:
  - `return <div className="fixed inset-0 bg-background" />;`

**Why:**
- This guarantees there is never a visible spinner/count text before the splash.
- This is the smallest change that fixes the “loading count” flash.

**Edge cases:**
- If auth takes longer than usual, users will see a blank background (not a spinner). That matches your requirement (“video should load only”, or at least “no other UI should appear”).

---

### 2) Hide bottom navigation while the splash (or initialization gate) is active
You already use **DOM attribute observation** patterns for map expansion / modals:
- `AuthenticatedLayout` watches body attributes like `data-map-expanded`, `data-folder-modal-open`, etc.

We’ll extend that same pattern for splash.

#### 2a) Add a `data-splash-open` attribute while splash should be the only UI
**File:** `src/pages/Index.tsx`

**Change:**
- When `showSplash === true`, set:
  - `document.body.setAttribute('data-splash-open', 'true')`
- When the splash completes (inside `handleSplashComplete`) and also when the component unmounts, remove it:
  - `document.body.removeAttribute('data-splash-open')`

**Also important:**
- While `!initialized || loading` (the “don’t render anything yet” gate), also set `data-splash-open=true` to ensure nav can’t appear during that short decision window.

**Why:**
- This makes “splash mode” a single source of truth for the layout to hide nav.
- It prevents any nav flash even if Outlet is temporarily blank.

#### 2b) Teach `AuthenticatedLayout` to hide nav when `data-splash-open` is set
**File:** `src/components/AuthenticatedLayout.tsx`

**Change:**
- Add a new state: `isSplashOpen`.
- Add a MutationObserver similar to the others, watching `document.body` for `data-splash-open`.
- Include `isSplashOpen` in `shouldHideNav`.

**Why:**
- This ensures bottom navigation is hidden for the entire splash lifecycle and during the initialization gate, not just based on route.

---

### 3) Ensure splash video becomes visible immediately (avoid “blank background” inside splash)
You already do:
- Show solid bg until `onCanPlay` fires, then fade in the video.

We’ll tighten this to reduce perceived “blank” and avoid any “loading circle” perception.

**File:** `src/components/SplashScreen.tsx`

**Adjustments:**
- Consider swapping `onCanPlay` to `onCanPlayThrough` (or additionally listen to it) if the video is still briefly black/blank while “ready”.
- Keep the fallback background, but optionally add a very subtle branded static poster (not a spinner) if you want something more polished while buffering. (If you truly want “video only”, keep background only.)

**Note:** This step is optional; the real spinner issue is `ProtectedRoute`, and nav flash is `AuthenticatedLayout`.

---

## Verification checklist (what you should observe after)
1. Hard refresh / cold start while logged in:
   - No spinner.
   - No “Loading…” text.
   - No bottom navigation bar flash.
   - Splash video is the first visible UI.
2. Slow network throttling (if you test):
   - Still no spinner or nav.
   - Only solid background until video is ready, then video.
3. Splash completes:
   - Home renders normally and nav returns as expected.

---

## Files to change
- `src/components/ProtectedRoute.tsx`
  - Replace loading spinner screen with blank `bg-background`.
- `src/pages/Index.tsx`
  - Set/remove `document.body` attribute `data-splash-open` during splash + initialization gate.
- `src/components/AuthenticatedLayout.tsx`
  - Observe `data-splash-open` and include it in `shouldHideNav`.
- (Optional polish) `src/components/SplashScreen.tsx`
  - Improve “video ready” detection to minimize any blank time within splash.

---

## Why this approach is best for your app
- It uses the same “body attribute + MutationObserver” pattern you already rely on for hiding nav in other UI states.
- It avoids risky refactors of routing/auth flow.
- It guarantees “no other UI” can render above/below splash, even if auth resolution timing changes.
