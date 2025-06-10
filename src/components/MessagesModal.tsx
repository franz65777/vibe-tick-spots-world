
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageCircle, X } from 'lucide-react';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MessagesModal = ({ isOpen, onClose }: MessagesModalProps) => {
  const messages = [
    {
      id: '1',
      sender: 'Sarah',
      avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png',
      message: 'Hey! Have you been to that new coffee shop?',
      time: '5 min ago',
      unread: true
    },
    {
      id: '2',
      sender: 'Mike',
      avatar: '/lovable-uploads/5bb15f7b-b3ba-4eae-88b1-7fa789eb67c4.png',
      message: 'Thanks for the Brooklyn Bridge recommendation!',
      time: '2 hours ago',
      unread: true
    },
    {
      id: '3',
      sender: 'Emma',
      avatar: '/lovable-uploads/5df0be70-7240-4958-ba55-5921ab3785e9.png',
      message: 'Looking forward to our trip next week',
      time: '1 day ago',
      unread: false
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            Messages
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${
                message.unread 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                {message.sender[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{message.sender}</p>
                  <p className="text-xs text-gray-500">{message.time}</p>
                </div>
                <p className="text-sm text-gray-600 truncate">{message.message}</p>
              </div>
              {message.unread && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
          ))}
        </div>
        
        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No messages yet</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MessagesModal;
