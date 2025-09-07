'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import AvailabilityGrid from '@/components/AvailabilityGrid';
import BookingSheet from '@/components/BookingSheet';
import { DatePicker } from '@/components/DatePicker';
import { Building, Calendar, Users, MapPin, LogOut, User } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useUser, SignOutButton, UserButton } from '@clerk/nextjs';
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

type ActiveView = 'dashboard' | 'rooms' | 'bookings';

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

  const getAvailabilityBadgeVariant = (percentage: number) => {
    if (percentage >= 70) return 'default';
    if (percentage >= 40) return 'secondary';
    return 'destructive';
  };

  const getAvailabilityStatus = (percentage: number) => {
    if (percentage >= 70) return 'High';
    if (percentage >= 40) return 'Medium';
    return 'Low';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Building className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-xl font-bold">Hostel Management</h1>
                  <p className="text-xs text-muted-foreground">Room Booking System</p>
                </div>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center space-x-1">
              <Button
                variant={activeView === 'dashboard' ? 'default' : 'ghost'}
                className="flex items-center gap-2"
                onClick={() => setActiveView('dashboard')}
              >
                <Building className="h-4 w-4" />
                Dashboard
              </Button>
              <Button
                variant={activeView === 'rooms' ? 'default' : 'ghost'}
                className="flex items-center gap-2"
                onClick={() => setActiveView('rooms')}
              >
                <Calendar className="h-4 w-4" />
                Availability Grid
              </Button>
            </nav>

            <div className="flex items-center gap-4">
              <DatePicker
                date={selectedDate}
                onDateChange={setSelectedDate}
                placeholder="Select date"
              />
              <Badge variant="outline" className="hidden sm:inline-flex">
                H1-H7
              </Badge>
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-sm">
                  <div className="font-medium">{user?.fullName || user?.firstName}</div>
                  <div className="text-muted-foreground text-xs">{user?.primaryEmailAddress?.emailAddress}</div>
                </div>
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "h-8 w-8"
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="md:hidden pb-3">
            <nav className="flex space-x-1">
              <Button
                variant={activeView === 'dashboard' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('dashboard')}
              >
                Dashboard
              </Button>
              <Button
                variant={activeView === 'rooms' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('rooms')}
              >
                Grid View
              </Button>
            </nav>
          </div>
        </div>
      </header>

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
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{hostel.name}</CardTitle>
                        <Badge 
                          variant={getAvailabilityBadgeVariant(hostel.availabilityPercentage)}
                          className="text-xs"
                        >
                          {getAvailabilityStatus(hostel.availabilityPercentage)}
                        </Badge>
                      </div>
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
                        onClick={() => setActiveView('rooms')}
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
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Availability Grid</h2>
              <p className="text-muted-foreground">
                Select time slots to book study rooms for {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'selected date'}
              </p>
            </div>
            
            {selectedDate && (
              <AvailabilityGrid
                date={selectedDate}
                onSlotSelect={handleSlotSelect}
                userId={user?.id || "temp-user"}
              />
            )}
          </div>
        )}
      </main>

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

      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building className="h-5 w-5 text-primary" />
                <span className="font-semibold">Hostel Management MVP</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Real-time room booking with 15-minute slot precision and built-in accountability.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Features</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• 15-minute time slots</li>
                <li>• 2-hour maximum booking</li>
                <li>• Real-time availability</li>
                <li>• QR-based check-in</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Guidelines</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Check-in within 10 minutes</li>
                <li>• Clean room after use</li>
                <li>• Report damages immediately</li>
                <li>• Maximum 2 bookings per day</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t pt-8 mt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2025 Hostel Management System MVP. Following the complete system design architecture.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
