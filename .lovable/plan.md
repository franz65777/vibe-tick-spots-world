

# Plan: Update City Filter Chips to Match Reference Image

## Reference Image Analysis
Looking at the uploaded image, the chips have:
- **Larger size**: More generous padding, bigger font
- **Very rounded**: Full pill shape with `rounded-2xl` or `rounded-3xl`
- **Clean white background**: Pure white with soft shadow for inactive chips
- **Black solid**: Active "all" chip is solid black (not just foreground)
- **Subtle shadow**: Soft, diffused shadow on inactive chips
- **More spacing**: Larger gap between chips

## Current vs Desired

| Property | Current | Desired (from image) |
|----------|---------|---------------------|
| Padding | `px-3 py-1.5` | `px-5 py-2.5` |
| Font size | `text-xs` | `text-base` |
| Border radius | `rounded-full` | `rounded-2xl` |
| Gap | `gap-1.5` | `gap-3` |
| Shadow | `shadow-sm` | `shadow-md` with blur |
| Icon size | `w-3 h-3` | `w-5 h-5` |

## Implementation

**File: `src/components/profile/PostsGrid.tsx`**

Update the chip styles to:

```tsx
{/* City Filter Chips */}
{citiesWithCounts.length > 0 && (
  <div className="flex-1 overflow-x-auto scrollbar-hide">
    <div className="flex gap-3">
      {/* All chip */}
      <button
        onClick={() => setSelectedCity(null)}
        className={cn(
          "px-5 py-2.5 rounded-2xl text-base font-medium transition-all flex-shrink-0 flex items-center gap-2",
          !selectedCity
            ? "bg-black text-white shadow-lg"
            : "bg-white text-gray-400 shadow-md hover:shadow-lg"
        )}
      >
        <Globe className="w-5 h-5" />
        {t('all', { ns: 'common', defaultValue: 'all' })}
      </button>
      
      {/* City chips */}
      {citiesWithCounts.map(({ city }) => (
        <button
          key={city}
          onClick={() => setSelectedCity(city)}
          className={cn(
            "px-5 py-2.5 rounded-2xl text-base font-medium transition-all flex-shrink-0 whitespace-nowrap",
            selectedCity === city
              ? "bg-black text-white shadow-lg"
              : "bg-white text-gray-400 shadow-md hover:shadow-lg"
          )}
        >
          {translateCityName(city, i18n.language).toLowerCase()}
        </button>
      ))}
    </div>
  </div>
)}
```

## Key Style Changes

1. **Size increase**:
   - Padding: `px-3 py-1.5` → `px-5 py-2.5`
   - Font: `text-xs` → `text-base`
   - Icon: `w-3 h-3` → `w-5 h-5`
   - Gap: `gap-1.5` → `gap-3`

2. **Border radius**: `rounded-full` → `rounded-2xl` (matches the softer rounded corners in the image)

3. **Colors exactly like the image**:
   - Active: `bg-black text-white` (solid black)
   - Inactive: `bg-white text-gray-400` (pure white with muted gray text)

4. **Shadows**:
   - Active: `shadow-lg` (more prominent)
   - Inactive: `shadow-md` (soft, diffused shadow like in the image)

## Files to Modify
- `src/components/profile/PostsGrid.tsx` - Update chip styles only

