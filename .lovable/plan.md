
# Map Centering & User Avatar Drop-in Animation

## Overview

This plan addresses two user requests:
1. **Fresh session centering** - When opening the app from closed, center the map on the user's current GPS position (not a previously saved position)
2. **Drop-in animation** - Add a visually engaging animation where the user's location marker "drops" from the top of the screen to their position on the map after the intro video ends

## Problem Analysis

### Current Map Centering Behavior
The app currently persists the last map center to localStorage and restores it on app open:
- `useHomePageState.ts` line 84-90: Reads `lastMapCenter` from localStorage as initial state
- `HomePage.tsx` line 362-367: Checks localStorage and sets `hasInitializedLocation = true` to prevent overwriting
- This causes the map to show the *previous* location instead of the user's *current* position

### Current Location Marker
- Created via `createCurrentLocationMarker()` in `leafletMarkerCreator.ts`
- Displays the `/images/location-person.png` image with a direction cone
- No entrance animation currently exists

---

## Implementation Plan

### Task 1: Fresh Session Map Centering

**Concept**: Clear the saved map center when the app loads fresh so the map always centers on the user's GPS position on app open.

**File**: `src/pages/Index.tsx`

Changes:
- When splash screen is about to show (fresh app open), clear `lastMapCenter` from localStorage
- This ensures `useHomePageState` falls back to the default position initially
- The geolocation effect in HomePage will then update to the fresh GPS location

**File**: `src/hooks/useHomePageState.ts`

Changes:
- Check for a `freshSession` flag in sessionStorage
- If set, ignore localStorage and wait for fresh GPS

**File**: `src/components/HomePage.tsx`

Changes:
- When `freshSession` flag is detected, force-fetch GPS and center map on that position
- Clear the flag after centering

### Task 2: User Location Drop-in Animation

**Concept**: When the home page first loads after splash, the user location marker should animate from above the viewport down to its actual position, creating a "parachuting in" effect.

**File**: `src/utils/leafletMarkerCreator.ts`

Changes:
- Add an optional `animate` parameter to `createCurrentLocationMarker()`
- When `animate = true`, add CSS keyframe animation for drop-in effect:
  - Start position: translateY(-100vh) (off-screen top)
  - End position: translateY(0) (final position)
  - Add a subtle bounce at the end
  - Include a small "landing shadow" that grows as the marker drops

**File**: `src/components/LeafletMapSetup.tsx`

Changes:
- Track if this is the first render after splash via a ref or sessionStorage flag
- Pass `animate: true` to `createCurrentLocationMarker()` on first render only
- Clear the flag so subsequent renders don't re-animate

**File**: `src/pages/Index.tsx`

Changes:
- Set a sessionStorage flag `shouldAnimateUserMarker: true` just before splash completes
- This signals to the map component to play the drop-in animation

---

## Technical Details

### Animation Keyframes

The drop-in animation will include:
1. **Fall phase** (0-70%): Marker drops from above screen with acceleration
2. **Bounce phase** (70-85%): Small overshoot past final position
3. **Settle phase** (85-100%): Returns to exact final position with easing

```text
@keyframes user-drop-in {
  0% {
    transform: translateY(-100vh) scale(0.5);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  70% {
    transform: translateY(10px) scale(1.1);
  }
  85% {
    transform: translateY(-5px) scale(0.95);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}
```

### Shadow/Impact Effect

A subtle expanding circle under the marker during landing:
- Starts at 0% opacity and 0 size when marker is high
- Grows and becomes visible as marker approaches ground
- Fades away after landing

### Session Detection Logic

```text
Index.tsx (on splash start):
  - sessionStorage.set('freshSession', 'true')
  - sessionStorage.set('shouldAnimateUserMarker', 'true')
  - localStorage.remove('lastMapCenter')

HomePage.tsx (on mount):
  - Check 'freshSession' flag
  - If true: wait for GPS, center map, clear flag

LeafletMapSetup.tsx (on location marker creation):
  - Check 'shouldAnimateUserMarker' flag  
  - If true: create marker with drop animation
  - Clear flag after animation completes (~1s)
```

---

## Expected Results

| Scenario | Before | After |
|----------|--------|-------|
| App opened fresh | Shows last viewed location | Centers on current GPS position |
| Location marker appearance | Instant/static | Drops from top with bounce animation |
| Subsequent map views | No animation | No animation (only plays once per session) |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Set session flags, clear saved map center |
| `src/hooks/useHomePageState.ts` | Detect fresh session, ignore stale localStorage |
| `src/components/HomePage.tsx` | Force GPS centering on fresh session |
| `src/utils/leafletMarkerCreator.ts` | Add drop-in animation CSS and parameter |
| `src/components/LeafletMapSetup.tsx` | Trigger animation on first location marker render |
