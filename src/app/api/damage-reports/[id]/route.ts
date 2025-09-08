import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const damageReport = await db.damageReport.findUnique({
      where: {
        id: params.id
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

    if (!damageReport) {
      return NextResponse.json(
        { error: 'Damage report not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      damageReport
    })

  } catch (error) {
    console.error('Error fetching damage report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch damage report' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status, assessedBy, penalty } = body

    const damageReport = await db.damageReport.update({
      where: {
        id: params.id
      },
      data: {
        status: status?.toUpperCase(),
        assessedBy,
        assessedAt: status === 'RESOLVED' ? new Date() : undefined,
        penalty: penalty ? parseInt(penalty) : null
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
    console.error('Error updating damage report:', error)
    return NextResponse.json(
      { error: 'Failed to update damage report' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.damageReport.delete({
      where: {
        id: params.id
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Damage report deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting damage report:', error)
    return NextResponse.json(
      { error: 'Failed to delete damage report' },
      { status: 500 }
    )
  }
}
