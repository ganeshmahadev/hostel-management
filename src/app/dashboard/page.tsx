'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import AvailabilityGrid from '@/components/AvailabilityGrid';
import BookingSheet from '@/components/BookingSheet';
import MyBookingsSection from '@/components/MyBookingsSection';
import EditBookingSheet from '@/components/EditBookingSheet';
import { HostelSidebar } from '@/components/HostelSidebar';
import { Building, Users, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { useUser } from '@clerk/nextjs';
import { formatDateForAPI } from '@/lib/utils';

interface TimeSlot {
  id: string
  startTime: Date
  endTime: Date
  date: string
  isAvailable: boolean
  isMyBooking?: boolean
  bookingId?: string
}

interface HostelData {
  id: number
  name: string
  code: string
  activeRooms: number
  totalSlots: number
  availableSlots: number
  availabilityPercentage: number
  rooms: Array<{
    id: number
    name: string
    capacity: number
    availableSlots: number
    totalSlots: number
  }>
}

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

type ActiveView = 'dashboard' | 'rooms' | 'mybookings';

export default function HostelManagement() {
  const { user, isSignedIn, isLoaded } = useUser();
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [hostelsData, setHostelsData] = useState<HostelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingSheetOpen, setBookingSheetOpen] = useState(false);
  const [selectedBookingData, setSelectedBookingData] = useState<{
    roomId: number;
    roomName: string;
    hostelName: string;
    capacity: number;
    startSlot: TimeSlot;
    endSlot: TimeSlot;
  } | null>(null);
  const [editBookingSheetOpen, setEditBookingSheetOpen] = useState(false);
  const [selectedBookingForEdit, setSelectedBookingForEdit] = useState<Booking | null>(null);
  const [selectedHostelId, setSelectedHostelId] = useState<number | null>(null);
  const [selectedHostelCode, setSelectedHostelCode] = useState<string | null>(null);
  const [previousView, setPreviousView] = useState<ActiveView>('dashboard');

  useEffect(() => {
    if (isSignedIn && selectedDate) {
      fetchHostelsData();
    }
  }, [selectedDate, isSignedIn]); // fetchHostelsData is stable

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Building className="h-12 w-12 text-primary mx-auto" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">Please sign in to access the dashboard</p>
        </div>
      </div>
    );
  }

  const fetchHostelsData = async () => {
    if (!selectedDate) return;
    
    try {
      setLoading(true);
      const params = new URLSearchParams({
        date: formatDateForAPI(selectedDate),
      });
      
      const response = await fetch(`/api/hostels?${params}`);
      const data = await response.json();
      
      setHostelsData(data.hostels || []);
    } catch (error) {
      console.error('Failed to fetch hostels data:', error);
      setHostelsData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelect = (roomId: number, startSlot: TimeSlot, endSlot?: TimeSlot) => {
    // Find room details
    const room = hostelsData.flatMap(h => h.rooms).find(r => r.id === roomId);
    const hostel = hostelsData.find(h => h.rooms.some(r => r.id === roomId));
    
    if (room && hostel && endSlot) {
      setSelectedBookingData({
        roomId,
        roomName: room.name,
        hostelName: hostel.name,
        capacity: room.capacity,
        startSlot,
        endSlot
      });
      setBookingSheetOpen(true);
    }
  };

  const handleBookingSubmit = (bookingData: unknown) => {
    console.log('Booking created:', bookingData);
    // Refresh data after booking
    fetchHostelsData();
  };

  const handleEditBooking = (booking: Booking) => {
    setSelectedBookingForEdit(booking);
    setEditBookingSheetOpen(true);
  };

  const handleBookingUpdated = (updatedBooking: Booking) => {
    console.log('Booking updated:', updatedBooking);
    // Refresh data after booking modification
    fetchHostelsData();
    // The MyBookingsSection component will automatically refresh via its own state management
  };

  const handleViewChange = (newView: ActiveView) => {
    setPreviousView(activeView);
    setActiveView(newView);
  };

  const handleHostelSelection = (hostelId: number) => {
    const hostel = hostelsData.find(h => h.id === hostelId);
    if (hostel) {
      setSelectedHostelId(hostelId);
      setSelectedHostelCode(hostel.code);
      setPreviousView(activeView);
      setActiveView('rooms');
    }
  };

  const handleBackToPrevious = () => {
    setActiveView(previousView);
    setSelectedHostelId(null);
    setSelectedHostelCode(null);
  };


  return (
    <HostelSidebar
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
      activeView={activeView}
      onViewChange={handleViewChange}
    >
      <div className="min-h-screen bg-background">
        <main className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeView === 'dashboard' && (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
              <p className="text-muted-foreground">
                Overview of room availability across all hostels for {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'selected date'}
              </p>
            </div>

            {/* Hostel Cards Grid */}
            {loading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 7 }, (_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-3">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-8 w-full mt-4" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {hostelsData.map((hostel) => (
                  <Card key={hostel.id} className="relative overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{hostel.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        {hostel.code} • {hostel.activeRooms} active room{hostel.activeRooms !== 1 ? 's' : ''}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Availability</span>
                          <span className="font-medium">
                            {hostel.availableSlots} / {hostel.totalSlots} slots
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${hostel.availabilityPercentage}%`,
                              backgroundColor: hostel.availabilityPercentage >= 70 ? 'hsl(var(--primary))' :
                                             hostel.availabilityPercentage >= 40 ? '#f59e0b' : '#ef4444'
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {hostel.availabilityPercentage}% available
                        </p>
                      </div>

                      {/* Room breakdown */}
                      <div className="space-y-2">
                        {hostel.rooms.map((room) => (
                          <div key={room.id} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                              <span>{room.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">{room.capacity}</span>
                              <span className="ml-2 font-medium">
                                {room.availableSlots}/{room.totalSlots}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button 
                        className="w-full" 
                        size="sm"
                        onClick={() => handleHostelSelection(hostel.id)}
                      >
                        View Availability Grid
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Hostels</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">7</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Active Rooms</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {hostelsData.reduce((sum, h) => sum + h.activeRooms, 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Available Slots</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {hostelsData.reduce((sum, h) => sum + h.availableSlots, 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Overall Availability</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {hostelsData.length > 0 
                      ? Math.round(hostelsData.reduce((sum, h) => sum + h.availabilityPercentage, 0) / hostelsData.length)
                      : 0
                    }%
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeView === 'rooms' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Availability Grid</h2>
                <p className="text-muted-foreground">
                  {selectedHostelId ? (
                    <>
                      {hostelsData.find(h => h.id === selectedHostelId)?.name} - Select time slots to book study rooms for {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'selected date'}
                    </>
                  ) : (
                    <>
                      Select time slots to book study rooms for {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'selected date'}
                    </>
                  )}
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleBackToPrevious}
                className="flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to {previousView === 'dashboard' ? 'Dashboard' : previousView === 'mybookings' ? 'My Bookings' : 'Previous'}
              </Button>
            </div>
            
            {selectedDate && (
              <AvailabilityGrid
                date={selectedDate}
                onSlotSelect={handleSlotSelect}
                userId={user?.id || "temp-user"}
                hostelCode={selectedHostelCode}
              />
            )}
          </div>
        )}

        {activeView === 'mybookings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">My Bookings</h2>
              <p className="text-muted-foreground">
                View and manage all your room bookings
              </p>
            </div>
            
            <MyBookingsSection onEditBooking={handleEditBooking} />
          </div>
        )}

        <BookingSheet
          isOpen={bookingSheetOpen}
          onClose={() => setBookingSheetOpen(false)}
          roomId={selectedBookingData?.roomId}
          roomName={selectedBookingData?.roomName}
          hostelName={selectedBookingData?.hostelName}
          capacity={selectedBookingData?.capacity}
          startSlot={selectedBookingData?.startSlot}
          endSlot={selectedBookingData?.endSlot}
          onBookingSubmit={handleBookingSubmit}
        />

        <EditBookingSheet
          isOpen={editBookingSheetOpen}
          onClose={() => setEditBookingSheetOpen(false)}
          booking={selectedBookingForEdit}
          onBookingUpdated={handleBookingUpdated}
        />
        </main>
      </div>
    </HostelSidebar>
  );
}
