# iOS Setup Guide

## Changes Applied

### 1. **Fixed Top Padding Issue**
- **Problem**: Search bar, notifications, and messages were too far down due to double safe-area padding
- **Solution**: Removed `safe-area-pt` class from Header component (line 34)
- **Result**: Now only uses the parent container's `pt-[env(safe-area-inset-top)]` for proper iOS safe area

### 2. **Map Extends Below Navigation**
- **Problem**: Map was stopping above the bottom navigation bar
- **Solution**: Removed `pb-[calc(env(safe-area-inset-bottom)+4rem)]` from HomeMapContainer
- **Result**: Map now extends all the way to the bottom of the screen, behind the navigation

### 3. **Fixed Pinch-to-Zoom Triggering Share Modal**
- **Problem**: Pinching to zoom on map triggered the long-press share location gesture
- **Solution**: Modified touch handlers in HomePage to detect multiple touches:
  - Only start long-press timer for single touch (`e.touches.length === 1`)
  - Cancel long-press if multiple touches detected (pinch gesture)
- **Result**: Pinch-to-zoom now works without triggering the share modal

### 4. **iOS Location Permissions**
- **Created**: `ios/App/App/Info.plist` with location permissions
- **Includes**:
  - `NSLocationWhenInUseUsageDescription` - Location while using app
  - `NSLocationAlwaysAndWhenInUseUsageDescription` - Always + when in use
  - `NSLocationAlwaysUsageDescription` - Always allow location
  - Also added camera and photo library permissions for future use

## Location Not Working on iPhone - Setup Required

The location feature requires proper iOS configuration in your Xcode project:

### Steps to Enable Location on iOS:

1. **Ensure the Info.plist is in place**
   - After running `npx cap add ios`, copy the `ios/App/App/Info.plist` file created above
   - Or manually add the location permission keys to your existing Info.plist in Xcode

2. **Open the iOS project in Xcode**
   ```bash
   npx cap open ios
   ```

3. **Verify Info.plist permissions in Xcode**
   - Navigate to your app target → Info tab
   - Confirm these keys exist:
     - Privacy - Location When In Use Usage Description
     - Privacy - Location Always and When In Use Usage Description
     - Privacy - Location Always Usage Description

4. **Build and test on device**
   ```bash
   npx cap run ios
   ```
   - First time the app runs, iOS will prompt the user for location permission
   - Make sure to allow location access

5. **For simulator testing**
   - In iOS Simulator: Features → Location → Custom Location
   - Or use one of the predefined locations (Apple, City Run, etc.)

### Why Location Wasn't Working

The web version uses the browser's geolocation API which works automatically. For native iOS apps, you must:
- Declare location permissions in Info.plist
- Request permission at runtime (handled by Capacitor automatically)
- The user must explicitly allow location access

Once you complete these steps, the location feature will work on your iPhone!

## Summary of All Changes

| Issue | File Changed | What Changed |
|-------|-------------|--------------|
| Top spacing too large | `src/components/home/Header.tsx` | Removed `safe-area-pt` class causing double padding |
| Map not extending to bottom | `src/components/home/HomeMapContainer.tsx` | Removed bottom padding to let map go behind nav |
| Pinch-zoom triggers share | `src/components/HomePage.tsx` | Added multi-touch detection to prevent long-press on pinch |
| Location not working | `ios/App/App/Info.plist` | Created with iOS location permissions |

All changes maintain functionality while fixing the iPhone-specific layout and interaction issues.
