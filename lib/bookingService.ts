import { supabase } from './supabase'

export interface BookingData {
  court: number
  date: string
  time: string
  name: string
  comment?: string
  secret_key: string
}

export interface Booking extends BookingData {
  id: string
  created_at: string
}

export class BookingService {
  // Get all bookings for a specific date range
  static async getBookings(startDate: string, endDate: string): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('time', { ascending: true })

    if (error) {
      console.error('Error fetching bookings:', error)
      throw new Error('Failed to fetch bookings')
    }

    return data || []
  }

  // Create a new booking
  static async createBooking(booking: BookingData): Promise<Booking> {
    const { data, error } = await supabase
      .from('bookings')
      .insert(booking)
      .select()
      .single()

    if (error) {
      console.error('Error creating booking:', error)
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Esta pista ya está reservada para ese horario')
      }
      throw new Error('Failed to create booking')
    }

    return data
  }

  // Delete a booking (requires secret key)
  static async deleteBooking(id: string, secretKey: string): Promise<boolean> {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id)
      .eq('secret_key', secretKey)

    if (error) {
      console.error('Error deleting booking:', error)
      throw new Error('Failed to delete booking')
    }

    return true
  }

  // Find booking by court, date, time (for cancellation)
  static async findBooking(court: number, date: string, time: string): Promise<Booking | null> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('court', court)
      .eq('date', date)
      .eq('time', time)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null
      }
      console.error('Error finding booking:', error)
      throw new Error('Failed to find booking')
    }

    return data
  }

  // Validate if a time slot is available
  static async isSlotAvailable(court: number, date: string, time: string): Promise<boolean> {
    const booking = await this.findBooking(court, date, time)
    return booking === null
  }
}