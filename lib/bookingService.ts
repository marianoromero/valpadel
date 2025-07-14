import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot 
} from 'firebase/firestore'
import { db } from './firebase'

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
  created_at: Date
}

export class BookingService {
  private static COLLECTION_NAME = 'bookings'

  // Convert Firestore document to Booking object
  private static docToBooking(doc: QueryDocumentSnapshot<DocumentData>): Booking {
    const data = doc.data()
    return {
      id: doc.id,
      court: data.court,
      date: data.date,
      time: data.time,
      name: data.name,
      comment: data.comment || '',
      secret_key: data.secret_key,
      created_at: data.created_at?.toDate() || new Date()
    }
  }

  // Get all bookings for a specific date range
  static async getBookings(startDate: string, endDate: string): Promise<Booking[]> {
    try {
      const bookingsRef = collection(db, this.COLLECTION_NAME)
      const q = query(
        bookingsRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date'),
        orderBy('time')
      )
      
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => this.docToBooking(doc))
    } catch (error) {
      console.error('Error fetching bookings:', error)
      throw new Error('Failed to fetch bookings')
    }
  }

  // Create a new booking
  static async createBooking(booking: BookingData): Promise<Booking> {
    try {
      // Check if slot is already booked
      const existingBooking = await this.findBooking(booking.court, booking.date, booking.time)
      if (existingBooking) {
        throw new Error('Esta pista ya está reservada para ese horario')
      }

      const bookingsRef = collection(db, this.COLLECTION_NAME)
      const docRef = await addDoc(bookingsRef, {
        ...booking,
        created_at: Timestamp.now()
      })

      return {
        id: docRef.id,
        ...booking,
        created_at: new Date()
      }
    } catch (error) {
      console.error('Error creating booking:', error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Failed to create booking')
    }
  }

  // Delete a booking (requires secret key)
  static async deleteBooking(id: string, secretKey: string): Promise<boolean> {
    try {
      // First verify the secret key matches
      const booking = await this.getBookingById(id)
      if (!booking || booking.secret_key !== secretKey) {
        throw new Error('Clave incorrecta')
      }

      const docRef = doc(db, this.COLLECTION_NAME, id)
      await deleteDoc(docRef)
      return true
    } catch (error) {
      console.error('Error deleting booking:', error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Failed to delete booking')
    }
  }

  // Find booking by court, date, time (for cancellation)
  static async findBooking(court: number, date: string, time: string): Promise<Booking | null> {
    try {
      const bookingsRef = collection(db, this.COLLECTION_NAME)
      const q = query(
        bookingsRef,
        where('court', '==', court),
        where('date', '==', date),
        where('time', '==', time)
      )
      
      const querySnapshot = await getDocs(q)
      if (querySnapshot.empty) {
        return null
      }
      
      return this.docToBooking(querySnapshot.docs[0])
    } catch (error) {
      console.error('Error finding booking:', error)
      throw new Error('Failed to find booking')
    }
  }

  // Get booking by ID
  static async getBookingById(id: string): Promise<Booking | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id)
      const bookingsRef = collection(db, this.COLLECTION_NAME)
      const q = query(bookingsRef, where('__name__', '==', id))
      
      const querySnapshot = await getDocs(q)
      if (querySnapshot.empty) {
        return null
      }
      
      return this.docToBooking(querySnapshot.docs[0])
    } catch (error) {
      console.error('Error getting booking by ID:', error)
      return null
    }
  }

  // Validate if a time slot is available
  static async isSlotAvailable(court: number, date: string, time: string): Promise<boolean> {
    const booking = await this.findBooking(court, date, time)
    return booking === null
  }
}