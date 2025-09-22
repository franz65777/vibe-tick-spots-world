import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, Camera, Sparkles, X, Check, Plus } from 'lucide-react';
import { categoryFilters } from './MapCategoryFilters';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface QuickAddPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: { lat: number; lng: number } | null;
  onPinAdded: () => void;
}

const QuickAddPinModal = ({ isOpen, onClose, coordinates, onPinAdded }: QuickAddPinModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'details' | 'success'>('details');

  useEffect(() => {
    if (isOpen) {
      setStep('details');
      setFormData({
        name: '',
        category: '',
        description: '',
        address: ''
      });
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!user || !coordinates || !formData.name || !formData.category) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Create location
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .insert({
          name: formData.name,
          category: formData.category,
          description: formData.description,
          address: formData.address,
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          created_by: user.id
        })
        .select()
        .single();

      if (locationError) throw locationError;

      // Auto-save to user's saved places
      const { error: saveError } = await supabase
        .from('user_saved_locations')
        .insert({
          user_id: user.id,
          location_id: location.id
        });

      if (saveError) throw saveError;

      setStep('success');
      onPinAdded();
      
      toast({
        title: "Location Added!",
        description: `${formData.name} has been added to your saved places`,
      });

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error adding location:', error);
      toast({
        title: "Error",
        description: "Failed to add location. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-sm mx-auto rounded-3xl border-0 shadow-2xl bg-white">
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Location Added!</h3>
            <p className="text-gray-600 text-sm">
              <strong>{formData.name}</strong> has been saved to your collection
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto rounded-3xl border-0 shadow-2xl bg-white p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="relative p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">Add Location</DialogTitle>
                <p className="text-sm text-gray-500">Create a new pin on the map</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="rounded-xl hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-600" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Location Preview */}
          {coordinates && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>Lat: {coordinates.lat.toFixed(4)}, Lng: {coordinates.lng.toFixed(4)}</span>
              </div>
            </div>
          )}

          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Location Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., My Favorite Coffee Shop"
              className="rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
            />
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Category <span className="text-red-500">*</span>
            </label>
            <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
              <SelectTrigger className="rounded-xl border-gray-200 focus:border-blue-400">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categoryFilters.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" />
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Address Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Address</label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="e.g., 123 Main St, City"
              className="rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Tell us what makes this place special..."
              className="rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 min-h-[80px] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 rounded-xl border-gray-200 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || !formData.name || !formData.category}
              className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Add Location
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAddPinModal;