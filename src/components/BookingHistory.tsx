'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Search, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader
} from 'lucide-react';
import { Booking } from '@/types';
import { mockBookings, hostels, rooms } from '@/data/mockData';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface BookingHistoryProps {
  userBookings?: Booking[];
  onCancelBooking?: (bookingId: string) => void;
  onReportDamage?: (booking: Booking) => void;
}

export default function BookingHistory({ 
  userBookings = mockBookings, 
  onCancelBooking,
  onReportDamage 
}: BookingHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredBookings = userBookings.filter(booking => {
    const matchesSearch = booking.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'default';
      case 'PENDING': return 'secondary';
      case 'COMPLETED': return 'outline';
      case 'CANCELLED': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return <CheckCircle2 className="h-4 w-4 text-foreground" />;
      case 'PENDING': return <Loader className="h-4 w-4 text-muted-foreground" />;
      case 'COMPLETED': return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
      case 'CANCELLED': return <XCircle className="h-4 w-4 text-muted-foreground" />;
      default: return <Loader className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (startTime: string, endTime: string) => {
    return `${startTime} - ${endTime}`;
  };

  const isUpcoming = (booking: Booking) => {
    const bookingDateTime = new Date(`${booking.timeSlot.date}T${booking.timeSlot.startTime}`);
    return bookingDateTime > new Date() && (booking.status === 'CONFIRMED' || booking.status === 'PENDING');
  };

  const isPast = (booking: Booking) => {
    const bookingDateTime = new Date(`${booking.timeSlot.date}T${booking.timeSlot.endTime}`);
    return bookingDateTime < new Date();
  };

  const canCancel = (booking: Booking) => {
    const bookingDateTime = new Date(`${booking.timeSlot.date}T${booking.timeSlot.startTime}`);
    const hoursUntilBooking = (bookingDateTime.getTime() - new Date().getTime()) / (1000 * 60 * 60);
    return isUpcoming(booking) && hoursUntilBooking > 2; // Can cancel up to 2 hours before
  };

  const canReportDamage = (booking: Booking) => {
    return booking.status === 'COMPLETED' || (booking.status === 'CONFIRMED' && isPast(booking));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
          <p className="text-muted-foreground">
            View and manage your room bookings
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bookings..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
            >
              {status === 'all' ? 'All' : status}
            </Button>
          ))}
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'You haven\'t made any bookings yet. Start by checking room availability!'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredBookings.map((booking) => {
            const room = rooms.find(r => r.id === booking.roomId);
            const hostel = hostels.find(h => h.id === room?.hostelId);

            return (
              <Card key={booking.id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{hostel?.name}</CardTitle>
                        <Badge variant={getStatusColor(booking.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(booking.status)}
                            {booking.status}
                          </span>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {room?.roomNumber}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(booking.timeSlot.date)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatTime(booking.timeSlot.startTime, booking.timeSlot.endTime)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        Booking ID
                      </div>
                      <div className="font-mono text-sm">
                        #{booking.id}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <div className="font-medium text-sm mb-1">Purpose</div>
                    <p className="text-sm text-muted-foreground">{booking.purpose}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium mb-1">Booked by</div>
                      <p className="text-muted-foreground">{booking.studentName}</p>
                    </div>
                    <div>
                      <div className="font-medium mb-1">Contact</div>
                      <div className="space-y-1 text-muted-foreground">
                        <p>{booking.studentEmail}</p>
                        <p>{booking.studentPhone}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="text-xs text-muted-foreground">
                      Booked on {booking.createdAt.toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      {canReportDamage(booking) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onReportDamage?.(booking)}
                          className="flex items-center gap-2"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          Report Damage
                        </Button>
                      )}
                      
                      {canCancel(booking) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              Cancel Booking
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel this booking? This action cannot be undone.
                                <br /><br />
                                <strong>Booking Details:</strong><br />
                                {hostel?.name} - {room?.roomNumber}<br />
                                {formatDate(booking.timeSlot.date)} at {formatTime(booking.timeSlot.startTime, booking.timeSlot.endTime)}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => onCancelBooking?.(booking.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Yes, Cancel Booking
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Booking Guidelines</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-foreground" />
                Cancellation Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>• Free cancellation up to 2 hours before booking</p>
              <p>• No-show penalty may apply</p>
              <p>• Multiple no-shows may restrict future bookings</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-foreground" />
                Damage Reporting
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>• Report damages immediately after use</p>
              <p>• Include photos for faster processing</p>
              <p>• False reports may result in penalties</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-foreground" />
                Usage Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>• Arrive within 15 minutes of start time</p>
              <p>• Clean the room after use</p>
              <p>• Maximum 2 hours per booking</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}