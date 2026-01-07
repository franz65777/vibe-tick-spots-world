import React from 'react';
import { MapPin, FolderPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import cameraIcon from '@/assets/camera-icon.png';

interface AddMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: 'location' | 'post' | 'list') => void;
}

export const AddMenuDropdown = ({ isOpen, onClose, onSelectOption }: AddMenuDropdownProps) => {
  const { t } = useTranslation();

  const options = [
    {
      id: 'location' as const,
      icon: MapPin,
      label: t('navigation:addLocation', { defaultValue: 'Aggiungi luogo' }),
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'post' as const,
      customIcon: cameraIcon,
      label: t('navigation:addPost', { defaultValue: 'Aggiungi post' }),
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      id: 'list' as const,
      icon: FolderPlus,
      label: t('navigation:addList', { defaultValue: 'Crea lista' }),
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
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[151] flex flex-col gap-3 pb-2">
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
            {'customIcon' in option && option.customIcon ? (
                <img src={option.customIcon} alt="" className="w-7 h-7 object-contain" />
              ) : (
                <option.icon className="w-5 h-5" />
              )}
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
