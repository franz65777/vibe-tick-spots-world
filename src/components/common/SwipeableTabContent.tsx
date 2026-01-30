import { memo, Suspense, useMemo } from 'react';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';
import { cn } from '@/lib/utils';
import TabContentSkeleton from '@/components/profile/TabContentSkeleton';

interface TabConfig {
  key: string;
  content: React.ReactNode;
}

interface SwipeableTabContentProps {
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  enabled?: boolean;
  className?: string;
}

const SwipeableTabContent = memo(({
  tabs,
  activeTab,
  onTabChange,
  enabled = true,
  className,
}: SwipeableTabContentProps) => {
  const tabKeys = useMemo(() => tabs.map(t => t.key), [tabs]);
  
  const { containerRef, offset, isSwiping } = useSwipeTabs({
    tabs: tabKeys,
    activeTab,
    onTabChange,
    enabled,
  });

  const activeIndex = tabKeys.indexOf(activeTab);
  
  // Calculate transform: base position + drag offset
  const baseTransform = activeIndex * -100;
  const dragOffset = enabled ? (offset / window.innerWidth) * 100 : 0;
  const totalTransform = baseTransform + dragOffset;

  return (
    <div 
      ref={containerRef}
      className={cn("flex-1 min-h-0 overflow-hidden relative", className)}
    >
      <div
        className={cn(
          "flex h-full",
          isSwiping ? "will-change-transform" : ""
        )}
        style={{
          transform: `translateX(${totalTransform}%)`,
          transition: isSwiping ? 'none' : 'transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        {tabs.map((tab, index) => (
          <div
            key={tab.key}
            className="w-full h-full flex-shrink-0 overflow-hidden"
            style={{ 
              // Only render content for active and adjacent tabs for performance
              visibility: Math.abs(index - activeIndex) <= 1 ? 'visible' : 'hidden',
            }}
          >
            <Suspense fallback={<TabContentSkeleton />}>
              {tab.content}
            </Suspense>
          </div>
        ))}
      </div>
    </div>
  );
});

SwipeableTabContent.displayName = 'SwipeableTabContent';

export default SwipeableTabContent;
