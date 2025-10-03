import React, { useState } from 'react';
import { X, Upload, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VisitedModalProps {
  place: any;
  onClose: () => void;
  onSuccess?: () => void;
}

const VisitedModal = ({ place, onClose, onSuccess }: VisitedModalProps) => {
  const { user } = useAuth();
  const [caption, setCaption] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async () => {
    if (!user || (!selectedImage && !caption.trim())) {
      toast.error('Please add a photo or comment');
      return;
    }

    setUploading(true);
    try {
      let mediaUrl = null;

      // Upload image if selected
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
          .from('media')
          .upload(fileName, selectedImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(fileName);

        mediaUrl = publicUrl;
      }

      // Create post
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          location_id: place.id,
          caption: caption.trim() || null,
          media_urls: mediaUrl ? [mediaUrl] : [],
          media_types: mediaUrl ? ['image'] : [],
        });

      if (postError) throw postError;

      toast.success('Post aggiunto con successo!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Errore durante la creazione del post');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div 
        className="bg-background w-full max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-border">
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
          
          <h3 className="font-bold text-lg">Hai visitato {place.name}?</h3>
          <p className="text-sm text-muted-foreground mt-1">Condividi la tua esperienza</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <Upload className="w-4 h-4 inline mr-1" />
              Aggiungi una foto
            </label>
            
            {previewUrl ? (
              <div className="relative w-full h-48 rounded-lg overflow-hidden">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <Button
                  onClick={() => {
                    setSelectedImage(null);
                    setPreviewUrl('');
                  }}
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Clicca per caricare</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <MessageSquare className="w-4 h-4 inline mr-1" />
              Aggiungi un commento
            </label>
            <Textarea
              placeholder="Racconta la tua esperienza..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={uploading || (!selectedImage && !caption.trim())}
            className="w-full"
            size="lg"
          >
            {uploading ? 'Caricamento...' : 'Pubblica'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VisitedModal;
