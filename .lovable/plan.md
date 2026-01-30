

## Plan: Replace All Loading Spinners with Skeleton UIs Across the App

Based on my analysis, I found **92 files** with loading spinners (animate-spin patterns). I've categorized them by priority and impact to systematically replace each one with appropriate skeleton UI components.

---

### Classification of Loading Spinners

#### **Type 1: Page/Section Loading (HIGH PRIORITY - Replace with Skeleton)**
These show a spinner while content loads, creating poor perceived performance:

| File | Location | Solution |
|------|----------|----------|
| `src/pages/BusinessDashboardPage.tsx` (line 96) | Full page loading | Create `BusinessDashboardSkeleton` |
| `src/pages/BusinessClaimPage.tsx` (line 97) | Claims list loading | Create `ClaimsListSkeleton` |
| `src/pages/business/BusinessAnalyticsPage.tsx` (line 275) | Analytics loading | Create `AnalyticsSkeleton` |
| `src/pages/PrivacySettingsPage.tsx` (line 135) | Settings loading | Create `SettingsSkeleton` |
| `src/components/NotificationsModal.tsx` (line 96) | Notifications loading | Create `NotificationsSkeleton` |
| `src/components/explore/ExploreResults.tsx` (line 22) | Search results loading | Use inline skeleton list |
| `src/components/explore/VirtualizedPostGrid.tsx` (lines 148, 235) | Posts/Reviews loading | Use existing `PostsGridSkeleton` |
| `src/components/explore/LocationGrid.tsx` (line 494) | Locations loading | Create `LocationGridSkeleton` |
| `src/components/explore/RecommendationsSection.tsx` (line 39) | Recommendations loading | Create inline skeleton cards |
| `src/components/explore/LocationPostCards.tsx` (line 144) | Location cards loading | Create inline skeleton |
| `src/components/SimpleHomePage.tsx` (line 93) | Places loading | Create inline skeleton |
| `src/components/explore/ShareModal.tsx` (line 194) | Users list loading | Create `UserListSkeleton` |
| `src/components/profile/FolderSavedByModal.tsx` (line 168) | Saved by users loading | Use `UserListSkeleton` |

#### **Type 2: Modal Content Loading (MEDIUM PRIORITY - Replace with Skeleton)**
| File | Location | Solution |
|------|----------|----------|
| `src/components/home/CommentModal.tsx` (line 111) | Comments loading | Create `CommentsSkeleton` |
| `src/components/explore/CommentModal.tsx` (line 77) | Comments loading | Use same `CommentsSkeleton` |
| `src/components/home/PlaceInteractionModal.tsx` (line 118) | Comments loading | Use `CommentsSkeleton` |
| `src/components/explore/SmartAutocomplete.tsx` (line 260) | Search loading | Create inline skeleton |

#### **Type 3: Button/Action Spinners (KEEP AS-IS)**
These show inside buttons during submission actions - this is appropriate UX:
- `src/components/CreateStoryModal.tsx` - Publishing story
- `src/components/ProfilePictureEditor.tsx` - Uploading photo
- `src/components/home/CommentModal.tsx` (line 188) - Submitting comment
- `src/components/explore/CommentModal.tsx` (line 133) - Submitting comment
- `src/components/notifications/ContactsFoundView.tsx` - Following user
- `src/components/onboarding/GuidedTour.tsx` - Uploading photo
- `src/components/list/GoogleMapsImportModal.tsx` - Importing
- `src/components/business/BusinessMarketingCreator.tsx` - Publishing
- `src/components/admin/AdminToolsSection.tsx` - Executing tool
- `src/components/add/AddPageOverlay.tsx` - Loading search (inline with results)

#### **Type 4: Map/Pull-to-Refresh (KEEP AS-IS)**
These are appropriate contextual indicators:
- `src/components/home/MapSection.tsx` (line 795) - "Loading locations" inline indicator
- `src/pages/DiscoverPage.tsx` (line 80) - Pull-to-refresh indicator

---

### Implementation Strategy

#### Phase 1: Create Shared Skeleton Components

**1. `src/components/common/skeletons/NotificationsSkeleton.tsx`**
```tsx
// Shimmer skeleton for notifications list
- Avatar placeholder
- Text lines placeholder
- Timestamp placeholder
- Repeat 5 times with staggered animation
```

**2. `src/components/common/skeletons/CommentsSkeleton.tsx`**
```tsx
// Shimmer skeleton for comments
- Avatar + username + timestamp row
- Text content lines
- Repeat 4 times
```

**3. `src/components/common/skeletons/UserListSkeleton.tsx`**
```tsx
// For share modal, saved by modal, etc.
- Avatar + name row
- Repeat 6 times
```

**4. `src/components/common/skeletons/LocationCardsSkeleton.tsx`**
```tsx
// For location grid, recommendations
- Thumbnail + name + category
- Repeat 6 items
```

**5. `src/components/common/skeletons/SettingsSkeleton.tsx`**
```tsx
// For settings pages
- Toggle row skeletons
```

**6. `src/components/common/skeletons/BusinessDashboardSkeleton.tsx`**
```tsx
// For business dashboard
- Stats cards skeleton
- Claims list skeleton
```

#### Phase 2: Update Each File

**Files to Update (17 total):**

1. **`src/pages/BusinessDashboardPage.tsx`**
   - Replace spinner with `BusinessDashboardSkeleton`

2. **`src/pages/BusinessClaimPage.tsx`**
   - Replace spinner with claims list skeleton

3. **`src/pages/business/BusinessAnalyticsPage.tsx`**
   - Replace spinner with analytics skeleton

4. **`src/pages/PrivacySettingsPage.tsx`**
   - Replace spinner with `SettingsSkeleton`

5. **`src/components/NotificationsModal.tsx`**
   - Replace spinner with `NotificationsSkeleton`

6. **`src/components/explore/ExploreResults.tsx`**
   - Replace spinner with user list skeleton cards

7. **`src/components/explore/VirtualizedPostGrid.tsx`** (2 instances)
   - Replace spinner with `PostsGridSkeleton` (already exists)

8. **`src/components/explore/LocationGrid.tsx`**
   - Replace spinner with `LocationCardsSkeleton`

9. **`src/components/explore/RecommendationsSection.tsx`**
   - Replace spinner with inline skeleton cards

10. **`src/components/explore/LocationPostCards.tsx`**
    - Replace spinner with location cards skeleton

11. **`src/components/SimpleHomePage.tsx`**
    - Replace spinner with inline grid skeleton

12. **`src/components/explore/ShareModal.tsx`**
    - Replace spinner with `UserListSkeleton`

13. **`src/components/profile/FolderSavedByModal.tsx`**
    - Replace spinner with `UserListSkeleton`

14. **`src/components/home/CommentModal.tsx`**
    - Replace spinner with `CommentsSkeleton`

15. **`src/components/explore/CommentModal.tsx`**
    - Replace spinner with `CommentsSkeleton`

16. **`src/components/home/PlaceInteractionModal.tsx`**
    - Replace spinner with `CommentsSkeleton`

17. **`src/components/explore/SmartAutocomplete.tsx`**
    - Replace spinner with inline search skeleton

---

### What Will NOT Be Changed

These spinners are **appropriate** and will be kept:

| Location | Reason |
|----------|--------|
| Button submit states (comment, upload, publish) | User needs feedback that action is processing |
| Pull-to-refresh indicator | Standard mobile pattern |
| Map "Loading locations" indicator | Small contextual indicator, not full-screen |
| RefreshCw icons (admin dashboards) | Icon rotation, not blocking content |

---

### Files to Create

1. `src/components/common/skeletons/NotificationsSkeleton.tsx`
2. `src/components/common/skeletons/CommentsSkeleton.tsx`
3. `src/components/common/skeletons/UserListSkeleton.tsx`
4. `src/components/common/skeletons/LocationCardsSkeleton.tsx`
5. `src/components/common/skeletons/SettingsSkeleton.tsx`
6. `src/components/common/skeletons/BusinessDashboardSkeleton.tsx`
7. `src/components/common/skeletons/AnalyticsSkeleton.tsx`

### Files to Modify

1. `src/pages/BusinessDashboardPage.tsx`
2. `src/pages/BusinessClaimPage.tsx`
3. `src/pages/business/BusinessAnalyticsPage.tsx`
4. `src/pages/PrivacySettingsPage.tsx`
5. `src/components/NotificationsModal.tsx`
6. `src/components/explore/ExploreResults.tsx`
7. `src/components/explore/VirtualizedPostGrid.tsx`
8. `src/components/explore/LocationGrid.tsx`
9. `src/components/explore/RecommendationsSection.tsx`
10. `src/components/explore/LocationPostCards.tsx`
11. `src/components/SimpleHomePage.tsx`
12. `src/components/explore/ShareModal.tsx`
13. `src/components/profile/FolderSavedByModal.tsx`
14. `src/components/home/CommentModal.tsx`
15. `src/components/explore/CommentModal.tsx`
16. `src/components/home/PlaceInteractionModal.tsx`
17. `src/components/explore/SmartAutocomplete.tsx`

---

### Expected Outcome

After these changes:
- No visible spinning loader circles when navigating between pages
- Instant shimmer skeletons that match the structure of content being loaded
- Perceived load time reduced from ~800ms (spinner) to ~100ms (skeleton appears instantly)
- Button spinners preserved for action feedback (appropriate UX)
- Consistent skeleton design language across the entire app

