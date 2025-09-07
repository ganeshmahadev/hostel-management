import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { checkUserBookingLimits, validateBookingSlots } from '@/lib/availability'
import { z } from 'zod'
import { startOfDay, addDays } from 'date-fns'

const createBookingSchema = z.object({
  roomId: z.number(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  purpose: z.string().max(200).optional(),
  partySize: z.number().min(1).max(20).default(1)
})

const getUserBookingsSchema = z.object({
  me: z.string().optional(),
  range: z.enum(['today', 'week', 'all']).optional().default('week'),
  userId: z.string() // For now, we'll pass this in query params
})

// Helper function to sync user from Clerk to our database
async function ensureUserExists(clerkUserId: string) {
  try {
    // Check if user exists in our database
    let user = await db.user.findUnique({
      where: { id: clerkUserId }
    })

    if (!user) {
      console.log('Creating user without Clerk sync for now - userId:', clerkUserId)
      // Create user in our database with basic info
      user = await db.user.create({
        data: {
          id: clerkUserId,
          email: `${clerkUserId}@temp.com`,
          name: 'User',
          role: 'STUDENT',
          phone: null,
        }
      })
      console.log('User created successfully:', user.id)
    }

    return user
  } catch (error) {
    console.error('Error syncing user:', error)
    throw new Error('Failed to sync user data')
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = getUserBookingsSchema.parse({
      me: searchParams.get('me') || undefined,
      range: searchParams.get('range') || 'week',
      userId: searchParams.get('userId') || 'temp-user' // Temporary until auth
    })

    if (!query.me) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const now = new Date()
    let startDate = startOfDay(now)
    let endDate = addDays(now, 1)

    switch (query.range) {
      case 'today':
        endDate = addDays(startDate, 1)
        break
      case 'week':
        endDate = addDays(startDate, 7)
        break
      case 'all':
        startDate = new Date(2020, 0, 1) // Far past date
        endDate = addDays(now, 365) // Far future date
        break
    }

    const bookings = await db.booking.findMany({
      where: {
        userId: query.userId,
        startTime: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        room: {
          include: {
            hostel: true
          }
        },
        damageReports: true,
        fairnessScore: true
      },
      orderBy: {
        startTime: 'desc'
      }
    })

    return NextResponse.json({
      bookings: bookings.map(booking => ({
        id: booking.id,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        purpose: booking.purpose,
        partySize: booking.partySize,
        checkInAt: booking.checkInAt,
        checkOutAt: booking.checkOutAt,
        room: {
          id: booking.room.id,
          name: booking.room.name,
          capacity: booking.room.capacity,
          hostel: {
            name: booking.room.hostel.name,
            code: booking.room.hostel.code
          }
        },
        damageReports: booking.damageReports.length,
        createdAt: booking.createdAt
      })),
      range: query.range,
      totalBookings: bookings.length
    })

  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Ensure user exists in our database
    await ensureUserExists(userId)

    const body = await request.json()
    const data = createBookingSchema.parse(body)
    
    const startTime = new Date(data.startTime)
    const endTime = new Date(data.endTime)

    // Validate booking constraints
    const slotValidation = validateBookingSlots(
      { 
        id: '', 
        startTime, 
        endTime: startTime, 
        date: startTime.toISOString().split('T')[0], 
        isAvailable: true 
      },
      { 
        id: '', 
        startTime: endTime, 
        endTime, 
        date: endTime.toISOString().split('T')[0], 
        isAvailable: true 
      }
    )

    if (!slotValidation.isValid) {
      return NextResponse.json(
        { error: slotValidation.error },
        { status: 400 }
      )
    }

    // Check user booking limits
    const limitsCheck = await checkUserBookingLimits(userId, startTime)
    if (!limitsCheck.canBook) {
      return NextResponse.json(
        { error: limitsCheck.error },
        { status: 400 }
      )
    }

    // Check room availability and create booking in transaction
    const result = await db.$transaction(async (tx) => {
      // Check for conflicts
      const conflict = await tx.booking.findFirst({
        where: {
          roomId: data.roomId,
          startTime: {
            lt: endTime
          },
          endTime: {
            gt: startTime
          },
          status: {
            not: 'CANCELLED'
          }
        }
      })

      if (conflict) {
        throw new Error('Time slot already booked')
      }

      // Verify room is available
      const room = await tx.room.findUnique({
        where: {
          id: data.roomId,
          type: 'STUDY',
          status: 'ACTIVE'
        },
        include: {
          hostel: true
        }
      })

      if (!room) {
        throw new Error('Room not available')
      }

      // Create the booking
      const booking = await tx.booking.create({
        data: {
          roomId: data.roomId,
          userId,
          startTime,
          endTime,
          purpose: data.purpose,
          partySize: data.partySize,
          status: 'CONFIRMED'
        },
        include: {
          room: {
            include: {
              hostel: true
            }
          }
        }
      })

      // Create fairness snapshot
      await tx.bookingFairnessSnapshot.create({
        data: {
          bookingId: booking.id,
          userId,
          dailyCount: limitsCheck.dailyCount + 1,
          weeklyCount: Math.ceil(limitsCheck.weeklyHours + slotValidation.durationHours),
          lastUseAt: new Date(),
          penaltyScore: 0
        }
      })

      return booking
    }, {
      isolationLevel: 'Serializable'
    })

    return NextResponse.json({
      booking: {
        id: result.id,
        startTime: result.startTime,
        endTime: result.endTime,
        status: result.status,
        purpose: result.purpose,
        partySize: result.partySize,
        room: {
          id: result.room.id,
          name: result.room.name,
          hostel: {
            name: result.room.hostel.name,
            code: result.room.hostel.code
          }
        },
        createdAt: result.createdAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating booking:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid booking data', details: error.errors },
        { status: 400 }
      )
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to create booking'
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    )
  }
}