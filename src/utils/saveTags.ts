// Save tag types and translations

export type SaveTag = 'general' | 'date_night' | 'birthday' | 'night_out' | 'family';

export interface SaveTagOption {
  value: SaveTag;
  emoji: string;
  labelKey: string;
}

export const SAVE_TAG_OPTIONS: SaveTagOption[] = [
  { value: 'general', emoji: '📍', labelKey: 'save_tags.general' },
  { value: 'date_night', emoji: '💑', labelKey: 'save_tags.date_night' },
  { value: 'birthday', emoji: '🎂', labelKey: 'save_tags.birthday' },
  { value: 'night_out', emoji: '🎉', labelKey: 'save_tags.night_out' },
  { value: 'family', emoji: '👨‍👩‍👧‍👦', labelKey: 'save_tags.family' },
];

export const getSaveTagOption = (tag: SaveTag): SaveTagOption => {
  return SAVE_TAG_OPTIONS.find(opt => opt.value === tag) || SAVE_TAG_OPTIONS[0];
};
