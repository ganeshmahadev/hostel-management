import { format, startOfDay, addMinutes, isSameDay } from 'date-fns'
import { db } from './db'

export const SLOT_MINUTES = 30
export const MAX_BOOKING_HOURS = 2
export const DAILY_BOOKING_CAP = 2
export const WEEKLY_HOURS_CAP = 6

export interface TimeSlot {
  id: string
  startTime: Date
  endTime: Date
  date: string
  isAvailable: boolean
  isMyBooking?: boolean
  bookingId?: string
}

export interface RoomAvailability {
  roomId: number
  room: {
    id: number
    name: string
    capacity: number
    hostelId: number
    hostel: {
      name: string
      code: string
    }
  }
  slots: TimeSlot[]
  availableSlots: number
  totalSlots: number
}

/**
 * Generate time slots for a given date with 15-minute intervals
 * Operating hours: 8:00 AM to 10:00 PM (14 hours = 56 slots)
 */
export function generateTimeSlots(date: Date): TimeSlot[] {
  const slots: TimeSlot[] = []
  const startHour = 8 // 8 AM
  const endHour = 22 // 10 PM
  const dayStart = startOfDay(date)
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
      const startTime = addMinutes(dayStart, hour * 60 + minute)
      const endTime = addMinutes(startTime, SLOT_MINUTES)
      
      slots.push({
        id: `${format(date, 'yyyy-MM-dd')}-${hour.toString().padStart(2, '0')}${minute.toString().padStart(2, '0')}`,
        startTime,
        endTime,
        date: format(date, 'yyyy-MM-dd'),
        isAvailable: true
      })
    }
  }
  
  return slots
}

/**
 * Get room availability for a specific date
 */
export async function getRoomAvailability(roomId: number, date: Date, userId?: string): Promise<RoomAvailability> {
  const room = await db.room.findUnique({
    where: { id: roomId },
    include: {
      hostel: true,
      bookings: {
        where: {
          startTime: {
            gte: startOfDay(date)
          },
          endTime: {
            lte: addMinutes(startOfDay(date), 24 * 60)
          },
          status: {
            not: 'CANCELLED'
          }
        },
        include: {
          user: true
        }
      }
    }
  })

  if (!room) {
    throw new Error('Room not found')
  }

  const slots = generateTimeSlots(date)
  const bookedSlots = new Map<string, { bookingId: string; isMyBooking: boolean }>()

  // Mark booked slots
  room.bookings.forEach(booking => {
    const bookingStart = booking.startTime
    const bookingEnd = booking.endTime
    
    slots.forEach(slot => {
      if (slot.startTime >= bookingStart && slot.endTime <= bookingEnd) {
        bookedSlots.set(slot.id, {
          bookingId: booking.id,
          isMyBooking: userId ? booking.userId === userId : false
        })
      }
    })
  })

  // Update slot availability
  const updatedSlots = slots.map(slot => ({
    ...slot,
    isAvailable: !bookedSlots.has(slot.id),
    isMyBooking: bookedSlots.get(slot.id)?.isMyBooking || false,
    bookingId: bookedSlots.get(slot.id)?.bookingId
  }))

  const availableSlots = updatedSlots.filter(slot => slot.isAvailable).length

  return {
    roomId: room.id,
    room: {
      id: room.id,
      name: room.name,
      capacity: room.capacity,
      hostelId: room.hostelId,
      hostel: {
        name: room.hostel.name,
        code: room.hostel.code
      }
    },
    slots: updatedSlots,
    availableSlots,
    totalSlots: slots.length
  }
}

/**
 * Get availability for all active study rooms for a given date
 */
export async function getAllRoomsAvailability(date: Date, userId?: string): Promise<RoomAvailability[]> {
  const rooms = await db.room.findMany({
    where: {
      type: 'STUDY',
      status: 'ACTIVE'
    },
    include: {
      hostel: true
    }
  })

  const availabilityPromises = rooms.map(room => 
    getRoomAvailability(room.id, date, userId)
  )

  return Promise.all(availabilityPromises)
}

/**
 * Validate booking constraints
 */
export function validateBookingSlots(startSlot: TimeSlot, endSlot: TimeSlot): {
  isValid: boolean
  error?: string
  durationHours: number
} {
  const durationMs = endSlot.endTime.getTime() - startSlot.startTime.getTime()
  const durationHours = durationMs / (1000 * 60 * 60)

  if (!isSameDay(startSlot.startTime, endSlot.startTime)) {
    return {
      isValid: false,
      error: 'Bookings cannot cross midnight',
      durationHours
    }
  }

  if (durationHours > MAX_BOOKING_HOURS) {
    return {
      isValid: false,
      error: `Maximum booking duration is ${MAX_BOOKING_HOURS} hours`,
      durationHours
    }
  }

  if (durationHours <= 0) {
    return {
      isValid: false,
      error: 'End time must be after start time',
      durationHours
    }
  }

  return {
    isValid: true,
    durationHours
  }
}

/**
 * Check if user has reached daily/weekly limits
 */
export async function checkUserBookingLimits(userId: string, date: Date): Promise<{
  canBook: boolean
  dailyCount: number
  weeklyHours: number
  error?: string
}> {
  const dayStart = startOfDay(date)
  const weekStart = startOfDay(date)
  weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)

  // Get daily bookings
  const dailyBookings = await db.booking.count({
    where: {
      userId,
      startTime: {
        gte: dayStart,
        lt: addMinutes(dayStart, 24 * 60)
      },
      status: {
        not: 'CANCELLED'
      }
    }
  })

  // Get weekly bookings
  const weeklyBookings = await db.booking.findMany({
    where: {
      userId,
      startTime: {
        gte: weekStart,
        lt: addMinutes(weekStart, 7 * 24 * 60)
      },
      status: {
        not: 'CANCELLED'
      }
    }
  })

  const weeklyHours = weeklyBookings.reduce((total, booking) => {
    const duration = (booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60 * 60)
    return total + duration
  }, 0)

  if (dailyBookings >= DAILY_BOOKING_CAP) {
    return {
      canBook: false,
      dailyCount: dailyBookings,
      weeklyHours,
      error: `Daily booking limit reached (${DAILY_BOOKING_CAP} bookings per day)`
    }
  }

  if (weeklyHours >= WEEKLY_HOURS_CAP) {
    return {
      canBook: false,
      dailyCount: dailyBookings,
      weeklyHours,
      error: `Weekly hours limit reached (${WEEKLY_HOURS_CAP} hours per week)`
    }
  }

  return {
    canBook: true,
    dailyCount: dailyBookings,
    weeklyHours
  }
}