import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAllRoomsAvailability } from '@/lib/availability'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') 
      ? new Date(searchParams.get('date')!) 
      : new Date()

    // Get all hostels with their rooms
    const hostels = await db.hostel.findMany({
      include: {
        rooms: {
          where: {
            type: 'STUDY',
            status: 'ACTIVE'
          }
        }
      },
      orderBy: {
        code: 'asc'
      }
    })

    // Get availability for all rooms
    const roomsAvailability = await getAllRoomsAvailability(date)
    
    // Group by hostel and calculate aggregated availability
    const hostelsWithAvailability = hostels.map(hostel => {
      const hostelRooms = roomsAvailability.filter(ra => ra.room.hostelId === hostel.id)
      const totalSlots = hostelRooms.reduce((sum, room) => sum + room.totalSlots, 0)
      const availableSlots = hostelRooms.reduce((sum, room) => sum + room.availableSlots, 0)
      const availabilityPercentage = totalSlots > 0 ? Math.round((availableSlots / totalSlots) * 100) : 0

      return {
        id: hostel.id,
        name: hostel.name,
        code: hostel.code,
        activeRooms: hostel.rooms.length,
        totalSlots,
        availableSlots,
        availabilityPercentage,
        rooms: hostelRooms.map(ra => ({
          id: ra.room.id,
          name: ra.room.name,
          capacity: ra.room.capacity,
          availableSlots: ra.availableSlots,
          totalSlots: ra.totalSlots
        }))
      }
    })

    return NextResponse.json({
      hostels: hostelsWithAvailability,
      date: date.toISOString().split('T')[0]
    })
  } catch (error) {
    console.error('Error fetching hostels:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hostels' },
      { status: 500 }
    )
  }
}