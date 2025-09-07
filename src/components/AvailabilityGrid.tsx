'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock, Users, MapPin, Calendar } from 'lucide-react'
import { format, isBefore, addMinutes } from 'date-fns'
import { formatDateForAPI } from '@/lib/utils'

interface TimeSlot {
  id: string
  startTime: Date
  endTime: Date
  date: string
  isAvailable: boolean
  isMyBooking?: boolean
  bookingId?: string
}

interface RoomAvailability {
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

interface AvailabilityGridProps {
  roomId?: number
  date: Date
  onSlotSelect?: (roomId: number, startSlot: TimeSlot, endSlot?: TimeSlot) => void
  userId?: string
}

export default function AvailabilityGrid({ 
  roomId, 
  date, 
  onSlotSelect, 
  userId 
}: AvailabilityGridProps) {
  const [roomsData, setRoomsData] = useState<RoomAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSlots, setSelectedSlots] = useState<{ start?: TimeSlot; end?: TimeSlot }>({})
  const [isSelecting, setIsSelecting] = useState(false)

  useEffect(() => {
    fetchRoomAvailability()
  }, [roomId, date, userId]) // fetchRoomAvailability is stable

  const fetchRoomAvailability = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        date: formatDateForAPI(date),
      })
      
      if (userId) params.set('userId', userId)
      if (roomId) params.set('roomId', roomId.toString())

      const response = await fetch(`/api/rooms?${params}`)
      const data = await response.json()

      if (roomId) {
        // Single room data
        setRoomsData([data])
      } else {
        // Multiple rooms data
        setRoomsData(data.rooms || [])
      }
    } catch (error) {
      console.error('Failed to fetch room availability:', error)
      setRoomsData([])
    } finally {
      setLoading(false)
    }
  }

  const getSlotStatus = (slot: TimeSlot): {
    status: 'free' | 'busy' | 'mine' | 'past' | 'selected'
    className: string
    disabled: boolean
  } => {
    // Temporarily disable past slot restrictions for current day booking
    const isPast = false
    
    if (selectedSlots.start?.id === slot.id || selectedSlots.end?.id === slot.id) {
      return {
        status: 'selected',
        className: 'bg-primary text-primary-foreground hover:bg-primary/90',
        disabled: false
      }
    }
    
    if (isPast) {
      return {
        status: 'past',
        className: 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed',
        disabled: true
      }
    }

    if (!slot.isAvailable) {
      if (slot.isMyBooking) {
        return {
          status: 'mine',
          className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
          disabled: false
        }
      }
      return {
        status: 'busy',
        className: 'bg-destructive/10 text-destructive border-destructive/20 cursor-not-allowed',
        disabled: true
      }
    }

    return {
      status: 'free',
      className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
      disabled: false
    }
  }

  const handleSlotClick = (slot: TimeSlot, room: RoomAvailability) => {
    if (getSlotStatus(slot).disabled) return

    if (!isSelecting) {
      // Start selection
      setSelectedSlots({ start: slot })
      setIsSelecting(true)
    } else {
      // End selection
      const startSlot = selectedSlots.start!
      let endSlot = slot

      // Parse dates from strings if needed
      const startTime = new Date(startSlot.startTime)
      const endTime = new Date(slot.endTime)
      const slotStartTime = new Date(slot.startTime)

      // Ensure end is after start
      if (isBefore(slotStartTime, startTime)) {
        endSlot = startSlot
        setSelectedSlots({ start: slot, end: endSlot })
      } else {
        setSelectedSlots({ start: startSlot, end: endSlot })
      }

      // Validate duration (max 2 hours)
      const actualStartTime = new Date((selectedSlots.start || startSlot).startTime)
      const actualEndTime = new Date(endSlot.endTime)
      const durationMs = actualEndTime.getTime() - actualStartTime.getTime()
      const durationHours = durationMs / (1000 * 60 * 60)

      if (durationHours > 2) {
        alert('Maximum booking duration is 2 hours')
        setSelectedSlots({})
        setIsSelecting(false)
        return
      }

      // Call parent callback
      onSlotSelect?.(room.roomId, selectedSlots.start || startSlot, endSlot)
      
      // Reset selection
      setSelectedSlots({})
      setIsSelecting(false)
    }
  }

  const formatTime = (date: Date): string => {
    return format(date, 'HH:mm')
  }

  const getTimeHeaders = () => {
    const headers = []
    for (let hour = 8; hour < 22; hour++) {
      headers.push(`${hour.toString().padStart(2, '0')}:00`)
    }
    return headers
  }

  const isSlotInRange = (slot: TimeSlot): boolean => {
    if (!selectedSlots.start) return false
    
    const start = new Date(selectedSlots.start.startTime)
    const current = new Date(slot.startTime)
    const maxEnd = addMinutes(start, 2 * 60) // Max 2 hours from start
    
    return !isBefore(current, start) && 
           !isBefore(maxEnd, current)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-14 gap-1">
                {Array.from({ length: 56 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      {isSelecting && (
        <Card className="border-primary">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Click another slot to complete your booking selection (max 2 hours)
            </div>
          </CardContent>
        </Card>
      )}

      {roomsData.map((roomData) => (
        <Card key={roomData.roomId} className="overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5" />
                  {roomData.room.hostel.name} - {roomData.room.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Capacity: {roomData.room.capacity}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(date, 'EEEE, MMM d, yyyy')}
                  </div>
                </CardDescription>
              </div>
              
              <div className="text-right space-y-1">
                <Badge variant="outline" className="text-xs">
                  {roomData.availableSlots} / {roomData.totalSlots} available
                </Badge>
                <div className="text-xs text-muted-foreground">
                  {Math.round((roomData.availableSlots / roomData.totalSlots) * 100)}% free
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Time headers */}
            <div className="grid grid-cols-[100px_1fr] gap-4">
              <div></div>
              <div className="grid grid-cols-14 gap-1 text-xs text-muted-foreground">
                {getTimeHeaders().map((hour) => (
                  <div key={hour} className="text-center font-medium col-span-1 border-r border-muted pr-1">
                    {hour}
                  </div>
                ))}
              </div>
            </div>

            {/* Slots grid organized by hour */}
            <div className="grid grid-cols-[100px_1fr] gap-4">
              <div className="flex items-center text-sm font-medium text-muted-foreground">
                30min slots
              </div>
              
              <div className="grid grid-cols-14 gap-1">
                {Array.from({ length: 14 }, (_, hourIndex) => {
                  const hour = 8 + hourIndex
                  const hourSlots = roomData.slots.filter(slot => {
                    const slotHour = new Date(slot.startTime).getHours()
                    return slotHour === hour
                  })
                  
                  return (
                    <div key={hour} className="space-y-1 border-r border-muted/20 pr-1">
                      {hourSlots.map((slot) => {
                        const slotStatus = getSlotStatus(slot)
                        const inRange = isSelecting && isSlotInRange(slot)
                        const minutes = new Date(slot.startTime).getMinutes()
                        
                        return (
                          <Button
                            key={slot.id}
                            variant="outline"
                            size="sm"
                            className={`
                              h-10 w-full p-0 text-xs transition-all duration-200
                              ${slotStatus.className}
                              ${inRange ? 'ring-2 ring-primary ring-offset-1' : ''}
                            `}
                            disabled={slotStatus.disabled}
                            onClick={() => handleSlotClick(slot, roomData)}
                            title={`${formatTime(new Date(slot.startTime))} - ${formatTime(new Date(slot.endTime))}`}
                          >
                            <div className="text-xs leading-tight font-medium">
                              :{minutes.toString().padStart(2, '0')}
                            </div>
                          </Button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-50 border border-green-200"></div>
                <span className="text-muted-foreground">Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-destructive/10 border border-destructive/20"></div>
                <span className="text-muted-foreground">Booked</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></div>
                <span className="text-muted-foreground">My Booking</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-muted opacity-50"></div>
                <span className="text-muted-foreground">Past</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {roomsData.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No rooms available</h3>
            <p className="text-muted-foreground text-center">
              There are no active study rooms for the selected date.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}