'use client'

import React, { useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Users, MapPin, AlertTriangle, User } from 'lucide-react'
import { format } from 'date-fns'
import { z } from 'zod'
import { useUser } from '@clerk/nextjs'

interface TimeSlot {
  id: string
  startTime: Date
  endTime: Date
  date: string
  isAvailable: boolean
  isMyBooking?: boolean
  bookingId?: string
}

interface BookingSheetProps {
  isOpen: boolean
  onClose: () => void
  roomId?: number
  roomName?: string
  hostelName?: string
  capacity?: number
  startSlot?: TimeSlot
  endSlot?: TimeSlot
  onBookingSubmit?: (bookingData: unknown) => void
}

const bookingSchema = z.object({
  purpose: z.string().min(10, 'Purpose must be at least 10 characters').max(200, 'Purpose must be less than 200 characters'),
  partySize: z.number().min(1).max(20)
})

export default function BookingSheet({
  isOpen,
  onClose,
  roomId,
  roomName,
  hostelName,
  capacity,
  startSlot,
  endSlot,
  onBookingSubmit
}: BookingSheetProps) {
  const { user } = useUser()
  const [formData, setFormData] = useState({
    purpose: '',
    partySize: 1
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    try {
      console.log('Validating formData:', formData)
      bookingSchema.parse(formData)
      setErrors({})
      return true
    } catch (error) {
      console.error('Validation error caught:', error)
      console.log('Error type:', typeof error)
      console.log('Error instanceof z.ZodError:', error instanceof z.ZodError)
      if (error instanceof z.ZodError) {
        console.log('ZodError details:', error)
        console.log('error.issues:', error.issues)
        if (error.issues && Array.isArray(error.issues)) {
          const newErrors: Record<string, string> = {}
          error.issues.forEach(err => {
            console.log('Processing error:', err)
            if (err.path && err.path[0]) {
              newErrors[err.path[0] as string] = err.message
            }
          })
          setErrors(newErrors)
        } else {
          console.error('error.issues is not an array:', error.issues)
          setErrors({ general: 'Validation error occurred' })
        }
      } else {
        console.error('Non-ZodError validation error:', error)
        setErrors({ general: 'Validation failed' })
      }
      return false
    }
  }

  const calculateDuration = (): string => {
    if (!startSlot || !endSlot) return '0 minutes'
    
    const startTime = new Date(startSlot.startTime)
    const endTime = new Date(endSlot.endTime)
    const durationMs = endTime.getTime() - startTime.getTime()
    const durationMinutes = durationMs / (1000 * 60)
    
    if (durationMinutes < 60) {
      return `${durationMinutes} minutes`
    } else {
      const hours = Math.floor(durationMinutes / 60)
      const minutes = durationMinutes % 60
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !startSlot || !endSlot || !roomId) return

    setIsSubmitting(true)
    
    try {
      const bookingData = {
        roomId,
        startTime: new Date(startSlot.startTime).toISOString(),
        endTime: new Date(endSlot.endTime).toISOString(),
        purpose: formData.purpose.trim(),
        partySize: formData.partySize
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create booking')
      }

      const result = await response.json()
      onBookingSubmit?.(result.booking)
      
      // Reset form and close
      setFormData({
        purpose: '',
        partySize: 1
      })
      onClose()

    } catch (error) {
      console.error('Booking failed:', error)
      alert(error instanceof Error ? error.message : 'Failed to create booking')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDateTime = (slot: TimeSlot) => {
    return format(new Date(slot.startTime), 'EEEE, MMM d, yyyy \'at\' h:mm a')
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Book Study Room</SheetTitle>
          <SheetDescription>
            Complete the details below to confirm your booking
          </SheetDescription>
        </SheetHeader>

        {startSlot && endSlot && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3 my-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{hostelName}</span>
              </div>
              <Badge variant="outline">{roomName}</Badge>
            </div>
            
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDateTime(startSlot)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(startSlot.startTime), 'h:mm a')} - {format(new Date(endSlot.endTime), 'h:mm a')} 
                  <span className="text-muted-foreground ml-2">({calculateDuration()})</span>
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Room capacity: {capacity} students</span>
            </div>
          </div>
        )}

        {/* User Info Section */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Booking for:</span>
          </div>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'Unknown'}</div>
            <div><span className="text-muted-foreground">Email:</span> {user?.primaryEmailAddress?.emailAddress || 'Not provided'}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="space-y-2">
            <Label htmlFor="partySize">Number of Students</Label>
            <Input
              id="partySize"
              type="number"
              min={1}
              max={capacity || 20}
              value={formData.partySize}
              onChange={(e) => handleInputChange('partySize', parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose of Booking</Label>
            <Textarea
              id="purpose"
              placeholder="Describe the purpose of your booking (e.g., group study session for mathematics exam, project discussion, etc.)"
              value={formData.purpose}
              onChange={(e) => handleInputChange('purpose', e.target.value)}
              className={errors.purpose ? 'border-destructive' : ''}
              rows={3}
            />
            {errors.purpose && (
              <p className="text-sm text-destructive">{errors.purpose}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.purpose.length}/200 characters (minimum 10 required)
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-amber-800">Booking Guidelines</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Maximum booking duration: 2 hours</li>
                  <li>• Check-in within 10 minutes of start time</li>
                  <li>• Clean the room after use</li>
                  <li>• Report any damages immediately</li>
                </ul>
              </div>
            </div>
          </div>
        </form>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !startSlot || !endSlot}>
            {isSubmitting ? 'Creating Booking...' : 'Confirm Booking'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}