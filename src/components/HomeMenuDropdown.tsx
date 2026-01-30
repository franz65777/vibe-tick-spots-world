import React from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import mapIcon from '@/assets/icon-map-search.png';
import shareLocationIcon from '@/assets/share-location-icon.png';
import { haptics } from '@/utils/haptics';

interface HomeMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: 'map' | 'share') => void;
}

export const HomeMenuDropdown = ({ isOpen, onClose, onSelectOption }: HomeMenuDropdownProps) => {
  const { t } = useTranslation('homeMenu');

  const options = [
    {
      id: 'map' as const,
      icon: mapIcon,
      label: t('map')
    },
    {
      id: 'share' as const,
      icon: shareLocationIcon,
      label: t('sharePosition')
    }
  ];

  return (
    <>
      {/* Backdrop - only render when open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[150]"
          onClick={onClose}
        />
      )}
      
      {/* Dropdown Menu - matches bottom nav pill style */}
      <div 
        className={cn(
          "fixed bottom-[88px] left-6 z-[151] flex flex-col gap-1.5 transition-all duration-200",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
        aria-hidden={!isOpen}
      >
        {options.map((option, index) => (
          <button
            key={option.id}
            onClick={() => {
              haptics.selection();
              onSelectOption(option.id);
              onClose();
            }}
            className={cn(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-full transition-all duration-200",
              "bg-white dark:bg-zinc-900",
              "shadow-[0_4px_20px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]",
              "dark:shadow-[0_4px_20px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)]",
              "hover:scale-[1.02] active:scale-95"
            )}
            style={{
              transitionDelay: isOpen ? `${index * 50}ms` : '0ms'
            }}
            tabIndex={isOpen ? 0 : -1}
          >
            <img src={option.icon} alt="" className="w-7 h-7 object-contain" loading="eager" />
            <span className="font-medium text-[15px] whitespace-nowrap text-foreground pr-1">
              {option.label}
            </span>
          </button>
        ))}
      </div>
    </>
  );
};
