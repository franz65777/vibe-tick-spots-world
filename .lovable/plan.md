
# Invite Friends Page Redesign

## Overview
Redesign the invite friend overlay to match the reference design with two distinct sections:
1. **Top card**: Share app download link with SPOTT logo
2. **Bottom card**: Find friends by accessing phone contacts

## Visual Design

The new design will feature:
- Two rounded cards stacked vertically with gap between them
- **Card 1 (Invite)**: SPOTT logo at top, "have friends with good taste?" text, gradient blue "invite them" button
- **Card 2 (Find Friends)**: Avatar stack, "find your friends" text, privacy note with lock emoji, black "check contacts" button

---

## Implementation Details

### 1. Update InviteFriendOverlay Component

**File**: `src/components/notifications/InviteFriendOverlay.tsx`

Completely redesign the content area:
- Replace current single-section layout with two-card layout
- Use existing SPOTT logo (either image asset or text logo component)
- Top card uses gradient button with Send icon
- Bottom card shows overlapping avatar stack (will use placeholder avatars initially)

### 2. Install Capacitor Contacts Plugin

**Package**: `@capacitor-community/contacts`

This is a community plugin for accessing native phone contacts on iOS/Android. Will add to `package.json`.

### 3. Create Contact Matching Hook

**New File**: `src/hooks/usePhoneContacts.ts`

This hook will:
- Request contact permission using Capacitor Contacts API
- Extract phone numbers and emails from contacts
- Hash the contact information client-side (SHA-256) for privacy
- Send hashed values to an edge function for matching

### 4. Create Contact Matching Edge Function

**New File**: `supabase/functions/find-contacts-on-app/index.ts`

The edge function will:
- Receive hashed phone numbers/emails from the client
- Compare against stored email hashes in profiles table
- Return matching user profiles (id, username, avatar)
- Never store or log raw contact data (privacy-first)

### 5. Database Migration (Optional Enhancement)

If phone number matching is desired later, we'd need to:
- Add `phone_hash` column to profiles table
- Hash phone numbers on signup

For now, we'll match by email only since profiles already have an email field.

### 6. Create Avatar Stack Component

**New File**: `src/components/common/AvatarStack.tsx`

A reusable component showing overlapping avatars:
- Accepts array of avatar URLs
- Shows configurable max count with "+N more" indicator
- Colored ring borders like the reference design

### 7. Create Contacts Found Modal/Results View

When matches are found, display:
- List of found friends already on the app
- Follow buttons for each found user
- Privacy-respecting messaging

---

## Technical Section

### Contact Access Flow

```text
User taps "check contacts"
        |
        v
Request permission (Capacitor.Contacts)
        |
        v
Permission granted? --> No --> Show permission denied message
        |
        Yes
        v
Read contacts (phones + emails)
        |
        v
Hash all values client-side (SHA-256)
        |
        v
Send hashes to edge function
        |
        v
Edge function compares against profiles.email
        |
        v
Return matching profiles
        |
        v
Display found friends with follow buttons
```

### Privacy Approach

- Contacts are hashed client-side before sending
- Raw contact data never leaves the device
- Edge function only sees hashes, never plaintext
- Add visible privacy note: "we never upload or store your contacts"

### Platform Detection

- On web: "Check contacts" button won't be functional (show "Available on mobile app" message)
- On native (iOS/Android): Use Capacitor Contacts plugin

### Code Structure

```typescript
// usePhoneContacts.ts - simplified structure
export const usePhoneContacts = () => {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<FoundContact[]>([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  const checkContacts = async () => {
    // 1. Check if native platform
    // 2. Request permission
    // 3. Get contacts
    // 4. Hash emails/phones
    // 5. Call edge function
    // 6. Return matches
  };
  
  return { checkContacts, loading, matches, permissionDenied };
};
```

### Dependencies to Add

```json
{
  "@capacitor-community/contacts": "^7.0.0"
}
```

### Capacitor Configuration

After adding the plugin, run:
- `npx cap sync` to sync native projects

iOS Info.plist needs:
- `NSContactsUsageDescription`: "SPOTT wants to find your friends who are already using the app"

Android needs:
- `android.permission.READ_CONTACTS` in AndroidManifest.xml

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/notifications/InviteFriendOverlay.tsx` | Modify - complete redesign |
| `src/hooks/usePhoneContacts.ts` | Create - contact access hook |
| `src/components/common/AvatarStack.tsx` | Create - overlapping avatar component |
| `supabase/functions/find-contacts-on-app/index.ts` | Create - matching edge function |
| `package.json` | Modify - add contacts plugin |

---

## Share Link Placeholder

For the "invite them" button, we'll use a placeholder download link that can be updated once the app is in the App Store:

```typescript
const DOWNLOAD_LINK = "https://spott.app/download"; // Placeholder
```

This can be easily updated to the actual App Store/Play Store links later.
