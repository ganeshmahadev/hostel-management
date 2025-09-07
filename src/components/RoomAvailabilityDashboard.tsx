'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, Users, MapPin } from 'lucide-react';
import { hostels, rooms, generateTimeSlots, mockBookings } from '@/data/mockData';
import { TimeSlot, RoomAvailability } from '@/types';

interface RoomAvailabilityDashboardProps {
  onBookRoom?: (roomId: string, timeSlot: TimeSlot) => void;
}

export default function RoomAvailabilityDashboard({ onBookRoom }: RoomAvailabilityDashboardProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const availableRooms = useMemo(() => {
    const studyRooms = rooms.filter(room => room.type === 'GROUP_STUDY' && room.isActive);
    const timeSlots = generateTimeSlots(selectedDate);
    
    return studyRooms.map(room => {
      const roomBookings = mockBookings.filter(
        booking => booking.roomId === room.id && booking.timeSlot.date === selectedDate
      );
      
      const bookedSlotIds = roomBookings.map(booking => booking.timeSlot.id);
      const availableSlots = timeSlots.filter(slot => !bookedSlotIds.includes(slot.id));
      
      return {
        roomId: room.id,
        room,
        availableSlots,
        bookedSlots: roomBookings,
      } as RoomAvailability;
    });
  }, [selectedDate]);

  const getAvailabilityStatus = (availableSlots: TimeSlot[]) => {
    const totalSlots = generateTimeSlots(selectedDate).length;
    const availableCount = availableSlots.length;
    const percentage = (availableCount / totalSlots) * 100;
    
    if (percentage >= 70) return { status: 'High', variant: 'default' as const, color: 'text-foreground' };
    if (percentage >= 40) return { status: 'Medium', variant: 'secondary' as const, color: 'text-muted-foreground' };
    return { status: 'Low', variant: 'destructive' as const, color: 'text-muted-foreground' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getNextAvailableSlot = (availableSlots: TimeSlot[]) => {
    const now = new Date();
    const currentHour = now.getHours();
    
    return availableSlots.find(slot => {
      const slotHour = parseInt(slot.startTime.split(':')[0]);
      return selectedDate === now.toISOString().split('T')[0] ? slotHour > currentHour : true;
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Room Availability</h1>
          <p className="text-muted-foreground">
            Check and book group study rooms across hostels 1-7
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {availableRooms.map((roomAvailability) => {
          const hostel = hostels.find(h => h.id === roomAvailability.room.hostelId);
          const availability = getAvailabilityStatus(roomAvailability.availableSlots);
          const nextSlot = getNextAvailableSlot(roomAvailability.availableSlots);

          return (
            <Card key={roomAvailability.roomId} className="relative overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{hostel?.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {roomAvailability.room.roomNumber}
                      </span>
                    </div>
                  </div>
                  <Badge variant={availability.variant}>
                    {availability.status} Availability
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Capacity: {roomAvailability.room.capacity}</span>
                  </div>
                  <div className={`font-medium ${availability.color}`}>
                    {roomAvailability.availableSlots.length} slots available
                  </div>
                </div>

                {nextSlot ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Next available: {nextSlot.startTime} - {nextSlot.endTime}</span>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={() => onBookRoom?.(roomAvailability.roomId, nextSlot)}
                    >
                      Book Next Slot
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground text-center py-2">
                      No available slots for {formatDate(selectedDate)}
                    </div>
                    <Button className="w-full" disabled>
                      Fully Booked
                    </Button>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-2">Available Time Slots:</div>
                  <div className="grid grid-cols-2 gap-1">
                    {roomAvailability.availableSlots.slice(0, 6).map((slot) => (
                      <Button
                        key={slot.id}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => onBookRoom?.(roomAvailability.roomId, slot)}
                      >
                        {slot.startTime}
                      </Button>
                    ))}
                  </div>
                  {roomAvailability.availableSlots.length > 6 && (
                    <div className="text-xs text-muted-foreground mt-2 text-center">
                      +{roomAvailability.availableSlots.length - 6} more slots
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Booking Rules & Guidelines</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Time Limits</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>• Maximum 2 hours per booking session</p>
              <p>• Bookings available from 8:00 AM to 10:00 PM</p>
              <p>• Advance booking up to 7 days allowed</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accountability</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>• Report any damages immediately</p>
              <p>• Clean the room after use</p>
              <p>• Penalty for no-show or misuse</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}