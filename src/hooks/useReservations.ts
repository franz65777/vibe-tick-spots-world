import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { reservationService, Reservation } from '@/services/reservationService';

export const useReservations = () => {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchReservations();
    }
  }, [user]);

  const fetchReservations = async () => {
    if (!user) return;

    setLoading(true);
    const data = await reservationService.getUserReservations(user.id);
    setReservations(data);
    setLoading(false);
  };

  const createReservation = async (reservationData: Parameters<typeof reservationService.createReservation>[0]) => {
    const result = await reservationService.createReservation(reservationData);
    if (!result.error) {
      await fetchReservations();
    }
    return result;
  };

  const cancelReservation = async (reservationId: string) => {
    const result = await reservationService.cancelReservation(reservationId);
    if (!result.error) {
      await fetchReservations();
    }
    return result;
  };

  return {
    reservations,
    loading,
    createReservation,
    cancelReservation,
    refetch: fetchReservations
  };
};
