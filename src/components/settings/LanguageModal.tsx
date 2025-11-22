import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useTranslation } from 'react-i18next';
import { Globe, ArrowLeft } from 'lucide-react';

interface LanguageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  saving: boolean;
}

const languages = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
];

const LanguageModal: React.FC<LanguageModalProps> = ({
  open,
  onOpenChange,
  currentLanguage,
  onLanguageChange,
  saving,
}) => {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-full p-0 [&>button]:hidden">
        <div className="h-full flex flex-col">
          <SheetHeader className="pt-[env(safe-area-inset-top)] p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <SheetTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {t('language', { ns: 'settings' })}
              </SheetTitle>
            </div>
          </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-2.5">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                onLanguageChange(lang.code);
                onOpenChange(false);
              }}
              disabled={saving}
              className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all min-h-[60px] ${
                currentLanguage === lang.code
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border bg-background hover:border-primary/30'
              } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="text-2xl flex-shrink-0">{lang.flag}</span>
              <div className="flex-1 text-left min-w-0">
                <div className={`font-medium text-sm truncate ${currentLanguage === lang.code ? 'text-primary' : 'text-foreground'}`}>
                  {lang.label}
                </div>
              </div>
              {currentLanguage === lang.code && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
          </div>
        </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LanguageModal;
