// Save tag types and translations

export type SaveTag = 'been' | 'to_try' | 'favourite';

// Some legacy rows may contain older/invalid tags (e.g. 'general').
// Normalize them to the current union so UI components always have a valid icon.
export const normalizeSaveTag = (tag: string | null | undefined): SaveTag | null => {
  if (!tag) return null;
  switch (tag) {
    case 'been':
    case 'to_try':
    case 'favourite':
      return tag;
    case 'general':
      // Legacy: treat as a generic save; map to a current tag.
      return 'to_try';
    default:
      return null;
  }
};

export interface SaveTagOption {
  value: SaveTag;
  emoji: string;
  labelKey: string;
}

export const SAVE_TAG_OPTIONS: SaveTagOption[] = [
  { value: 'been', emoji: '📍', labelKey: 'been' },
  { value: 'to_try', emoji: '👀', labelKey: 'to_try' },
  { value: 'favourite', emoji: '⭐', labelKey: 'favourite' },
];

export const getSaveTagOption = (tag: SaveTag): SaveTagOption => {
  return SAVE_TAG_OPTIONS.find(opt => opt.value === tag) || SAVE_TAG_OPTIONS[0];
};
