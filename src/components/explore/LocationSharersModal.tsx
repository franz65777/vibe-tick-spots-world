import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LocationSharersModalProps {
  isOpen: boolean;
  onClose: () => void;
  sharers: Array<{ id: string; username: string; avatar_url: string | null }>;
  locationName: string;
}

export const LocationSharersModal = ({ isOpen, onClose, sharers, locationName }: LocationSharersModalProps) => {
  const navigate = useNavigate();

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Condividendo la posizione a {locationName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {sharers.map((sharer) => (
            <div
              key={sharer.id}
              onClick={() => handleUserClick(sharer.id)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={sharer.avatar_url || undefined} />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm">@{sharer.username}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
