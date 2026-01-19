import React from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import mapIcon from '@/assets/icon-map-search.png';
import shareLocationIcon from '@/assets/share-location-icon.png';

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
      
      {/* Dropdown Menu - always mounted, hidden with CSS for instant loading */}
      <div 
        className={cn(
          "fixed bottom-20 left-8 z-[151] flex flex-col gap-2 pb-2 transition-all duration-200",
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        )}
        aria-hidden={!isOpen}
      >
        {options.map((option, index) => (
          <button
            key={option.id}
            onClick={() => {
              onSelectOption(option.id);
              onClose();
            }}
            className={cn(
               "relative flex items-center gap-3 px-3 py-2 rounded-2xl shadow-lg transition-all duration-200",
               "bg-background/95 backdrop-blur-xl",
               "hover:bg-accent/80 active:scale-95",
               "overflow-hidden"
             )}
            style={{
              transitionDelay: isOpen ? `${index * 50}ms` : '0ms'
            }}
            tabIndex={isOpen ? 0 : -1}
          >
            <div className="absolute inset-0 rounded-2xl border-[1.5px] border-transparent [background:linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))_border-box] [background-clip:border-box] [-webkit-mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [-webkit-mask-composite:xor] [mask-composite:exclude] pointer-events-none"></div>
            <img src={option.icon} alt="" className="w-10 h-10 object-contain" loading="eager" />
            <span className="font-medium text-sm whitespace-nowrap text-foreground">
              {option.label}
            </span>
          </button>
        ))}
      </div>
    </>
  );
};
