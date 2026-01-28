

## Optimization Plan: Enhanced Post Loading with Skeleton UI

### Current State Analysis

The existing implementation already has solid foundations:
- `useOptimizedPosts` with paginated `useInfiniteQuery` (12 posts per page)
- `VirtualizedPostGrid` with `@tanstack/react-virtual` for row virtualization
- Basic `TabContentSkeleton` with simple skeleton placeholders

However, there are significant improvements possible:

**Issue 1: Simple Loading Spinner**
The current loading state shows a basic spinning circle (`border-2 border-blue-600 border-t-transparent rounded-full animate-spin`) which provides no content preview.

**Issue 2: No Progressive Image Loading**
Images load with a jarring appearance - no blur-up effect, no low-quality placeholders.

**Issue 3: Skeleton Doesn't Match Content Layout**
The skeleton shows 6 identical gray squares, but doesn't simulate realistic post content (varying heights, hover states, etc.)

---

### Proposed Improvements

#### 1. Enhanced Skeleton Grid with Shimmer Animation

Create a more engaging skeleton that simulates real content:

```text
+------------------+------------------+
|  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓  |  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓  |  <- Shimmer effect
|  (with badge)    |  (with badge)    |      animates across
|  ▓▓▓▓▓           |  ▓▓▓▓▓           |
+------------------+------------------+
|  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓  |  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓  |
|                  |  (with badge)    |
|  ▓▓▓▓▓           |  ▓▓▓▓▓           |
+------------------+------------------+
```

The skeleton cards will include:
- Multi-image badge placeholder (top-right corner)
- Hover overlay simulation with likes/comments icons
- Staggered shimmer animation for visual interest

#### 2. Progressive Image Loading with Blur-Up Effect

Each post image will:
1. Start with a gradient placeholder matching the post's dominant color (if available) or a subtle gray
2. Apply a blur filter that animates away as the image loads
3. Use `loading="lazy"` and `decoding="async"` for browser-level optimization

#### 3. Optimistic Rendering with Skeleton Swap

Instead of showing a spinner, immediately render skeleton cards that:
- Transform smoothly into real content as data arrives
- Use CSS transitions for fade-in effects
- Maintain exact layout dimensions to prevent layout shifts

---

### Technical Implementation

#### File: `src/components/profile/PostsGridSkeleton.tsx` (New)

A dedicated skeleton component with:
- Shimmer animation using CSS gradients
- Randomized badge placeholders (some cards show multi-image indicator, some don't)
- Filter dropdown skeleton
- Staggered animation delays

```typescript
// Example structure
const PostsGridSkeleton = () => (
  <div className="px-4">
    {/* Filter skeleton */}
    <Skeleton className="h-6 w-20 mb-4" />
    
    {/* Grid with shimmer */}
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div 
          key={i} 
          className="relative aspect-square rounded-xl overflow-hidden bg-muted"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {/* Shimmer overlay */}
          <div className="absolute inset-0 shimmer-animation" />
          
          {/* Random badge placeholder */}
          {i % 3 === 0 && (
            <div className="absolute top-2 right-2 bg-muted-foreground/20 rounded-full w-8 h-5" />
          )}
          
          {/* Hover overlay skeleton */}
          <div className="absolute bottom-0 left-0 right-0 p-3 opacity-50">
            <div className="flex gap-2">
              <div className="bg-muted-foreground/20 rounded-full w-10 h-5" />
              <div className="bg-muted-foreground/20 rounded-full w-10 h-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
```

#### File: `tailwind.config.ts` - Add Shimmer Animation

```typescript
keyframes: {
  shimmer: {
    '0%': { transform: 'translateX(-100%)' },
    '100%': { transform: 'translateX(100%)' }
  }
},
animation: {
  shimmer: 'shimmer 1.5s infinite'
}
```

#### File: `src/components/profile/PostsGrid.tsx` Updates

- Replace spinner with `PostsGridSkeleton`
- Add CSS classes for smooth content reveal

```typescript
if (loading) {
  return <PostsGridSkeleton />;
}
```

#### File: `src/components/profile/VirtualizedPostGrid.tsx` Updates

Add progressive image loading to `PostItem`:

```typescript
const PostItem = memo(({ post, ... }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  return (
    <div className="relative aspect-square rounded-xl overflow-hidden">
      {/* Skeleton placeholder - visible until image loads */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      <img
        src={post.media_urls[0]}
        alt={post.caption || 'Post'}
        className={cn(
          "w-full h-full object-cover transition-all duration-300",
          imageLoaded ? "opacity-100 blur-0" : "opacity-0 blur-sm"
        )}
        loading="lazy"
        decoding="async"
        onLoad={() => setImageLoaded(true)}
        onError={(e) => {
          setImageLoaded(true);
          (e.target as HTMLImageElement).src = '/placeholder.svg';
        }}
      />
      {/* ... rest of overlay content */}
    </div>
  );
});
```

#### File: `src/components/profile/TabContentSkeleton.tsx` Updates

Enhance with shimmer and more realistic layout:

```typescript
const TabContentSkeleton = () => (
  <div className="px-4 py-4">
    <Skeleton className="h-6 w-20 mb-4" />
    
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div 
          key={i} 
          className="aspect-square rounded-xl bg-muted relative overflow-hidden"
        >
          {/* Shimmer effect */}
          <div 
            className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />
        </div>
      ))}
    </div>
  </div>
);
```

---

### CSS Additions for `src/index.css`

```css
/* Shimmer animation for skeletons */
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.shimmer-skeleton {
  position: relative;
  overflow: hidden;
}

.shimmer-skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  animation: shimmer 1.5s infinite;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
}
```

---

### Files to Modify

| File | Change Type |
|------|-------------|
| `src/components/profile/PostsGridSkeleton.tsx` | **New** - Dedicated skeleton with shimmer |
| `src/components/profile/PostsGrid.tsx` | Replace spinner with skeleton component |
| `src/components/profile/VirtualizedPostGrid.tsx` | Add progressive image loading with blur-up |
| `src/components/profile/TabContentSkeleton.tsx` | Enhance with shimmer animation |
| `src/index.css` | Add shimmer keyframes |

---

### Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Perceived load time | ~800ms (spinner) | ~100ms (skeleton appears instantly) |
| Content layout shift | Visible | Zero (skeleton matches content) |
| Image loading feel | Jarring pop-in | Smooth blur-to-clear transition |
| User engagement | Loading anxiety | Content anticipation |

