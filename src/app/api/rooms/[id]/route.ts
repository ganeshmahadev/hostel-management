import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRoomAvailability } from '@/lib/availability'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')
    const userId = searchParams.get('userId') // For future auth integration
    
    const roomId = parseInt(id)
    const date = dateStr ? new Date(dateStr) : new Date()

    if (isNaN(roomId)) {
      return NextResponse.json(
        { error: 'Invalid room ID' },
        { status: 400 }
      )
    }

    // Get room details with availability
    const room = await db.room.findUnique({
      where: { id: roomId },
      include: {
        hostel: true,
        bookings: {
          where: {
            startTime: {
              gte: new Date(date.toISOString().split('T')[0])
            },
            endTime: {
              lte: new Date(date.toISOString().split('T')[0] + 'T23:59:59.999Z')
            },
            status: {
              not: 'CANCELLED'
            }
          },
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            startTime: 'asc'
          }
        }
      }
    })

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    // Get availability data
    const availability = await getRoomAvailability(roomId, date, userId || undefined)

    return NextResponse.json({
      room: {
        id: room.id,
        name: room.name,
        type: room.type,
        status: room.status,
        capacity: room.capacity,
        amenities: room.amenities,
        qrTag: room.qrTag,
        hostel: {
          id: room.hostel.id,
          name: room.hostel.name,
          code: room.hostel.code
        }
      },
      availability,
      upcomingBookings: room.bookings.map(booking => ({
        id: booking.id,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        purpose: booking.purpose,
        partySize: booking.partySize,
        user: booking.user
      }))
    })

  } catch (error) {
    console.error('Error fetching room details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch room details' },
      { status: 500 }
    )
  }
}