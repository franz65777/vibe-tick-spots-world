import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, FileText, Building2, ArrowLeft, Search, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDetailedAddress } from '@/utils/addressFormatter';

interface BusinessRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BusinessRequestModal: React.FC<BusinessRequestModalProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [locationSearch, setLocationSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLocationSearch = async (query: string) => {
    setLocationSearch(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, address, city, category, latitude, longitude')
        .or(`name.ilike.%${query}%,city.ilike.%${query}%,address.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching locations:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to submit a request');
      return;
    }

    if (!selectedLocation) {
      toast.error('Please select a location');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('business_claim_requests')
        .insert({
          user_id: user.id,
          location_id: selectedLocation.id,
          business_name: businessName,
          business_type: businessType,
          description: description,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Business request submitted successfully');
      onOpenChange(false);
      
      // Reset form
      setBusinessName('');
      setBusinessType('');
      setDescription('');
      setContactEmail('');
      setContactPhone('');
      setSelectedLocation(null);
      setLocationSearch('');
      setSearchResults([]);
    } catch (error: any) {
      console.error('Error submitting business request:', error);
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-full p-0 [&>button]:hidden">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="text-left">
                <SheetTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {t('businessRequest', { ns: 'settings' })}
                </SheetTitle>
                <SheetDescription>
                  {t('businessRequestDesc', { ns: 'settings' })}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name *</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              placeholder="Enter your business name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessType">Business Type *</Label>
            <Input
              id="businessType"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              required
              placeholder="e.g., Restaurant, Cafe, Bar"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            {selectedLocation ? (
              <div className="border rounded-lg p-3 bg-muted/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{selectedLocation.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {formatDetailedAddress({
                          city: selectedLocation.city,
                          address: selectedLocation.address,
                          coordinates: { lat: selectedLocation.latitude, lng: selectedLocation.longitude }
                        })}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLocation(null)}
                  >
                    Change
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search for your location..."
                    value={locationSearch}
                    onChange={(e) => handleLocationSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {searchResults.map((location) => (
                      <button
                        key={location.id}
                        type="button"
                        onClick={() => {
                          setSelectedLocation(location);
                          setSearchResults([]);
                          setLocationSearch('');
                        }}
                        className="w-full p-3 text-left hover:bg-muted transition-colors border-b last:border-b-0"
                      >
                        <p className="font-medium">{location.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {formatDetailedAddress({
                            city: location.city,
                            address: location.address,
                            coordinates: { lat: location.latitude, lng: location.longitude }
                          })}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about your business..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email *</Label>
            <Input
              id="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
              placeholder="your@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input
              id="contactPhone"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+1234567890"
            />
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-3">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4" />
              {t('requiredDocuments', { ns: 'settings' })}
            </h3>
            <ul className="text-xs space-y-2 text-muted-foreground pl-6">
              <li className="list-disc">{t('doc1', { ns: 'settings' })}</li>
              <li className="list-disc">{t('doc2', { ns: 'settings' })}</li>
              <li className="list-disc">{t('doc3', { ns: 'settings' })}</li>
            </ul>
          </div>

          <Button 
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting || !selectedLocation}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• {t('reviewTime', { ns: 'settings' })}</p>
            <p>• {t('exclusiveAccess', { ns: 'settings' })}</p>
          </div>
        </form>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BusinessRequestModal;