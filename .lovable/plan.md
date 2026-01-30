
## Plan: Improve UserProfilePage Buttons & Replace Loading Spinners with Skeletons

Based on my analysis of the codebase, I've identified two distinct improvements to implement.

---

### Issue 1: Follow Buttons Don't Match City Pills Style

**Current State:**
The follow button on UserProfilePage has a pill shape (`rounded-full`) but uses heavy gradient styling and shadows that don't match the simple, clean city filter pills aesthetic.

**City Pills Reference (from PostsGrid.tsx):**
- Active: `bg-black text-white`
- Inactive: `bg-white/80 dark:bg-white/15 text-gray-600 shadow-sm backdrop-blur-sm border border-white/50`
- Size: `px-4 py-2 rounded-full text-sm font-semibold`

**Current Button Style (UserProfilePage lines 288-301):**
- Uses heavy gradients (`bg-gradient-to-b from-blue-500...`)
- Complex shadows (`shadow-[0_4px_14px_rgba(37,99,235,0.35)]`)
- Doesn't match the clean, minimal aesthetic of city pills

**Proposed Changes:**

1. **Follow Button** - Match city pill style:
   - Not following: `bg-black text-white` (solid, like active city pill)
   - Already following: `bg-white/80 text-gray-700 border border-white/50 shadow-sm backdrop-blur-sm`
   - Pending request: Same as "already following" with slightly different text color

2. **Message Button** - Cleaner style:
   - Match the inactive pill aesthetic: `bg-white/80 backdrop-blur-sm border border-white/50 shadow-sm`

---

### Issue 2: Loading Spinners Create Poor UX

**Current State:**
UserProfilePage shows a spinning loader while data loads (lines 245-254), creating an unpleasant "loading wheel" experience when navigating between pages.

**Better Approach (already used in ProfilePage):**
ProfilePage uses `ProfileSkeleton` which shows a structural skeleton UI with shimmer animation, giving immediate visual feedback while content loads.

**Proposed Changes:**

1. **Create UserProfileSkeleton component** - Similar to ProfileSkeleton but adapted for the UserProfilePage layout:
   - Back arrow placeholder
   - Username skeleton in header
   - Avatar skeleton
   - Stats row skeleton (horizontal layout)
   - Category cards skeleton row
   - Tabs skeleton
   - Posts grid skeleton with shimmer animation

2. **Replace spinner in UserProfilePage** - Use the new skeleton instead of the spinner for a much smoother perceived loading experience.

---

### Technical Implementation

**File: `src/components/profile/UserProfileSkeleton.tsx`** (New File)
Create a skeleton component matching UserProfilePage layout with shimmer animation.

**File: `src/components/UserProfilePage.tsx`**

1. **Update button styling (lines 288-316):**
```tsx
// Follow Button - City pill style
<Button
  onClick={handleFollowToggle}
  disabled={followLoading}
  className={cn(
    "rounded-full font-semibold h-9 px-5 text-sm transition-all duration-200 active:scale-[0.97]",
    profile.is_following 
      ? "bg-white/80 dark:bg-white/15 text-gray-700 dark:text-gray-200 border border-white/50 dark:border-white/20 shadow-sm backdrop-blur-sm hover:bg-white/90 dark:hover:bg-white/20" 
      : profile.follow_request_status === 'pending'
        ? "bg-white/80 dark:bg-white/15 text-gray-500 dark:text-gray-300 border border-white/50 dark:border-white/20 shadow-sm backdrop-blur-sm"
        : "bg-black text-white hover:bg-gray-900"
  )}
>
  {getFollowButtonText()}
</Button>

// Message Button - Pill style
<Button 
  variant="ghost" 
  size="icon" 
  className="h-9 w-9 rounded-full bg-white/80 dark:bg-white/15 hover:bg-white/90 dark:hover:bg-white/20 border border-white/50 dark:border-white/20 shadow-sm backdrop-blur-sm transition-all duration-200 active:scale-[0.95]" 
  onClick={...}
>
  <MessageCircle className="w-4 h-4 text-gray-700 dark:text-gray-200" />
</Button>
```

2. **Replace loading spinner with skeleton (lines 245-254):**
```tsx
import UserProfileSkeleton from './profile/UserProfileSkeleton';

if (loading) {
  return <UserProfileSkeleton />;
}
```

---

### Files to Modify

1. **`src/components/profile/UserProfileSkeleton.tsx`** (New) - Skeleton component with shimmer animation
2. **`src/components/UserProfilePage.tsx`** - Update button styling + replace spinner with skeleton

---

### Expected Outcome

After these changes:
- Follow/Message buttons will have a clean, minimal pill style matching the city filter chips
- Page transitions will feel instant with skeleton UI instead of spinning loaders
- Consistent visual language across the app
- Perceived load time reduced from ~800ms (spinner) to ~100ms (skeleton appears instantly)
