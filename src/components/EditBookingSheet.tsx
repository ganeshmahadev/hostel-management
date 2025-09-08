'use client'

import React, { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin, AlertTriangle, User, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { z } from 'zod'
import { useUser } from '@clerk/nextjs'

interface Booking {
  id: number
  startTime: string
  endTime: string
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  purpose: string | null
  partySize: number
  room: {
    id: number
    name: string
    hostel: {
      name: string
      code: string
    }
  }
  createdAt: string
  updatedAt?: string
}

interface EditBookingSheetProps {
  isOpen: boolean
  onClose: () => void
  booking: Booking | null
  onBookingUpdated?: (updatedBooking: Booking) => void
}

const updateBookingSchema = z.object({
  purpose: z.string().min(10, 'Purpose must be at least 10 characters').max(200, 'Purpose must be less than 200 characters').optional(),
  partySize: z.number().min(1).max(20).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional()
})

export default function EditBookingSheet({
  isOpen,
  onClose,
  booking,
  onBookingUpdated
}: EditBookingSheetProps) {
  const { user } = useUser()
  const [formData, setFormData] = useState({
    purpose: '',
    partySize: 1,
    startTime: '',
    endTime: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize form data when booking changes
  useEffect(() => {
    if (booking) {
      const startTime = format(new Date(booking.startTime), 'HH:mm')
      const endTime = format(new Date(booking.endTime), 'HH:mm')
      
      setFormData({
        purpose: booking.purpose || '',
        partySize: booking.partySize,
        startTime,
        endTime
      })
      setHasChanges(false)
      setErrors({})
    }
  }, [booking])

  // Check for changes
  useEffect(() => {
    if (!booking) return

    const originalStartTime = format(new Date(booking.startTime), 'HH:mm')
    const originalEndTime = format(new Date(booking.endTime), 'HH:mm')
    
    const changed = 
      formData.purpose !== (booking.purpose || '') ||
      formData.partySize !== booking.partySize ||
      formData.startTime !== originalStartTime ||
      formData.endTime !== originalEndTime

    setHasChanges(changed)
  }, [formData, booking])

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    try {
      // Check if booking can still be modified (15-minute rule)
      if (booking) {
        const now = new Date()
        const bookingStartTime = new Date(booking.startTime)
        const timeDiff = bookingStartTime.getTime() - now.getTime()
        const minutesUntilBooking = timeDiff / (1000 * 60)

        if (minutesUntilBooking <= 0) {
          setErrors({ general: 'Cannot modify bookings that have already started or are in the past' })
          return false
        }

        if (minutesUntilBooking < 15) {
          setErrors({ general: 'Bookings can only be modified at least 15 minutes before the start time' })
          return false
        }
      }

      const dataToValidate: Record<string, unknown> = {}
      
      // Only validate fields that have been changed or are required
      if (formData.purpose) {
        dataToValidate.purpose = formData.purpose
      }
      if (formData.partySize) {
        dataToValidate.partySize = formData.partySize
      }
      
      updateBookingSchema.parse(dataToValidate)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError && error.errors && Array.isArray(error.errors)) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach(err => {
          if (err.path && err.path[0]) {
            newErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(newErrors)
      } else {
        setErrors({ general: 'Validation failed' })
      }
      return false
    }
  }

  const calculateDuration = (start: string, end: string): string => {
    if (!start || !end || !booking) return '0 minutes'
    
    try {
      const bookingDate = new Date(booking.startTime).toISOString().split('T')[0]
      const startDateTime = new Date(`${bookingDate}T${start}:00`)
      const endDateTime = new Date(`${bookingDate}T${end}:00`)
      
      const durationMs = endDateTime.getTime() - startDateTime.getTime()
      const durationMinutes = durationMs / (1000 * 60)
      
      if (durationMinutes < 60) {
        return `${durationMinutes} minutes`
      } else {
        const hours = Math.floor(durationMinutes / 60)
        const minutes = durationMinutes % 60
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
      }
    } catch (error) {
      return '0 minutes'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!booking || !validateForm() || !hasChanges) return

    setIsSubmitting(true)
    
    try {
      const updateData: Record<string, unknown> = {}
      
      // Only include changed fields
      const originalStartTime = format(new Date(booking.startTime), 'HH:mm')
      const originalEndTime = format(new Date(booking.endTime), 'HH:mm')
      
      if (formData.purpose !== (booking.purpose || '')) {
        updateData.purpose = formData.purpose.trim()
      }
      
      if (formData.partySize !== booking.partySize) {
        updateData.partySize = formData.partySize
      }
      
      if (formData.startTime !== originalStartTime || formData.endTime !== originalEndTime) {
        const bookingDate = new Date(booking.startTime).toISOString().split('T')[0]
        updateData.startTime = new Date(`${bookingDate}T${formData.startTime}:00`).toISOString()
        updateData.endTime = new Date(`${bookingDate}T${formData.endTime}:00`).toISOString()
      }

      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update booking')
      }

      const result = await response.json()
      onBookingUpdated?.(result.booking)
      
      // Reset form state
      setHasChanges(false)
      setErrors({})
      
      onClose()

    } catch (error) {
      console.error('Booking update failed:', error)
      alert(error instanceof Error ? error.message : 'Failed to update booking')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'EEEE, MMM d, yyyy')
  }

  if (!booking) return null

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Booking</SheetTitle>
          <SheetDescription>
            Modify your booking details below
          </SheetDescription>
        </SheetHeader>

        <div className="bg-muted/50 rounded-lg p-4 space-y-3 my-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{booking.room.hostel.name}</span>
            </div>
            <Badge variant="outline">{booking.room.name}</Badge>
          </div>
          
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDateTime(booking.startTime)}</span>
            </div>
          </div>
        </div>

        {/* User Info Section */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Booking Details:</span>
          </div>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'Unknown'}</div>
            <div><span className="text-muted-foreground">Booking ID:</span> #{booking.id}</div>
            <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{booking.status}</Badge></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* General Error Display */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">Cannot Modify Booking</h4>
                  <p className="text-sm text-red-700 mt-1">{errors.general}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => handleInputChange('startTime', e.target.value)}
                min="00:00"
                max="23:30"
                step="1800" // 30 minute steps
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => handleInputChange('endTime', e.target.value)}
                min="00:30"
                max="23:59"
                step="1800" // 30 minute steps
              />
            </div>
          </div>
          
          {formData.startTime && formData.endTime && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Duration: {calculateDuration(formData.startTime, formData.endTime)}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="partySize">Number of Students</Label>
            <Input
              id="partySize"
              type="number"
              min={1}
              max={20}
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
              <RefreshCw className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-amber-800">Modification Guidelines</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Changes will take effect immediately</li>
                  <li>• Time changes are subject to room availability</li>
                  <li>• Maximum booking duration: 2 hours</li>
                  <li>• Cannot modify bookings that have already started</li>
                </ul>
              </div>
            </div>
          </div>
        </form>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !hasChanges}
          >
            {isSubmitting ? 'Updating...' : hasChanges ? 'Save Changes' : 'No Changes'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}