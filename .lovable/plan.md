

# Plan: Match City Filter Chips to Reference Image Exactly

## Reference Image Analysis

Looking at the uploaded screenshot, I can see the chips have these specific characteristics:

| Property | Current (Too Big) | Reference Image |
|----------|-------------------|-----------------|
| Padding | `px-5 py-2.5` | `px-4 py-2` |
| Font size | `text-base` | `text-sm` |
| Border radius | `rounded-2xl` | `rounded-full` (pill shape) |
| Gap | `gap-3` | `gap-2` |
| Icon size | `w-5 h-5` | `w-4 h-4` |
| Inactive background | Pure `bg-white` | `bg-white/80` (slightly cream/off-white) |
| Shadow | `shadow-md` / `shadow-lg` | Very subtle `shadow-sm` |

## Key Visual Differences

1. **The "all" chip**: Black pill with globe icon and lowercase "all" text
2. **City chips**: Cream/off-white pills with medium gray text (not as muted as current)
3. **Overall size**: Noticeably smaller and more compact than current
4. **Shadow**: Very subtle, barely visible - not the prominent shadows we have now

## Implementation

**File: `src/components/profile/PostsGrid.tsx`**

Update chip styles from lines 278-307:

```tsx
{/* City Filter Chips */}
{citiesWithCounts.length > 0 && (
  <div className="flex-1 overflow-x-auto scrollbar-hide">
    <div className="flex gap-2">
      {/* All chip */}
      <button
        onClick={() => setSelectedCity(null)}
        className={cn(
          "px-4 py-2 rounded-full text-sm font-semibold transition-all flex-shrink-0 flex items-center gap-1.5",
          !selectedCity
            ? "bg-black text-white"
            : "bg-white/80 text-gray-500 shadow-sm"
        )}
      >
        <Globe className="w-4 h-4" />
        {t('all', { ns: 'common', defaultValue: 'all' })}
      </button>
      
      {/* City chips */}
      {citiesWithCounts.map(({ city }) => (
        <button
          key={city}
          onClick={() => setSelectedCity(city)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-semibold transition-all flex-shrink-0 whitespace-nowrap",
            selectedCity === city
              ? "bg-black text-white"
              : "bg-white/80 text-gray-500 shadow-sm"
          )}
        >
          {translateCityName(city, i18n.language).toLowerCase()}
        </button>
      ))}
    </div>
  </div>
)}
```

## Style Changes Summary

1. **Padding**: `px-5 py-2.5` → `px-4 py-2` (more compact)
2. **Font**: `text-base font-medium` → `text-sm font-semibold` (smaller, bolder)
3. **Border radius**: `rounded-2xl` → `rounded-full` (true pill shape like reference)
4. **Gap**: `gap-3` → `gap-2` (tighter spacing)
5. **Icon gap**: `gap-2` → `gap-1.5` (tighter icon spacing)
6. **Icon size**: `w-5 h-5` → `w-4 h-4` (smaller icon)
7. **Shadows**: 
   - Active: Remove shadow entirely (clean black pill)
   - Inactive: `shadow-md` → `shadow-sm` (subtle)
8. **Inactive background**: `bg-white` → `bg-white/80` (slight cream tint matching the app's background)

## Files to Modify
- `src/components/profile/PostsGrid.tsx` - Update city filter chip styles only

