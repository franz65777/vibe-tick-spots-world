import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, X, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { reservationService, TimeSlot } from '@/services/reservationService';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
  locationName: string;
}

const BookingModal = ({ isOpen, onClose, locationId, locationName }: BookingModalProps) => {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const [step, setStep] = useState<'date' | 'time' | 'details' | 'confirmation'>('date');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [partySize, setPartySize] = useState(2);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.username || '',
    email: profile?.email || '',
    phone: '',
    specialRequests: ''
  });

  useEffect(() => {
    if (selectedDate) {
      loadTimeSlots();
    }
  }, [selectedDate]);

  const loadTimeSlots = async () => {
    if (!selectedDate) return;
    setLoading(true);
    const slots = await reservationService.getAvailableTimeSlots(locationId, selectedDate);
    setTimeSlots(slots);
    setLoading(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setStep('time');
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return;

    setLoading(true);
    const result = await reservationService.createReservation({
      location_id: locationId,
      party_size: partySize,
      reservation_date: format(selectedDate, 'yyyy-MM-dd'),
      reservation_time: selectedTime,
      customer_name: formData.name,
      customer_email: formData.email,
      customer_phone: formData.phone,
      special_requests: formData.specialRequests
    });

    setLoading(false);

    if (result.error) {
      toast.error('Booking failed', { description: result.error });
    } else {
      setStep('confirmation');
      toast.success('Table booked!', { 
        description: `Confirmation code: ${result.data?.confirmation_code}` 
      });
    }
  };

  const resetAndClose = () => {
    setStep('date');
    setSelectedDate(undefined);
    setSelectedTime(undefined);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Book a Table at {locationName}
          </DialogTitle>
        </DialogHeader>

        {step === 'date' && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold mb-2 block">Select Date</Label>
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) => date < new Date() || date > new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)}
                className="rounded-md border"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-2 block">Party Size</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPartySize(Math.max(1, partySize - 1))}
                >
                  -
                </Button>
                <div className="flex items-center gap-2 px-4 py-2 border rounded-md flex-1 justify-center">
                  <Users className="w-4 h-4" />
                  <span className="font-semibold">{partySize} {partySize === 1 ? 'Guest' : 'Guests'}</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPartySize(Math.min(20, partySize + 1))}
                >
                  +
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'time' && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setStep('date')}>
              ← Back to Date
            </Button>
            <div>
              <Label className="text-sm font-semibold mb-2 block">
                {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')} • {partySize} {partySize === 1 ? 'Guest' : 'Guests'}
              </Label>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : timeSlots.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No available time slots for this date
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((slot) => (
                    <Button
                      key={slot.time}
                      variant={selectedTime === slot.time ? 'default' : 'outline'}
                      disabled={!slot.available || partySize > slot.max_party_size}
                      onClick={() => handleTimeSelect(slot.time)}
                      className="w-full"
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {format(new Date(`2000-01-01T${slot.time}`), 'h:mm a')}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setStep('time')}>
              ← Back to Time
            </Button>
            <div className="bg-muted p-3 rounded-lg text-sm">
              <div className="font-semibold mb-1">Booking Summary</div>
              <div>{format(selectedDate!, 'EEEE, MMMM d, yyyy')}</div>
              <div>{selectedTime && format(new Date(`2000-01-01T${selectedTime}`), 'h:mm a')} • {partySize} {partySize === 1 ? t('guest', { ns: 'booking' }) : t('guests', { ns: 'booking' })}</div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="name">{t('name', { ns: 'booking' })} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('yourName', { ns: 'booking' })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">{t('email', { ns: 'booking' })} *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('yourEmail', { ns: 'booking' })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">{t('phoneNumber', { ns: 'booking' })}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="requests">{t('specialRequests', { ns: 'booking' })}</Label>
                <Textarea
                  id="requests"
                  value={formData.specialRequests}
                  onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                  placeholder={t('dietaryRestrictions', { ns: 'booking' })}
                  rows={3}
                />
              </div>
            </div>

            <Button 
              onClick={handleSubmit} 
              className="w-full"
              disabled={loading || !formData.name || !formData.email}
            >
              {loading ? 'Booking...' : 'Confirm Booking'}
            </Button>
          </div>
        )}

        {step === 'confirmation' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Booking Confirmed!</h3>
              <p className="text-muted-foreground mb-4">
                Your table at {locationName} is reserved
              </p>
              <div className="bg-muted p-4 rounded-lg text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-semibold">{selectedDate && format(selectedDate, 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-semibold">{selectedTime && format(new Date(`2000-01-01T${selectedTime}`), 'h:mm a')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Party Size:</span>
                  <span className="font-semibold">{partySize} {partySize === 1 ? 'Guest' : 'Guests'}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                A confirmation has been sent to your email and notifications.
              </p>
            </div>
            <Button onClick={resetAndClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;
