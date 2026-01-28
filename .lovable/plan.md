
# User Location Marker "Falling from Sky" Animation

## Overview

Update the drop-in animation for the user location marker to create a perspective effect of falling from the sky. Instead of sliding down from the top of the screen, the marker will start large (as if high in the sky, closer to the viewer) and progressively shrink to its normal size (as if landing on the ground, further from the viewer).

## Current vs New Animation

| Phase | Current Animation | New Animation |
|-------|------------------|---------------|
| Start | Small (0.5x), off-screen top | Large (2.5x), slightly above position |
| Middle | Slides down, grows | Shrinks progressively |
| End | Normal size (1x), bounces | Normal size (1x), subtle landing bounce |

## Animation Concept

The "falling from sky" effect uses scale to simulate perspective:
- Start at scale(2.5) - person appears large because they're "close" (high in sky looking down)
- Progressively shrink through scale(1.8) -> scale(1.3) -> scale(1)
- Final position is normal size, creating the illusion they've landed on the ground
- Add a slight translateY offset at start so they don't appear from exact center
- Include a subtle "impact" bounce at the end

## Technical Details

### New Keyframes

```text
@keyframes user-drop-in {
  0% {
    transform: scale(2.5) translateY(-20px);
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  60% {
    transform: scale(1.3) translateY(5px);
  }
  80% {
    transform: scale(0.95) translateY(-3px);  /* slight bounce */
  }
  100% {
    transform: scale(1) translateY(0);
  }
}
```

### Shadow Animation Update

The landing shadow will grow as the person "approaches" the ground:
- Start at 0% opacity and small scale
- Grow and darken as the marker shrinks (person gets closer to ground)
- Slight fade after landing

### Animation Timing

- Duration: ~0.9s (slightly longer for smoother shrink effect)
- Easing: Custom cubic-bezier for natural falling deceleration

## File to Modify

| File | Changes |
|------|---------|
| `src/utils/leafletMarkerCreator.ts` | Update the `@keyframes user-drop-in` animation to use scale-based perspective effect instead of translateY movement |
