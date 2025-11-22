import React from 'react';
import { Map, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

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
      icon: Map,
      label: 'Mappa',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'share' as const,
      icon: MapPin,
      label: 'Condividi luogo',
      color: 'bg-green-500 hover:bg-green-600'
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
      <div className="fixed bottom-20 left-8 z-[151] flex flex-col gap-3 pb-2">
        {options.map((option, index) => (
          <button
            key={option.id}
            onClick={() => {
              onSelectOption(option.id);
              onClose();
            }}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-white transition-all duration-200",
              "transform hover:scale-105 active:scale-95",
              option.color,
              "animate-in fade-in slide-in-from-bottom-4"
            )}
            style={{
              animationDelay: `${index * 50}ms`,
              animationFillMode: 'both'
            }}
          >
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <option.icon className="w-5 h-5" />
            </div>
            <span className="font-medium text-sm whitespace-nowrap">
              {option.label}
            </span>
          </button>
        ))}
      </div>
    </>
  );
};
