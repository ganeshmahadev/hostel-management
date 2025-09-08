import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      bookingId, 
      roomId, 
      reporterId, 
      description, 
      photos = []
    } = body

    // Validate required fields
    if (!bookingId || !roomId || !reporterId || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create damage report
    const damageReport = await db.damageReport.create({
      data: {
        bookingId,
        roomId: parseInt(roomId),
        reporterId,
        description,
        photos,
        status: 'REPORTED'
      },
      include: {
        booking: {
          include: {
            room: {
              include: {
                hostel: true
              }
            }
          }
        },
        room: {
          include: {
            hostel: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      damageReport
    })

  } catch (error) {
    console.error('Error creating damage report:', error)
    return NextResponse.json(
      { error: 'Failed to create damage report' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const status = searchParams.get('status')
    const reporterId = searchParams.get('reporterId')

    const where: Record<string, unknown> = {}
    
    if (roomId) where.roomId = parseInt(roomId)
    if (status) where.status = status.toUpperCase()
    if (reporterId) where.reporterId = reporterId

    const damageReports = await db.damageReport.findMany({
      where,
      include: {
        booking: {
          include: {
            room: {
              include: {
                hostel: true
              }
            }
          }
        },
        room: {
          include: {
            hostel: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      damageReports
    })

  } catch (error) {
    console.error('Error fetching damage reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch damage reports' },
      { status: 500 }
    )
  }
}
