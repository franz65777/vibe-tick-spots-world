

## Plan: Settings Logout Button Size & Auth Pages Enhancement

This plan makes the logout button more compact and introduces several UI/UX improvements to the login and signup pages, including biometric authentication support for native mobile apps.

---

### Summary

The changes include:
1. Reducing the logout button size in Settings
2. Adding Face ID / Touch ID support for returning users on native apps
3. Improving visual design with shadows, better spacing, and animations
4. Adding haptic feedback to auth interactions
5. Enhancing UX with password strength indicators and remember me option

---

### Part 1: Make Logout Button Smaller

**File: `src/pages/SettingsPage.tsx`**
- Reduce padding from `py-4 px-6` to `py-3 px-5`
- Reduce icon size from `w-5 h-5` to `w-4 h-4`
- Reduce font-weight to `text-sm`
- Make button not full-width: `max-w-[200px] mx-auto`

---

### Part 2: Add Biometric Authentication (Face ID / Touch ID)

**New Dependency to Install:**
- `capacitor-native-biometric` - Capacitor plugin for Face ID/Touch ID

**New Service File: `src/services/biometricAuth.ts`**
- Create a utility service that:
  - Checks if biometric authentication is available
  - Saves credentials securely after successful login
  - Retrieves and uses saved credentials for quick login
  - Handles the biometric prompt UI

**Update `src/pages/auth/SigninStart.tsx`:**
- Add Face ID button that appears when:
  - User is on native platform (Capacitor)
  - Biometrics are available
  - User has previously saved credentials
- Flow: User taps Face ID button → Biometric verification → Auto-login with stored credentials
- Add divider "or continue with Face ID" section

---

### Part 3: Login Page UI/UX Improvements

**File: `src/pages/auth/SigninStart.tsx`**

1. **Add depth to input fields:**
   - Add subtle inner shadow to inputs: `shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]`
   - Add focus ring animation

2. **Improve button styling:**
   - Add depth shadow to primary button: `shadow-[0_4px_14px_rgba(37,99,235,0.25)]`
   - Add `active:scale-[0.98]` press feedback
   - Add subtle gradient to button: `bg-gradient-to-b from-blue-500 to-blue-600`

3. **Add haptic feedback:**
   - Import haptics utility
   - `haptics.impact('light')` on sign in button tap
   - `haptics.selection()` on password visibility toggle
   - `haptics.selection()` on forgot password tap

4. **Add "Remember me" toggle:**
   - Checkbox that saves email to localStorage
   - Pre-fills email field on return visits

5. **Visual polish:**
   - Add fade-in animation to form elements
   - Improve spacing consistency
   - Add a subtle card background behind the form for visual grouping

---

### Part 4: Signup Page UI/UX Improvements

**File: `src/pages/auth/SignupStart.tsx`**

1. **Add depth and polish:**
   - Same input shadow treatment as login
   - Button shadow treatment
   - Add `active:scale-[0.98]` to all buttons

2. **Add haptic feedback:**
   - `haptics.selection()` when switching between email/phone methods
   - `haptics.impact('light')` on send code button

3. **Improve method toggle pills:**
   - Add depth shadow to selected pill
   - Smooth transition when switching

4. **Visual consistency:**
   - Match the visual style with login page
   - Add subtle animations for availability check icons

---

### Part 5: Password Page Enhancement (Signup Flow)

**File: `src/pages/auth/SignupPassword.tsx`**

1. **Password strength indicator:**
   - Visual bar showing password strength (weak/medium/strong)
   - Color-coded: red → orange → green
   - Shows requirements met/unmet

2. **Real-time validation feedback:**
   - Check marks for: minimum length, has uppercase, has number
   - Helps users create stronger passwords

---

### Technical Implementation Details

**Files to Create:**
1. `src/services/biometricAuth.ts` - Biometric authentication utility

**Files to Modify:**
1. `src/pages/SettingsPage.tsx` - Smaller logout button
2. `src/pages/auth/SigninStart.tsx` - Face ID, depth, haptics, remember me
3. `src/pages/auth/SignupStart.tsx` - Depth, haptics, visual polish
4. `src/pages/auth/SignupPassword.tsx` - Password strength indicator
5. `src/pages/auth/ForgotPassword.tsx` - Consistent styling updates

**Dependencies to Add:**
- `capacitor-native-biometric` - For Face ID/Touch ID support

---

### Expected Outcome

After implementation:
- Logout button is more proportional and elegant
- Returning users on iOS can use Face ID for one-tap login
- Login and signup pages have premium depth and visual polish
- All auth interactions have haptic feedback on native devices
- Password creation is guided with strength indicators
- Forms feel more responsive with press animations

