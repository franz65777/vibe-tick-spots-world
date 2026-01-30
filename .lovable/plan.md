
# Profile, Leaderboard UI & Invite System Improvements

## Overview
This plan addresses four key improvements:
1. Add hide-on-scroll effect to profile filter sections for better content viewing
2. Redesign the "Classifica" leaderboard button with a more attractive look
3. Fix vertical scrolling in the leaderboard page
4. Build invite tracking logic so sharing the app and friend signups count toward the leaderboard

---

## 1. Hide-on-Scroll Filter Section (iOS-style)

### Approach
Create a smooth, iOS-style hide effect for `ProfileTabs` that collapses when scrolling down through content and reappears when scrolling up.

### Technical Implementation

**New Hook: `useScrollHide.ts`**
- Track scroll direction using `scrollY` delta
- Return a `hidden` boolean and transform values
- Use `requestAnimationFrame` for 60fps performance
- Threshold-based: hide after 50px scroll down, show immediately on scroll up

**ProfilePage.tsx Changes**
- Wrap `ProfileTabs` in an animated container
- Use `transform: translateY()` with CSS transitions for smooth animation
- Maintain proper spacing when tabs are hidden

```text
┌─────────────────────────────┐
│    Profile Header (fixed)   │
├─────────────────────────────┤
│  ProfileTabs (hide on       │
│  scroll, show on scroll up) │
├─────────────────────────────┤
│                             │
│   Tab Content (gains space  │
│   when tabs are hidden)     │
│                             │
└─────────────────────────────┘
```

### Files to Create/Modify
| File | Action |
|------|--------|
| `src/hooks/useScrollHide.ts` | Create - scroll direction tracking hook |
| `src/components/ProfilePage.tsx` | Modify - wrap ProfileTabs with animated container |
| `src/components/profile/PostsGrid.tsx` | Modify - pass scroll container ref |

---

## 2. Improved Leaderboard Button ("Classifica")

### Current State
Simple outline button with trophy icon - basic styling

### New Design
Premium floating button with gradient background, shadow, and subtle animation

### Technical Implementation

**CommunityChampions.tsx Updates**
- Replace `variant="outline"` with custom gradient styling
- Add glassmorphism effect with backdrop blur
- Include animated trophy with subtle bounce
- Add gradient border using CSS

```tsx
<Button
  onClick={() => navigate('/leaderboard')}
  className="h-14 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 
             hover:from-amber-500 hover:via-yellow-500 hover:to-orange-500
             shadow-lg shadow-amber-500/30 border border-white/30
             text-amber-900 font-bold text-lg transition-all duration-200
             hover:scale-105 active:scale-95"
>
  <img src={leaderboardTrophy} alt="" className="w-10 h-10 mr-2 animate-bounce-gentle" />
  {t('leaderboard', { ns: 'common' })}
</Button>
```

### Files to Modify
| File | Action |
|------|--------|
| `src/components/home/CommunityChampions.tsx` | Modify - redesign button styling |

---

## 3. Fix Vertical Scroll in Leaderboard

### Problem
The leaderboard list is inside nested containers that may prevent proper scrolling.

### Solution
Ensure the leaderboard list has `overflow-y-auto` and proper height constraints.

### Technical Implementation

**LeaderboardPage.tsx Updates**
- Add `overflow-y-auto` to the list container
- Set proper `flex-1` to allow the list to fill available space
- Add `pb-safe` padding for iOS bottom safe area

```tsx
{/* Leaderboard List */}
<div className="flex-1 overflow-y-auto px-4 pb-safe">
  {loading ? (...) : (
    <div className="space-y-2 pb-20">
      {users.map(...)}
    </div>
  )}
</div>
```

### Files to Modify
| File | Action |
|------|--------|
| `src/pages/LeaderboardPage.tsx` | Modify - fix scroll container structure |

---

## 4. Invite Tracking Logic for Leaderboard

### Current State
- `profiles` table has: `invite_code`, `invited_by`, `invited_users_count`
- Invite codes exist but `invited_users_count` is always 0
- Share link uses generic download URL without referral tracking

### Solution
Implement end-to-end referral tracking:

### 4.1 Referral Link Generation

**InviteFriendOverlay.tsx Updates**
- Generate personalized referral links with user's invite code
- Format: `https://spott.app/download?ref={invite_code}`

```tsx
const { user } = useAuth();
const { data: profile } = useQuery({
  queryKey: ['user-invite-code', user?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from('profiles')
      .select('invite_code')
      .eq('id', user!.id)
      .single();
    return data;
  },
  enabled: !!user
});

const DOWNLOAD_LINK = profile?.invite_code 
  ? `https://spott.app/download?ref=${profile.invite_code}`
  : 'https://spott.app/download';
```

### 4.2 Store Referral Code During Signup

**Signup Flow Updates**
- Capture `ref` parameter from URL on app launch
- Store in `sessionStorage` during signup flow
- Pass to `complete-signup` edge function

**SignupStart.tsx**
```tsx
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  if (refCode) {
    sessionStorage.setItem('signup_referral_code', refCode);
  }
}, []);
```

**SignupPassword.tsx**
```tsx
// Add referralCode to the complete-signup call
const referralCode = sessionStorage.getItem('signup_referral_code');
const { data } = await supabase.functions.invoke('complete-signup', {
  body: { ...signupData, referralCode }
});
```

### 4.3 Edge Function: Credit the Inviter

**complete-signup/index.ts Updates**
- Accept `referralCode` parameter
- Look up inviter by `invite_code`
- Set `invited_by` on new user's profile
- Increment `invited_users_count` on inviter's profile

```typescript
// After creating user, handle referral
if (referralCode) {
  // Find the inviter
  const { data: inviter } = await supabase
    .from('profiles')
    .select('id')
    .eq('invite_code', referralCode)
    .single();
  
  if (inviter) {
    // Link new user to inviter
    await supabase
      .from('profiles')
      .update({ invited_by: inviter.id })
      .eq('id', authData.user.id);
    
    // Increment inviter's count
    await supabase.rpc('increment_invited_count', { user_id: inviter.id });
  }
}
```

### 4.4 Database Function for Safe Increment

**New SQL Migration**
```sql
CREATE OR REPLACE FUNCTION increment_invited_count(user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET invited_users_count = COALESCE(invited_users_count, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Files to Create/Modify
| File | Action |
|------|--------|
| `src/components/notifications/InviteFriendOverlay.tsx` | Modify - use personalized referral links |
| `src/pages/auth/SignupStart.tsx` | Modify - capture referral code from URL |
| `src/pages/auth/SignupPassword.tsx` | Modify - pass referral code to edge function |
| `supabase/functions/complete-signup/index.ts` | Modify - handle referral crediting |
| `supabase/migrations/XXXX_increment_invited_count.sql` | Create - database function |

---

## Summary of Changes

| Component | Change |
|-----------|--------|
| Profile scroll UX | iOS-style hide/show tabs on scroll |
| Leaderboard button | Premium gradient design with glow |
| Leaderboard scroll | Fixed overflow and height constraints |
| Invite system | Full referral tracking from share to signup |

### User Flow After Implementation

```text
1. User A opens Invite overlay
2. Shares link: spott.app/download?ref=ABC123
3. Friend clicks link, downloads app
4. Friend opens signup, ref=ABC123 stored
5. Friend completes signup
6. User A's invited_users_count increments
7. User A appears in "Invited" leaderboard
```
