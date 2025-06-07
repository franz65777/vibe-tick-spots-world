
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at?: string;
}

interface BadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  badges: Badge[];
}

const BadgeModal = ({ isOpen, onClose, badges }: BadgeModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Your Badges</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {badges.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No badges earned yet. Keep exploring to earn your first badge!
            </p>
          ) : (
            badges.map((badge) => (
              <div key={badge.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-3xl">{badge.icon}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{badge.name}</h3>
                  <p className="text-sm text-gray-600">{badge.description}</p>
                  {badge.earned_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Earned {new Date(badge.earned_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BadgeModal;
