// Save tag types and translations

export type SaveTag = 'general' | 'date_night' | 'birthday' | 'night_out' | 'family';

export interface SaveTagOption {
  value: SaveTag;
  emoji: string;
  labelKey: string;
}

export const SAVE_TAG_OPTIONS: SaveTagOption[] = [
  { value: 'general', emoji: '📍', labelKey: 'general' },
  { value: 'date_night', emoji: '💑', labelKey: 'date_night' },
  { value: 'birthday', emoji: '🎂', labelKey: 'birthday' },
  { value: 'night_out', emoji: '🎉', labelKey: 'night_out' },
  { value: 'family', emoji: '👨‍👩‍👧‍👦', labelKey: 'family' },
];

export const getSaveTagOption = (tag: SaveTag): SaveTagOption => {
  return SAVE_TAG_OPTIONS.find(opt => opt.value === tag) || SAVE_TAG_OPTIONS[0];
};
