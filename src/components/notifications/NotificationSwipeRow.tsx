import { memo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotificationSwipeRowProps {
  notificationId: string;
  isRead: boolean;
  openSwipeId: string | null;
  onSwipeOpen: (id: string | null) => void;
  onDelete?: (id: string) => Promise<any>;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

const NotificationSwipeRow = memo(({
  notificationId,
  isRead,
  openSwipeId,
  onSwipeOpen,
  onDelete,
  onClick,
  children
}: NotificationSwipeRowProps) => {
  const { t } = useTranslation();
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [translateX, setTranslateX] = useState(0);
  const [swipedOpen, setSwipedOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Close this notification if another one is opened
  useEffect(() => {
    if (openSwipeId && openSwipeId !== notificationId) {
      setSwipedOpen(false);
      setTranslateX(0);
    }
  }, [openSwipeId, notificationId]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setHidden(true);
    setSwipedOpen(false);
    setTranslateX(0);
    
    try {
      if (onDelete) {
        const result = await onDelete(notificationId);
        if (result && !result.success) {
          setHidden(false);
          toast.error(t('error', { ns: 'common' }));
        }
      } else {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('id', notificationId);

        if (error) {
          setHidden(false);
          toast.error(t('error', { ns: 'common' }));
        }
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      setHidden(false);
      toast.error(t('error', { ns: 'common' }));
    }
  };

  if (hidden) return null;

  return (
    <div className="relative overflow-hidden select-none">
      {/* Right action - Delete (revealed on swipe) */}
      <div 
        className="absolute inset-y-0 right-0 flex items-center justify-center w-24 z-0"
        style={{ 
          pointerEvents: swipedOpen ? 'auto' : 'none', 
          opacity: swipedOpen ? 1 : 0, 
          transition: 'opacity 180ms ease' 
        }}
      >
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-full bg-destructive/10 hover:bg-destructive/20"
          onClick={handleDelete}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <Trash2 className="h-5 w-5 text-destructive" />
        </Button>
      </div>

      {/* Swipeable row */}
      <div
        onClick={(e) => {
          if (swipedOpen) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          onClick(e);
        }}
        onPointerDown={(e) => {
          const target = e.target as HTMLElement;
          if (
            target.closest('[data-avatar-click]') ||
            target.closest('[data-username-click]') ||
            target.closest('button') ||
            target.closest('a') ||
            target.closest('input, textarea, select')
          ) {
            return;
          }

          setTouchStartX(e.clientX);
          (e.currentTarget as HTMLElement).dataset.swipeStartY = String(e.clientY);
          (e.currentTarget as HTMLElement).dataset.swipeHasMoved = 'false';
        }}
        onPointerMove={(e) => {
          if (touchStartX === null) return;

          const currentTarget = e.currentTarget as HTMLElement;
          const startY = Number(currentTarget.dataset.swipeStartY || e.clientY);
          const dx = e.clientX - touchStartX;
          const dy = e.clientY - startY;

          if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) {
            setTouchStartX(null);
            currentTarget.dataset.swipeHasMoved = 'false';
            if (!swipedOpen) setTranslateX(0);
            return;
          }

          if (Math.abs(dx) < 6) return;

          currentTarget.dataset.swipeHasMoved = 'true';
          e.preventDefault();

          const next = Math.max(Math.min(dx, 0), -96);
          setTranslateX(swipedOpen ? -96 + dx : next);
        }}
        onPointerUp={(e) => {
          const currentTarget = e.currentTarget as HTMLElement;
          const hasMoved = currentTarget.dataset.swipeHasMoved === 'true';

          if (!hasMoved) {
            setTouchStartX(null);
            currentTarget.dataset.swipeHasMoved = 'false';
            return;
          }

          const threshold = -48;
          if (translateX <= threshold) {
            setTranslateX(-96);
            setSwipedOpen(true);
            onSwipeOpen?.(notificationId);
          } else {
            setTranslateX(0);
            setSwipedOpen(false);
            if (openSwipeId === notificationId) {
              onSwipeOpen?.(null);
            }
          }
          setTouchStartX(null);
          currentTarget.dataset.swipeHasMoved = 'false';
        }}
        onPointerCancel={(e) => {
          const currentTarget = e.currentTarget as HTMLElement;
          setTouchStartX(null);
          currentTarget.dataset.swipeHasMoved = 'false';
          if (!swipedOpen) setTranslateX(0);
        }}
        className={`relative z-10 w-full ${swipedOpen ? '' : 'cursor-pointer active:bg-accent/50'} transition-colors ${
          !isRead ? 'bg-accent/20' : 'bg-background'
        }`}
        style={{ 
          touchAction: 'pan-y', 
          transform: `translateX(${translateX}px)`, 
          transition: touchStartX ? 'none' : 'transform 180ms ease' 
        }}
      >
        {children}
      </div>
    </div>
  );
});

NotificationSwipeRow.displayName = 'NotificationSwipeRow';

export default NotificationSwipeRow;
