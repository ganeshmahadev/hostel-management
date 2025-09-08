'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Edit3, 
  X, 
  CheckCircle,
  AlertCircle,
  History,
  AlertTriangle
} from 'lucide-react'
import { format, isToday, isTomorrow, isPast, isThisWeek } from 'date-fns'
import { useUser } from '@clerk/nextjs'
import DamageReportForm from './DamageReportForm'

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

interface MyBookingsSectionProps {
  onEditBooking?: (booking: Booking) => void
}

export default function MyBookingsSection({ onEditBooking }: MyBookingsSectionProps) {
  const { user } = useUser()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [damageReportOpen, setDamageReportOpen] = useState(false)
  const [selectedBookingForDamage, setSelectedBookingForDamage] = useState<Booking | null>(null)

  useEffect(() => {
    if (user) {
      fetchMyBookings()
    }
  }, [user])

  const fetchMyBookings = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/bookings?me=true&range=all&userId=${user?.id}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch bookings')
      }
      
      setBookings(data.bookings || [])
    } catch (error) {
      console.error('Error fetching bookings:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch bookings')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return
    }

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cancel booking')
      }

      // Refresh bookings
      fetchMyBookings()
    } catch (error) {
      console.error('Error cancelling booking:', error)
      alert(error instanceof Error ? error.message : 'Failed to cancel booking')
    }
  }

  const handleReportDamage = (booking: Booking) => {
    setSelectedBookingForDamage(booking)
    setDamageReportOpen(true)
  }

  const handleDamageReportSubmit = async (reportData: any) => {
    try {
      const response = await fetch('/api/damage-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: selectedBookingForDamage?.id.toString(),
          roomId: selectedBookingForDamage?.room.id.toString(),
          reporterId: user?.id,
          description: reportData.damageDescription,
          severity: reportData.severity,
          estimatedCost: reportData.estimatedCost,
          photos: reportData.photos || []
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit damage report')
      }

      setDamageReportOpen(false)
      setSelectedBookingForDamage(null)
      alert('Damage report submitted successfully!')
    } catch (error) {
      console.error('Error submitting damage report:', error)
      alert('Failed to submit damage report. Please try again.')
    }
  }

  const getBookingStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'CANCELLED':
        return <X className="h-4 w-4 text-red-500" />
      case 'COMPLETED':
        return <History className="h-4 w-4 text-blue-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'CANCELLED':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'COMPLETED':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      default:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
    }
  }

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a')
  }

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMs = end.getTime() - start.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    
    if (diffHours < 1) {
      const diffMinutes = Math.round(diffMs / (1000 * 60))
      return `${diffMinutes}m`
    } else {
      const hours = Math.floor(diffHours)
      const minutes = Math.round((diffHours - hours) * 60)
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
    }
  }

  const canModifyBooking = (booking: Booking) => {
    if (booking.status !== 'CONFIRMED') {
      return false
    }
    
    const startTime = new Date(booking.startTime)
    const now = new Date()
    
    // Can modify if booking is confirmed and hasn't started yet
    return startTime > now
  }

  const groupBookingsByDate = (bookings: Booking[]) => {
    const groups: Record<string, Booking[]> = {
      today: [],
      tomorrow: [],
      thisWeek: [],
      future: [],
      past: []
    }

    bookings.forEach(booking => {
      const bookingDate = new Date(booking.startTime)
      
      if (isToday(bookingDate)) {
        groups.today.push(booking)
      } else if (isTomorrow(bookingDate)) {
        groups.tomorrow.push(booking)
      } else if (isPast(bookingDate)) {
        groups.past.push(booking)
      } else if (isThisWeek(bookingDate)) {
        groups.thisWeek.push(booking)
      } else {
        groups.future.push(booking)
      }
    })

    // Sort each group by start time
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    })

    return groups
  }

  const renderBookingCard = (booking: Booking) => (
    <Card key={booking.id} className="mb-4">
      <CardContent className="pt-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {booking.room.hostel.name} - {booking.room.name}
              </span>
              <div className="flex items-center gap-1">
                {getBookingStatusIcon(booking.status)}
                <Badge variant="outline" className={getBookingStatusColor(booking.status)}>
                  {booking.status}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>
                  {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                  <span className="ml-1">({calculateDuration(booking.startTime, booking.endTime)})</span>
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{booking.partySize} student{booking.partySize !== 1 ? 's' : ''}</span>
              </div>
            </div>
            
            {booking.purpose && (
              <p className="text-sm text-muted-foreground mb-3">
                <strong>Purpose:</strong> {booking.purpose}
              </p>
            )}
            
            {booking.updatedAt && booking.updatedAt !== booking.createdAt && (
              <p className="text-xs text-muted-foreground">
                Last modified: {format(new Date(booking.updatedAt), 'MMM d, h:mm a')}
              </p>
            )}
          </div>
          
          <div className="flex gap-2 ml-4">
            {canModifyBooking(booking) ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEditBooking?.(booking)}
                  className="flex items-center gap-1"
                >
                  <Edit3 className="h-3 w-3" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCancelBooking(booking.id)}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </Button>
              </>
            ) : (
              booking.status === 'CONFIRMED' && (
                <div className="flex items-center gap-2">
                  {isPast(new Date(booking.startTime)) ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReportDamage(booking)}
                      className="flex items-center gap-1 text-orange-600 hover:text-orange-700"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      Report Damage
                    </Button>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">
                      Booking has started or completed
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderBookingGroup = (title: string, bookings: Booking[], icon: React.ReactNode) => {
    if (bookings.length === 0) return null

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h3 className="text-lg font-medium">{title}</h3>
          <Badge variant="secondary">{bookings.length}</Badge>
        </div>
        {bookings.map(renderBookingCard)}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h2 className="text-xl font-semibold">My Bookings</h2>
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <Skeleton className="h-6 w-64 mb-2" />
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h2 className="text-xl font-semibold">My Bookings</h2>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Bookings</h3>
            <p className="text-muted-foreground text-center mb-4">{error}</p>
            <Button onClick={fetchMyBookings}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const groupedBookings = groupBookingsByDate(bookings)

  if (bookings.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h2 className="text-xl font-semibold">My Bookings</h2>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Bookings Yet</h3>
            <p className="text-muted-foreground text-center">
              You haven&apos;t made any room bookings. Go to the Availability tab to book your first study room!
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h2 className="text-xl font-semibold">My Bookings</h2>
          <Badge variant="outline">{bookings.length} total</Badge>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={fetchMyBookings}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      {renderBookingGroup(
        'Today', 
        groupedBookings.today, 
        <Calendar className="h-4 w-4 text-green-600" />
      )}
      
      {renderBookingGroup(
        'Tomorrow', 
        groupedBookings.tomorrow, 
        <Calendar className="h-4 w-4 text-blue-600" />
      )}
      
      {renderBookingGroup(
        'This Week', 
        groupedBookings.thisWeek, 
        <Calendar className="h-4 w-4 text-purple-600" />
      )}
      
      {renderBookingGroup(
        'Future', 
        groupedBookings.future, 
        <Calendar className="h-4 w-4 text-indigo-600" />
      )}
      
      {renderBookingGroup(
        'Past Bookings', 
        groupedBookings.past, 
        <History className="h-4 w-4 text-muted-foreground" />
      )}

      <DamageReportForm
        isOpen={damageReportOpen}
        onClose={() => {
          setDamageReportOpen(false)
          setSelectedBookingForDamage(null)
        }}
        booking={selectedBookingForDamage ? {
          id: selectedBookingForDamage.id.toString(),
          roomId: selectedBookingForDamage.room.id.toString(),
          studentName: user?.fullName || user?.firstName || 'User',
          studentEmail: user?.primaryEmailAddress?.emailAddress || '',
          studentPhone: '',
          timeSlot: {
            id: '',
            startTime: selectedBookingForDamage.startTime,
            endTime: selectedBookingForDamage.endTime,
            date: selectedBookingForDamage.startTime.split('T')[0]
          },
          purpose: selectedBookingForDamage.purpose || '',
          status: selectedBookingForDamage.status,
          createdAt: new Date(selectedBookingForDamage.createdAt),
          updatedAt: new Date(selectedBookingForDamage.updatedAt || selectedBookingForDamage.createdAt)
        } : undefined}
        onDamageReportSubmit={handleDamageReportSubmit}
      />
    </div>
  )
}