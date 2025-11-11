import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, FileText, Building2, ArrowLeft, Search, MapPin, Upload, X } from 'lucide-react';
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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedLocationAddress, setSelectedLocationAddress] = useState<string>('');
  const [searchResultsAddresses, setSearchResultsAddresses] = useState<Record<string, string>>({});

  // Pre-fetch address for selected location
  useEffect(() => {
    const fetchAddress = async () => {
      if (selectedLocation) {
        const address = await formatDetailedAddress({
          city: selectedLocation.city,
          address: selectedLocation.address,
          coordinates: { lat: selectedLocation.latitude, lng: selectedLocation.longitude }
        });
        setSelectedLocationAddress(address);
      }
    };
    fetchAddress();
  }, [selectedLocation]);

  // Pre-fetch addresses for search results
  useEffect(() => {
    const fetchAddresses = async () => {
      const addresses: Record<string, string> = {};
      for (const location of searchResults) {
        addresses[location.id] = await formatDetailedAddress({
          city: location.city,
          address: location.address,
          coordinates: { lat: location.latitude, lng: location.longitude }
        });
      }
      setSearchResultsAddresses(addresses);
    };
    if (searchResults.length > 0) {
      fetchAddresses();
    }
  }, [searchResults]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
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
      // Upload documents to storage
      const documentUrls: string[] = [];
      if (uploadedFiles.length > 0) {
        setIsUploading(true);
        for (const file of uploadedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('business-documents')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('business-documents')
            .getPublicUrl(fileName);

          documentUrls.push(publicUrl);
        }
        setIsUploading(false);
      }

      // Get user profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, email')
        .eq('id', user.id)
        .single();

      // Insert into database
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

      // Send email notification
      try {
        await supabase.functions.invoke('send-business-request', {
          body: {
            businessName,
            businessType,
            description,
            contactEmail,
            contactPhone,
            locationName: selectedLocation.name,
            locationAddress: formatDetailedAddress({
              city: selectedLocation.city,
              address: selectedLocation.address,
              coordinates: { lat: selectedLocation.latitude, lng: selectedLocation.longitude }
            }),
            userName: profileData?.username || 'Unknown User',
            userEmail: profileData?.email || user.email || 'No email',
            documentUrls
          }
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the whole request if email fails
      }

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
      setUploadedFiles([]);
    } catch (error: any) {
      console.error('Error submitting business request:', error);
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-full p-0 [&>button]:hidden">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-4">
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
            <Label htmlFor="businessName">{t('businessName', { ns: 'settings' })} *</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              placeholder={t('businessNamePlaceholder', { ns: 'settings' })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessType">{t('businessType', { ns: 'settings' })} *</Label>
            <Input
              id="businessType"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              required
              placeholder={t('businessTypePlaceholder', { ns: 'settings' })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">{t('location', { ns: 'settings' })} *</Label>
            {selectedLocation ? (
              <div className="border rounded-lg p-3 bg-muted/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                       <p className="font-medium truncate">{selectedLocation.name}</p>
                       <p className="text-sm text-muted-foreground truncate">
                         {selectedLocationAddress}
                       </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLocation(null)}
                  >
                    {t('change', { ns: 'settings' })}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchLocation', { ns: 'settings' })}
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
                          {searchResultsAddresses[location.id] || 'Loading...'}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('description', { ns: 'settings' })}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder', { ns: 'settings' })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">{t('contactEmail', { ns: 'settings' })} *</Label>
            <Input
              id="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
              placeholder={t('emailPlaceholder', { ns: 'settings' })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">{t('contactPhone', { ns: 'settings' })}</Label>
            <Input
              id="contactPhone"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder={t('phonePlaceholder', { ns: 'settings' })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="documents">{t('supportingDocuments', { ns: 'settings' })}</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <input
                id="documents"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="documents"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {t('uploadDocuments', { ns: 'settings' })}
                </span>
              </label>
            </div>
            
            {uploadedFiles.length > 0 && (
              <div className="space-y-2 mt-3">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
            disabled={isSubmitting || isUploading || !selectedLocation}
          >
            {isUploading 
              ? t('uploadingDocuments', { ns: 'settings' }) 
              : isSubmitting 
              ? t('submitting', { ns: 'settings' }) 
              : t('submitRequest', { ns: 'settings' })}
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