
import { cn } from '@/lib/utils';
import { MapPin, Camera, Route, Award } from 'lucide-react';

interface ProfileTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const ProfileTabs = ({ activeTab, onTabChange }: ProfileTabsProps) => {
  const tabs = [
    { id: 'travel', label: 'Travel', icon: MapPin },
    { id: 'posts', label: 'Posts', icon: Camera },
    { id: 'trips', label: 'Trips', icon: Route },
    { id: 'badges', label: 'Badges', icon: Award },
  ];

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-4 px-2 text-sm font-medium transition-colors relative",
                activeTab === tab.id
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProfileTabs;
