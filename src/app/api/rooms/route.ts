import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRoomAvailability, getAllRoomsAvailability } from '@/lib/availability'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hostelCode = searchParams.get('hostel')
    const dateStr = searchParams.get('date')
    const roomId = searchParams.get('roomId')
    const userId = searchParams.get('userId') // For future auth integration
    
    const date = dateStr ? new Date(dateStr) : new Date()

    // If specific room requested
    if (roomId) {
      const availability = await getRoomAvailability(parseInt(roomId), date, userId || undefined)
      return NextResponse.json(availability)
    }

    // If hostel filter applied
    if (hostelCode) {
      const rooms = await db.room.findMany({
        where: {
          type: 'STUDY',
          status: 'ACTIVE',
          hostel: {
            code: hostelCode
          }
        },
        include: {
          hostel: true
        }
      })

      const availabilityPromises = rooms.map(room => 
        getRoomAvailability(room.id, date, userId || undefined)
      )
      
      const roomsAvailability = await Promise.all(availabilityPromises)
      
      return NextResponse.json({
        rooms: roomsAvailability,
        date: date.toISOString().split('T')[0],
        hostelCode
      })
    }

    // Get all available rooms
    const roomsAvailability = await getAllRoomsAvailability(date, userId || undefined)
    
    return NextResponse.json({
      rooms: roomsAvailability,
      date: date.toISOString().split('T')[0]
    })

  } catch (error) {
    console.error('Error fetching rooms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rooms availability' },
      { status: 500 }
    )
  }
}