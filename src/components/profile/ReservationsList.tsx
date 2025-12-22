import React from 'react';
import { Calendar, Clock, Users, MapPin, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useReservations } from '@/hooks/useReservations';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const ReservationsList = () => {
  const { t } = useTranslation();
  const { reservations, loading, cancelReservation } = useReservations();

  const handleCancel = async (reservationId: string, locationName: string) => {
    if (window.confirm(t('cancelReservationConfirm', { ns: 'booking', locationName }))) {
      const result = await cancelReservation(reservationId);
      if (result.error) {
        toast.error(t('cancelFailed', { ns: 'booking' }));
      } else {
        toast.success(t('reservationCancelled', { ns: 'booking' }));
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t('noReservationsYet', { ns: 'booking' })}</h3>
        <p className="text-sm text-muted-foreground">
          {t('bookTableToSee', { ns: 'booking' })}
        </p>
      </div>
    );
  }

  const upcomingReservations = reservations.filter(
    r => r.status === 'confirmed' || r.status === 'pending'
  );
  const pastReservations = reservations.filter(
    r => r.status === 'completed' || r.status === 'cancelled'
  );

  return (
    <div className="space-y-6 p-4">
      {/* Upcoming Reservations */}
      {upcomingReservations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Upcoming</h3>
          <div className="space-y-3">
            {upcomingReservations.map((reservation: any) => (
              <Card key={reservation.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      {reservation.locations?.name || 'Restaurant'}
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        reservation.status === 'confirmed' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {reservation.status}
                      </span>
                    </h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(reservation.reservation_date), 'EEEE, MMMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {format(new Date(`2000-01-01T${reservation.reservation_time}`), 'h:mm a')}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {reservation.party_size} {reservation.party_size === 1 ? 'Guest' : 'Guests'}
                      </div>
                      {reservation.locations?.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {reservation.locations.address}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                      Confirmation: {reservation.confirmation_code}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCancel(reservation.id, reservation.locations?.name || 'Restaurant')}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past Reservations */}
      {pastReservations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-muted-foreground">Past</h3>
          <div className="space-y-3">
            {pastReservations.map((reservation: any) => (
              <Card key={reservation.id} className="p-4 opacity-60">
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">
                    {reservation.locations?.name || 'Restaurant'}
                  </h4>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(reservation.reservation_date), 'MMM d, yyyy')} • 
                    {format(new Date(`2000-01-01T${reservation.reservation_time}`), 'h:mm a')} • 
                    {reservation.party_size} guests
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationsList;
