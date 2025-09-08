import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { validateBookingSlots, validateBookingModificationTiming, validateModifiedBookingLimits } from '@/lib/availability'
import { z } from 'zod'
// import { isBefore, addMinutes } from 'date-fns'

const updateBookingSchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  purpose: z.string().max(200).optional(),
  partySize: z.number().min(1).max(20).optional()
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const bookingId = parseInt(id)
    if (isNaN(bookingId)) {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      )
    }

    // Get existing booking
    const existingBooking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: {
          include: {
            hostel: true
          }
        }
      }
    })

    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Check ownership
    if (existingBooking.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this booking' },
        { status: 403 }
      )
    }

    // Check if booking can be modified based on timing rules
    const modificationTimingCheck = validateBookingModificationTiming(existingBooking.startTime)
    if (!modificationTimingCheck.canModify) {
      return NextResponse.json(
        { error: modificationTimingCheck.error },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const updateData = updateBookingSchema.parse(body)

    // Determine final values (use existing if not provided)
    const finalStartTime = updateData.startTime ? new Date(updateData.startTime) : existingBooking.startTime
    const finalEndTime = updateData.endTime ? new Date(updateData.endTime) : existingBooking.endTime
    const finalPurpose = updateData.purpose !== undefined ? updateData.purpose : existingBooking.purpose
    const finalPartySize = updateData.partySize !== undefined ? updateData.partySize : existingBooking.partySize

    // Validate time slots if they changed
    if (updateData.startTime || updateData.endTime) {
      const slotValidation = validateBookingSlots(
        { 
          id: '', 
          startTime: finalStartTime, 
          endTime: finalStartTime, 
          date: finalStartTime.toISOString().split('T')[0], 
          isAvailable: true 
        },
        { 
          id: '', 
          startTime: finalEndTime, 
          endTime: finalEndTime, 
          date: finalEndTime.toISOString().split('T')[0], 
          isAvailable: true 
        }
      )

      if (!slotValidation.isValid) {
        return NextResponse.json(
          { error: slotValidation.error },
          { status: 400 }
        )
      }

      // Validate modified booking limits
      const limitsValidation = await validateModifiedBookingLimits(
        userId,
        { startTime: existingBooking.startTime, endTime: existingBooking.endTime },
        finalStartTime,
        finalEndTime
      )

      if (!limitsValidation.isValid) {
        return NextResponse.json(
          { error: limitsValidation.error },
          { status: 400 }
        )
      }

      // Check for conflicts (excluding current booking)
      const conflict = await db.booking.findFirst({
        where: {
          id: { not: bookingId },
          roomId: existingBooking.roomId,
          startTime: {
            lt: finalEndTime
          },
          endTime: {
            gt: finalStartTime
          },
          status: {
            not: 'CANCELLED'
          }
        }
      })

      if (conflict) {
        return NextResponse.json(
          { error: 'New time slot conflicts with another booking' },
          { status: 400 }
        )
      }
    }

    // Update the booking
    const updatedBooking = await db.booking.update({
      where: { id: bookingId },
      data: {
        startTime: finalStartTime,
        endTime: finalEndTime,
        purpose: finalPurpose,
        partySize: finalPartySize,
        updatedAt: new Date()
      },
      include: {
        room: {
          include: {
            hostel: true
          }
        }
      }
    })

    return NextResponse.json({
      booking: {
        id: updatedBooking.id,
        startTime: updatedBooking.startTime,
        endTime: updatedBooking.endTime,
        status: updatedBooking.status,
        purpose: updatedBooking.purpose,
        partySize: updatedBooking.partySize,
        room: {
          id: updatedBooking.room.id,
          name: updatedBooking.room.name,
          hostel: {
            name: updatedBooking.room.hostel.name,
            code: updatedBooking.room.hostel.code
          }
        },
        createdAt: updatedBooking.createdAt,
        updatedAt: updatedBooking.updatedAt
      },
      message: 'Booking updated successfully'
    })

  } catch (error) {
    console.error('Error updating booking:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid update data', details: error.errors },
        { status: 400 }
      )
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to update booking'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const bookingId = parseInt(id)
    if (isNaN(bookingId)) {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      )
    }

    // Get existing booking
    const existingBooking = await db.booking.findUnique({
      where: { id: bookingId }
    })

    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Check ownership
    if (existingBooking.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to cancel this booking' },
        { status: 403 }
      )
    }

    // Check if booking can be cancelled based on timing rules
    const modificationTimingCheck = validateBookingModificationTiming(existingBooking.startTime)
    if (!modificationTimingCheck.canModify) {
      return NextResponse.json(
        { error: modificationTimingCheck.error },
        { status: 400 }
      )
    }

    // Update booking status to CANCELLED
    const cancelledBooking = await db.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      message: 'Booking cancelled successfully',
      bookingId: cancelledBooking.id
    })

  } catch (error) {
    console.error('Error cancelling booking:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to cancel booking'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}