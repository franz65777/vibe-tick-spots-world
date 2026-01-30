

## Plan: Add Haptic Feedback & UX Improvements to Home Page

This plan enhances the native mobile feel of the home page by adding haptic feedback to interactive elements and implementing several UX improvements.

---

### Summary

The changes will make the app feel more responsive and native by adding tactile feedback to buttons, filters, list items, and search interactions. Additional UX improvements include micro-animations and improved visual feedback.

---

### Part 1: Add Haptic Feedback to Missing Components

**1.1 Search Bar (SearchDrawer.tsx)**
- Add `haptics.impact('light')` when tapping the search bar to focus
- Add `haptics.selection()` when selecting a search result (location, city, or nearby category)
- Add `haptics.selection()` when clearing the search

**1.2 List Button (MapSection.tsx)**
- Add `haptics.impact('light')` when tapping the list view toggle button
- Add `haptics.selection()` when switching between filter tabs in the list drawer (Friends/Everyone/Saved)

**1.3 Header Buttons (Header.tsx)**
- Add `haptics.selection()` when tapping notifications button
- Add `haptics.selection()` when tapping messages button
- Add `haptics.impact('light')` when tapping the location bar (when place is selected)
- Add `haptics.impact('medium')` when tapping the close button (X)

**1.4 Map Filter Dropdown (MapFilterDropdown.tsx)**
- Add `haptics.selection()` when selecting a filter (Friends/Everyone/Saved)
- Add `haptics.selection()` when selecting/deselecting a friend from the dropdown
- Add `haptics.selection()` when toggling "All" button
- Add `haptics.selection()` when selecting save tags

**1.5 Category Filters (MapCategoryFilters.tsx)**
- Add `haptics.selection()` when toggling a category filter
- Add `haptics.selection()` when clearing all category filters

**1.6 Location List Items (LocationListItem.tsx)**
- Add `haptics.impact('light')` when tapping a location in the list

**1.7 Add Page Overlay (AddPageOverlay.tsx)**
- Add `haptics.impact('light')` when overlay opens
- Add `haptics.selection()` when selecting a search result
- Add `haptics.impact('medium')` when tapping close button

---

### Part 2: Additional UX Improvements

**2.1 Active State Visual Feedback**
- Ensure all interactive buttons have `active:scale-95` for press feedback
- Add subtle color transitions on hover/press states

**2.2 Search Bar Improvements (SearchDrawer.tsx)**
- Add subtle bounce animation when search bar expands from collapsed state
- Add smooth transition when trending drawer opens/closes

**2.3 List Button Enhancement (MapSection.tsx)**
- Add subtle pulse animation on first load to draw attention
- Add rotation animation to list icon when transitioning to/from list view

**2.4 Drawer Open/Close Feedback**
- Add `haptics.impact('light')` when the search drawer reaches trending position
- Add `haptics.impact('medium')` when drawer fully opens to search mode

**2.5 Map Pin Selection**
- Already has haptic feedback in the map component - verified

---

### Technical Implementation

**Files to Modify:**

1. `src/components/home/SearchDrawer.tsx`
   - Import haptics utility
   - Add haptic calls to: search focus, result selection, city selection, nearby category taps, clear search

2. `src/components/home/MapSection.tsx`
   - Import haptics utility
   - Add haptic calls to: list button tap, filter tab switches in drawer

3. `src/components/home/Header.tsx`
   - Import haptics utility
   - Add haptic calls to: notification button, message button, location bar tap, close button

4. `src/components/home/MapFilterDropdown.tsx`
   - Import haptics utility
   - Add haptic calls to: filter selection, user selection, all/none button, save tag selection

5. `src/components/home/MapCategoryFilters.tsx`
   - Import haptics utility
   - Add haptic calls to: category toggle, clear filters

6. `src/components/home/LocationListItem.tsx`
   - Import haptics utility
   - Add haptic call to: item click

7. `src/components/add/AddPageOverlay.tsx`
   - Import haptics utility
   - Add haptic calls to: overlay open, result selection, close button

---

### Expected Outcome

After implementation:
- Every tap on the home page will provide appropriate tactile feedback on iOS/Android devices
- The app will feel more responsive and polished
- Users will have clear confirmation of their interactions through both visual and haptic cues
- The experience will match native iOS/Android app standards

