import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Share2, 
  Users, 
  Copy, 
  X, 
  Search, 
  Check,
  MessageCircle,
  Link as LinkIcon,
  Globe
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { pinSharingService, PinShareData } from '@/services/pinSharingService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PinShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  pinData: PinShareData | null;
}

interface Contact {
  id: string;
  username: string;
  avatar_url?: string;
  full_name?: string;
}

const PinShareModal = ({ isOpen, onClose, pinData }: PinShareModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [shareableLink, setShareableLink] = useState<string>('');
  const [step, setStep] = useState<'select' | 'compose' | 'success'>('select');

  useEffect(() => {
    if (isOpen) {
      loadContacts();
      setStep('select');
      setSelectedContacts([]);
      setMessage('');
      setShareableLink('');
    }
  }, [isOpen]);

  const loadContacts = async () => {
    if (!user) return;

    try {
      // Get users the current user follows
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select(`
          following_id,
          profiles!follows_following_id_fkey (
            id,
            username,
            avatar_url,
            full_name
          )
        `)
        .eq('follower_id', user.id);

      if (followError) throw followError;

      const contactList = followData?.map(follow => ({
        id: follow.following_id,
        username: follow.profiles?.username || 'Unknown',
        avatar_url: follow.profiles?.avatar_url,
        full_name: follow.profiles?.full_name
      })) || [];

      setContacts(contactList);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContactToggle = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleNext = () => {
    if (selectedContacts.length > 0) {
      setStep('compose');
    }
  };

  const handleShare = async () => {
    if (!pinData || selectedContacts.length === 0) return;

    setLoading(true);
    try {
      const shareMessage = message || `Check out ${pinData.name}!`;
      
      // Share with each selected contact
      await Promise.all(
        selectedContacts.map(contactId =>
          pinSharingService.sharePin(contactId, pinData, shareMessage)
        )
      );

      setStep('success');
      
      toast({
        title: "Pin Shared!",
        description: `${pinData.name} has been shared with ${selectedContacts.length} friend${selectedContacts.length !== 1 ? 's' : ''}`,
      });

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error sharing pin:', error);
      toast({
        title: "Error",
        description: "Failed to share pin. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShareableLink = async () => {
    if (!pinData) return;

    setLoading(true);
    try {
      const link = await pinSharingService.createShareableLink(pinData);
      setShareableLink(link);
      
      // Copy to clipboard
      navigator.clipboard.writeText(link);
      
      toast({
        title: "Link Created!",
        description: "Shareable link copied to clipboard",
      });
    } catch (error) {
      console.error('Error creating shareable link:', error);
      toast({
        title: "Error",
        description: "Failed to create shareable link",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderSelectStep = () => (
    <>
      <DialogHeader className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">Share Location</DialogTitle>
              <p className="text-sm text-gray-500">{pinData?.name}</p>
            </div>
          </div>
          <Button onClick={onClose} variant="ghost" size="icon" className="rounded-xl">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </DialogHeader>

      <div className="p-6 space-y-4">
        {/* Share Options */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleCreateShareableLink}
            disabled={loading}
            variant="outline"
            className="h-20 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 flex-col gap-2"
          >
            <LinkIcon className="w-6 h-6 text-gray-600" />
            <span className="text-sm font-medium">Create Link</span>
          </Button>
          
          <Button
            onClick={() => setStep('compose')}
            disabled={selectedContacts.length === 0}
            variant="outline"
            className="h-20 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 flex-col gap-2"
          >
            <MessageCircle className="w-6 h-6 text-gray-600" />
            <span className="text-sm font-medium">Send Message</span>
          </Button>
        </div>

        {shareableLink && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Shareable Link Created</span>
            </div>
            <div className="flex gap-2">
              <Input
                value={shareableLink}
                readOnly
                className="text-xs bg-white border-green-200"
              />
              <Button
                onClick={() => navigator.clipboard.writeText(shareableLink)}
                size="sm"
                variant="outline"
                className="border-green-200 hover:bg-green-50"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search friends..."
            className="pl-10 rounded-xl border-gray-200 focus:border-blue-400"
          />
        </div>

        {/* Contacts List */}
        <ScrollArea className="h-60">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No friends found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleContactToggle(contact.id)}
                  className={`w-full p-3 rounded-xl text-left transition-colors ${
                    selectedContacts.includes(contact.id)
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={contact.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                        {contact.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{contact.username}</p>
                      {contact.full_name && (
                        <p className="text-sm text-gray-500">{contact.full_name}</p>
                      )}
                    </div>
                    {selectedContacts.includes(contact.id) && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {selectedContacts.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
            <span className="text-sm font-medium text-blue-800">
              {selectedContacts.length} friend{selectedContacts.length !== 1 ? 's' : ''} selected
            </span>
            <Button onClick={handleNext} size="sm" className="rounded-lg">
              Next
            </Button>
          </div>
        )}
      </div>
    </>
  );

  const renderComposeStep = () => (
    <>
      <DialogHeader className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setStep('select')}
              variant="ghost"
              size="icon"
              className="rounded-xl"
            >
              <X className="w-5 h-5" />
            </Button>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">Add Message</DialogTitle>
              <p className="text-sm text-gray-500">
                To {selectedContacts.length} friend{selectedContacts.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </DialogHeader>

      <div className="p-6 space-y-4">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Check out ${pinData?.name}! I thought you'd love this place.`}
          className="min-h-[100px] rounded-xl border-gray-200 focus:border-blue-400"
        />
        
        <Button
          onClick={handleShare}
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Sharing...
            </div>
          ) : (
            <>Share Location</>
          )}
        </Button>
      </div>
    </>
  );

  const renderSuccessStep = () => (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
        <Check className="w-10 h-10 text-white" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Location Shared!</h3>
      <p className="text-gray-600 text-sm">
        Your friends will receive your recommendation
      </p>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto rounded-3xl border-0 shadow-2xl bg-white p-0 overflow-hidden">
        {step === 'select' && renderSelectStep()}
        {step === 'compose' && renderComposeStep()}
        {step === 'success' && renderSuccessStep()}
      </DialogContent>
    </Dialog>
  );
};

export default PinShareModal;