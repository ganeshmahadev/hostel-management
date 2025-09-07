'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, AlertTriangle } from 'lucide-react';
import { TimeSlot, Booking } from '@/types';
import { rooms, hostels } from '@/data/mockData';

interface BookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
  timeSlot?: TimeSlot;
  onBookingSubmit?: (booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export default function BookingForm({ isOpen, onClose, roomId, timeSlot, onBookingSubmit }: BookingFormProps) {
  const [formData, setFormData] = useState({
    studentName: '',
    studentEmail: '',
    studentPhone: '',
    purpose: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const room = rooms.find(r => r.id === roomId);
  const hostel = hostels.find(h => h.id === room?.hostelId);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.studentName.trim()) {
      newErrors.studentName = 'Name is required';
    }

    if (!formData.studentEmail.trim()) {
      newErrors.studentEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.studentEmail)) {
      newErrors.studentEmail = 'Please enter a valid email address';
    }

    if (!formData.studentPhone.trim()) {
      newErrors.studentPhone = 'Phone number is required';
    } else if (!/^\+91\s\d{10}$|^\d{10}$/.test(formData.studentPhone.replace(/\s/g, ''))) {
      newErrors.studentPhone = 'Please enter a valid phone number';
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Purpose of booking is required';
    } else if (formData.purpose.trim().length < 10) {
      newErrors.purpose = 'Please provide a detailed purpose (minimum 10 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !room || !timeSlot) return;

    setIsSubmitting(true);

    try {
      const bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
        roomId: room.id,
        studentId: 'ST' + Date.now().toString().slice(-6),
        studentName: formData.studentName.trim(),
        studentEmail: formData.studentEmail.trim(),
        studentPhone: formData.studentPhone.trim(),
        timeSlot: timeSlot,
        purpose: formData.purpose.trim(),
        status: 'PENDING',
      };

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onBookingSubmit?.(bookingData);
      
      setFormData({
        studentName: '',
        studentEmail: '',
        studentPhone: '',
        purpose: '',
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Booking submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Study Room</DialogTitle>
          <DialogDescription>
            Complete the form below to book your study session. All fields are required.
          </DialogDescription>
        </DialogHeader>

        {room && timeSlot && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{hostel?.name}</span>
              </div>
              <Badge variant="outline">{room.roomNumber}</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(timeSlot.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{timeSlot.startTime} - {timeSlot.endTime}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Capacity: {room.capacity} students</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="studentName">Full Name</Label>
            <Input
              id="studentName"
              placeholder="Enter your full name"
              value={formData.studentName}
              onChange={(e) => handleInputChange('studentName', e.target.value)}
              className={errors.studentName ? 'border-destructive' : ''}
            />
            {errors.studentName && (
              <p className="text-sm text-destructive">{errors.studentName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="studentEmail">Email Address</Label>
            <Input
              id="studentEmail"
              type="email"
              placeholder="your.email@example.com"
              value={formData.studentEmail}
              onChange={(e) => handleInputChange('studentEmail', e.target.value)}
              className={errors.studentEmail ? 'border-destructive' : ''}
            />
            {errors.studentEmail && (
              <p className="text-sm text-destructive">{errors.studentEmail}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="studentPhone">Phone Number</Label>
            <Input
              id="studentPhone"
              type="tel"
              placeholder="+91 9876543210"
              value={formData.studentPhone}
              onChange={(e) => handleInputChange('studentPhone', e.target.value)}
              className={errors.studentPhone ? 'border-destructive' : ''}
            />
            {errors.studentPhone && (
              <p className="text-sm text-destructive">{errors.studentPhone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose of Booking</Label>
            <Textarea
              id="purpose"
              placeholder="Describe the purpose of your booking (e.g., group study for mathematics exam, project discussion, etc.)"
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

          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-foreground mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Important Guidelines</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Maximum booking duration: 2 hours</li>
                  <li>• Report any damages immediately</li>
                  <li>• Clean the room after use</li>
                  <li>• Arrive on time - rooms may be reassigned after 15 minutes</li>
                </ul>
              </div>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Booking...' : 'Confirm Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}