

## Plan: Replace Remaining Loading Spinners with Skeleton UIs (Phase 2)

The first phase replaced spinners in 17 files. I've identified **14 additional files** still using loading spinners that should be replaced with skeleton UIs.

---

### Remaining Files with Loading Spinners

| File | Line | Current State | Solution |
|------|------|---------------|----------|
| `src/pages/NotificationsPage.tsx` | 147-152 | Full page spinner | Use `NotificationsSkeleton` |
| `src/components/social/LikersDrawer.tsx` | 219-222 | Modal content spinner | Create `LikersListSkeleton` |
| `src/pages/business/BusinessProfilePage.tsx` | 202-205 | Full page spinner | Create `BusinessProfileSkeleton` |
| `src/components/profile/ShareProfileModal.tsx` | 200-203 | Modal content spinner | Use `UserListSkeleton` |
| `src/components/explore/PinDetailCard.tsx` | 1778-1781, 1847-1850 | Posts/Reviews tab spinners | Use `PostsGridSkeleton` and `CommentsSkeleton` |
| `src/components/social/ShareModal.tsx` | 159-162 | Users list spinner | Use `UserListSkeleton` |
| `src/pages/business/BusinessNotificationsPage.tsx` | 146-149 | Notifications list spinner | Use `NotificationsSkeleton` |
| `src/components/profile/TaggedPostsGrid.tsx` | 60-65 | Grid loading spinner | Use `PostsGridSkeleton` |
| `src/components/admin/SeedingDashboard.tsx` | 137-140 | Dashboard spinner | Use `BusinessDashboardSkeleton` |
| `src/components/admin/LocationDataFix.tsx` | Button spinners only | Keep as-is (action feedback) |

---

### Implementation Details

#### 1. NotificationsPage.tsx (line 147-152)
Replace the centered spinner with `NotificationsSkeleton`:
```tsx
// Replace:
<div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>

// With:
<NotificationsSkeleton count={6} />
```

#### 2. LikersDrawer.tsx (line 219-222)
Use the existing `UserListSkeleton` component:
```tsx
import UserListSkeleton from '@/components/common/skeletons/UserListSkeleton';

// Replace spinner with:
<UserListSkeleton count={6} />
```

#### 3. BusinessProfilePage.tsx (line 202-205)
Create a new `BusinessProfileSkeleton` with:
- Hero image skeleton
- Business info section skeleton
- Stats cards skeleton
- Action buttons skeleton

#### 4. ShareProfileModal.tsx (line 200-203)
Use existing `UserListSkeleton`:
```tsx
import UserListSkeleton from '@/components/common/skeletons/UserListSkeleton';

// Replace spinner with:
<UserListSkeleton count={5} />
```

#### 5. PinDetailCard.tsx (lines 1778-1781, 1847-1850)
Two spinners in tab content:
- **Posts tab**: Use `PostsGridSkeleton`
- **Reviews tab**: Use `CommentsSkeleton`

```tsx
import PostsGridSkeleton from '@/components/common/skeletons/PostsGridSkeleton';
import CommentsSkeleton from '@/components/common/skeletons/CommentsSkeleton';

// Posts loading:
{postsLoading && posts.length === 0 ? (
  <PostsGridSkeleton count={4} columns={2} />
) : ...}

// Reviews loading:
{reviewsLoading ? (
  <CommentsSkeleton count={3} />
) : ...}
```

#### 6. ShareModal.tsx (line 159-162)
Use `UserListSkeleton`:
```tsx
import UserListSkeleton from '@/components/common/skeletons/UserListSkeleton';

// Replace spinner with:
<UserListSkeleton count={6} />
```

#### 7. BusinessNotificationsPage.tsx (line 146-149)
Use `NotificationsSkeleton`:
```tsx
import NotificationsSkeleton from '@/components/common/skeletons/NotificationsSkeleton';

// Replace spinner with:
<NotificationsSkeleton count={5} />
```

#### 8. TaggedPostsGrid.tsx (line 60-65)
Use `PostsGridSkeleton`:
```tsx
import PostsGridSkeleton from '@/components/common/skeletons/PostsGridSkeleton';

if (loading) {
  return <PostsGridSkeleton count={6} columns={2} />;
}
```

#### 9. SeedingDashboard.tsx (line 137-140)
Use `BusinessDashboardSkeleton`:
```tsx
import BusinessDashboardSkeleton from '@/components/common/skeletons/BusinessDashboardSkeleton';

// Replace Card with spinner:
<BusinessDashboardSkeleton />
```

---

### New Skeleton Component Needed

**`src/components/common/skeletons/BusinessProfileSkeleton.tsx`**
```tsx
// Structure:
- Full-width hero image placeholder (aspect-[3/1])
- Business avatar overlapping hero
- Business name skeleton
- Category badge skeleton  
- Stats row (3 cards)
- Action buttons row skeleton
- Menu items skeleton
```

---

### Files to Create

1. `src/components/common/skeletons/BusinessProfileSkeleton.tsx`

### Files to Modify

1. `src/pages/NotificationsPage.tsx` - Use NotificationsSkeleton
2. `src/components/social/LikersDrawer.tsx` - Use UserListSkeleton
3. `src/pages/business/BusinessProfilePage.tsx` - Use BusinessProfileSkeleton
4. `src/components/profile/ShareProfileModal.tsx` - Use UserListSkeleton
5. `src/components/explore/PinDetailCard.tsx` - Use PostsGridSkeleton + CommentsSkeleton
6. `src/components/social/ShareModal.tsx` - Use UserListSkeleton
7. `src/pages/business/BusinessNotificationsPage.tsx` - Use NotificationsSkeleton
8. `src/components/profile/TaggedPostsGrid.tsx` - Use PostsGridSkeleton
9. `src/components/admin/SeedingDashboard.tsx` - Use BusinessDashboardSkeleton

---

### Spinners Being Kept (Appropriate UX)

These spinners are inside buttons/actions and provide important feedback:

| File | Purpose |
|------|---------|
| `src/components/admin/LocationDataFix.tsx` | "Scanning..." and "Correction..." button states |
| `src/components/OptimizedPlacesAutocomplete.tsx` | Inline search loading indicator (small, non-blocking) |
| `src/components/explore/UserCard.tsx` | Follow button loading state |
| `src/components/business/NotificationComposer.tsx` | "Sending..." button state |
| `src/components/social/ShareModal.tsx` (line 281) | "Sending" button state |
| `src/pages/ShareLocationPage.tsx` | Search and submit button states |
| `src/pages/auth/SignupStart.tsx` | Username availability check (inline) |
| `src/components/home/MapSection.tsx` | "Loading locations" inline indicator |

---

### Expected Outcome

After this phase:
- 9 more components will use skeleton UIs instead of spinners
- Complete elimination of full-page/modal-blocking loading spinners
- Consistent shimmer animation across the entire app
- Perceived load time improvement across all sections

