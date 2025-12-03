// Save tag types and translations
import saveTagDate from '@/assets/save-tag-date.png';
import saveTagBirthday from '@/assets/save-tag-birthday.png';
import saveTagNightOut from '@/assets/save-tag-night-out.png';
import saveTagFamily from '@/assets/save-tag-family.png';

export type SaveTag = 'general' | 'date_night' | 'birthday' | 'night_out' | 'family';

export interface SaveTagOption {
  value: SaveTag;
  emoji: string;
  labelKey: string;
  icon?: string;
}

export const SAVE_TAG_OPTIONS: SaveTagOption[] = [
  { value: 'general', emoji: '📍', labelKey: 'general' },
  { value: 'date_night', emoji: '💑', labelKey: 'date_night', icon: saveTagDate },
  { value: 'birthday', emoji: '🎂', labelKey: 'birthday', icon: saveTagBirthday },
  { value: 'night_out', emoji: '🎉', labelKey: 'night_out', icon: saveTagNightOut },
  { value: 'family', emoji: '👨‍👩‍👧‍👦', labelKey: 'family', icon: saveTagFamily },
];

export const getSaveTagOption = (tag: SaveTag): SaveTagOption => {
  return SAVE_TAG_OPTIONS.find(opt => opt.value === tag) || SAVE_TAG_OPTIONS[0];
};
