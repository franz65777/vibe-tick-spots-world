

## Plan: Update UserProfilePage to Match ProfilePage Design & Functionality

The current `UserProfilePage` is significantly behind the `ProfilePage` implementation. This plan will bring feature and visual parity between both pages.

---

### Current Differences Identified

| Feature | ProfilePage | UserProfilePage |
|---------|-------------|-----------------|
| **Stats Layout** | Horizontal: "6 Follower 4 Seguiti 19 Salvati" | Vertical: "6 Follower" below each number |
| **Coins Display** | Hidden for other users via `hideCoins` | Still visible in Achievements tab modal |
| **Tab Swipe Navigation** | Uses `SwipeableTabContent` for iOS-style swiping | Direct rendering, no swipe support |
| **Tab Bar Hide on Scroll** | Uses `useScrollHide` - tabs hide when scrolling | Tabs always visible |
| **Category Cards Styling** | Modern glass: `bg-white/60 shadow-sm backdrop-blur-sm` | Outdated: `bg-gray-200/40` |
| **Overall Architecture** | Clean component-based with `ProfileHeader` | Inline JSX for header section |

---

### Implementation Steps

#### 1. Refactor Header to Match ProfilePage Layout

**File: `src/components/UserProfilePage.tsx`**

The stats section (followers/following/saved) currently uses vertical layout. Update to horizontal inline layout:

```jsx
// Current (vertical):
<div className="flex gap-3 text-sm mt-2">
  <button>
    <span className="font-bold">{profile.followers_count || 0}</span>{' '}
    <span className="text-muted-foreground">Follower</span>
  </button>
  ...
</div>

// Updated (horizontal, matching ProfileHeader.tsx):
<div className="flex gap-3 mt-2">
  <button className="flex items-center gap-1" onClick={...}>
    <span className="text-sm font-bold text-foreground">{profile.followers_count || 0}</span>
    <span className="text-sm text-muted-foreground">Follower</span>
  </button>
  ...
</div>
```

#### 2. Update Category Cards Styling

**File: `src/components/UserProfilePage.tsx` (lines ~437-517)**

Change card styling from outdated gray to modern glass effect:

```jsx
// Current:
className="... bg-gray-200/40 dark:bg-slate-800/65 ..."

// Updated (matching ProfileHeader):
className="... bg-white/60 dark:bg-white/10 shadow-sm backdrop-blur-sm ..."
```

#### 3. Add Swipeable Tab Navigation

**File: `src/components/UserProfilePage.tsx`**

Add imports:
```jsx
import SwipeableTabContent from './common/SwipeableTabContent';
import { useIsMobile } from '@/hooks/use-mobile';
```

Replace the current tab content rendering with `SwipeableTabContent`:
```jsx
// Create tabsConfig similar to ProfilePage
const tabsConfig = useMemo(() => [
  { key: 'posts', content: <PostsGrid userId={userId} /> },
  { key: 'trips', content: <TripsGrid userId={userId} /> },
  { key: 'badges', content: <Achievements userId={userId} hideCoins /> },
  { key: 'tagged', content: <TaggedPostsGrid userId={userId} /> },
], [userId]);

// Replace renderTabContent() with:
<SwipeableTabContent
  tabs={tabsConfig}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  enabled={isMobile}
/>
```

#### 4. Add Tab Bar Hide-on-Scroll

**File: `src/components/UserProfilePage.tsx`**

Add import and hook:
```jsx
import { useScrollHide } from '@/hooks/useScrollHide';

// Inside component:
const { hidden: tabsHidden, setScrollContainer, resetHidden } = useScrollHide({ 
  threshold: 50, 
  enabled: isMobile 
});
```

Wrap ProfileTabs with animated container:
```jsx
<div 
  className="will-change-transform overflow-hidden"
  style={{
    transform: tabsHidden ? 'translateY(-100%)' : 'translateY(0)',
    maxHeight: tabsHidden ? 0 : 60,
    opacity: tabsHidden ? 0 : 1,
    marginBottom: tabsHidden ? -8 : 0,
    transition: 'transform 200ms cubic-bezier(0.32, 0.72, 0, 1), ...',
  }}
>
  <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} />
</div>
```

#### 5. Hide Coins in Achievements for Other Users

The code already passes `hideCoins={!isOwnProfile}` to the Achievements component in the badges modal (line 587). However, when showing Achievements in the tab content, it doesn't pass this prop.

**File: `src/components/UserProfilePage.tsx`**

Update the tab content to consistently hide coins:
```jsx
// In tabsConfig:
{ key: 'badges', content: <Achievements userId={userId} hideCoins /> }
```

---

### Files to Modify

1. **`src/components/UserProfilePage.tsx`** - Main refactor:
   - Add imports for `SwipeableTabContent`, `useIsMobile`, `useScrollHide`, `useMemo`, `useCallback`
   - Update stats layout to horizontal
   - Update category cards styling to glass effect
   - Add `tabsConfig` with `useMemo`
   - Replace tab content with `SwipeableTabContent`
   - Add scroll-hide functionality for tabs
   - Ensure `hideCoins` is passed to Achievements in all contexts

---

### Expected Outcome

After these changes:
- Stats will display horizontally (matching own profile)
- Category cards will have modern glass styling
- Users can swipe between tabs (Posts, Trips, Badges, Tagged)
- Tab bar will hide when scrolling through content
- Coins will be hidden when viewing other users' achievements
- Consistent visual and functional parity with ProfilePage

