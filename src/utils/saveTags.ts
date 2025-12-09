// Save tag types and translations

export type SaveTag = 'been' | 'to_try' | 'favourite';

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
