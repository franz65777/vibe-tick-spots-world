import React from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import mapIcon from '@/assets/icon-map-new.png';
import shareLocationIcon from '@/assets/icon-share-location-new.png';

interface HomeMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: 'map' | 'share') => void;
}

export const HomeMenuDropdown = ({ isOpen, onClose, onSelectOption }: HomeMenuDropdownProps) => {
  const { t } = useTranslation();

  const options = [
    {
      id: 'map' as const,
      icon: mapIcon,
      label: t('homeMenu.map', 'Mappa')
    },
    {
      id: 'share' as const,
      icon: shareLocationIcon,
      label: t('homeMenu.sharePosition', 'Condividi posizione')
    }
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[150]"
        onClick={onClose}
      />
      
      {/* Dropdown Menu */}
      <div className="fixed bottom-20 left-8 z-[151] flex flex-col gap-2 pb-2">
        {options.map((option, index) => (
          <button
            key={option.id}
            onClick={() => {
              onSelectOption(option.id);
              onClose();
            }}
            className={cn(
              "flex items-center gap-4 px-4 py-3 rounded-2xl shadow-lg transition-all duration-200",
              "bg-background/95 backdrop-blur-xl border border-border/20",
              "hover:bg-accent/80 active:scale-95",
              "animate-in fade-in slide-in-from-bottom-4"
            )}
            style={{
              animationDelay: `${index * 50}ms`,
              animationFillMode: 'both'
            }}
          >
            <img src={option.icon} alt="" className="w-12 h-12 object-contain" />
            <span className="font-medium text-sm whitespace-nowrap text-foreground">
              {option.label}
            </span>
          </button>
        ))}
      </div>
    </>
  );
};
