import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface Reservation {
  id: string;
  user_id: string;
  location_id: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  special_requests?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  confirmation_code: string;
  created_at: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  max_party_size: number;
}

export const reservationService = {
  /**
   * Get available time slots for a restaurant on a specific date
   */
  async getAvailableTimeSlots(locationId: string, date: Date): Promise<TimeSlot[]> {
    try {
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

      const { data, error } = await supabase
        .from('restaurant_availability')
        .select('time_slot, max_party_size, is_available')
        .eq('location_id', locationId)
        .eq('day_of_week', dayOfWeek)
        .order('time_slot');

      if (error) throw error;

      // Check existing reservations for this date to determine actual availability
      const { data: reservations } = await supabase
        .from('reservations')
        .select('reservation_time, party_size')
        .eq('location_id', locationId)
        .eq('reservation_date', format(date, 'yyyy-MM-dd'))
        .in('status', ['pending', 'confirmed']);

      const reservationCounts = new Map<string, number>();
      reservations?.forEach(r => {
        const count = reservationCounts.get(r.reservation_time) || 0;
        reservationCounts.set(r.reservation_time, count + r.party_size);
      });

      return (data || []).map(slot => ({
        time: slot.time_slot,
        available: slot.is_available && (reservationCounts.get(slot.time_slot) || 0) < slot.max_party_size,
        max_party_size: slot.max_party_size
      }));
    } catch (error) {
      console.error('Error fetching time slots:', error);
      return [];
    }
  },

  /**
   * Create a new reservation
   */
  async createReservation(reservation: {
    location_id: string;
    party_size: number;
    reservation_date: string;
    reservation_time: string;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
    special_requests?: string;
  }): Promise<{ data?: Reservation; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: 'You must be logged in to make a reservation' };
      }

      const { data, error } = await supabase
        .from('reservations')
        .insert({
          user_id: user.id,
          ...reservation,
          status: 'confirmed'
        })
        .select()
        .single();

      if (error) throw error;

      return { data: data as Reservation };
    } catch (error: any) {
      console.error('Error creating reservation:', error);
      return { error: error.message };
    }
  },

  /**
   * Get user's reservations
   */
  async getUserReservations(userId: string): Promise<Reservation[]> {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          locations (
            name,
            address,
            city
          )
        `)
        .eq('user_id', userId)
        .order('reservation_date', { ascending: true })
        .order('reservation_time', { ascending: true });

      if (error) throw error;
      return (data || []) as any;
    } catch (error) {
      console.error('Error fetching reservations:', error);
      return [];
    }
  },

  /**
   * Cancel a reservation
   */
  async cancelReservation(reservationId: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', reservationId);

      if (error) throw error;
      return {};
    } catch (error: any) {
      console.error('Error cancelling reservation:', error);
      return { error: error.message };
    }
  },

  /**
   * Check if location is a restaurant/bookable venue
   */
  isBookableLocation(category: string): boolean {
    const bookableCategories = ['restaurant', 'café', 'bar', 'cafe', 'bistro', 'eatery'];
    return bookableCategories.some(c => category?.toLowerCase().includes(c));
  }
};
