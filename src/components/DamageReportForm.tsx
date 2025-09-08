'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Upload } from 'lucide-react';
import { Booking } from '@/types';

interface DamageReportFormProps {
  isOpen: boolean;
  onClose: () => void;
  booking?: Booking;
  onDamageReportSubmit?: (report: {
    bookingId: string;
    roomId: string;
    reporterId: string;
    description: string;
    photos: string[];
  }) => void;
}

export default function DamageReportForm({ 
  isOpen, 
  onClose, 
  booking, 
  onDamageReportSubmit 
}: DamageReportFormProps) {
  const [formData, setFormData] = useState({
    damageDescription: '',
    reportedBy: booking?.studentName || '',
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});


  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photos.length > 5) {
      setErrors(prev => ({ ...prev, photos: 'Maximum 5 photos allowed' }));
      return;
    }
    setPhotos(prev => [...prev, ...files]);
    if (errors.photos) {
      setErrors(prev => ({ ...prev, photos: '' }));
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.damageDescription.trim()) {
      newErrors.damageDescription = 'Damage description is required';
    } else if (formData.damageDescription.trim().length < 20) {
      newErrors.damageDescription = 'Please provide a detailed description (minimum 20 characters)';
    }

    if (!formData.reportedBy.trim()) {
      newErrors.reportedBy = 'Reporter name is required';
    }


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !booking) return;

    setIsSubmitting(true);

    try {
      const reportData = {
        bookingId: booking.id,
        roomId: booking.roomId,
        reporterId: booking.studentId, // Use the actual user ID from the booking
        description: formData.damageDescription.trim(),
        photos: photos.map(photo => URL.createObjectURL(photo)), // In production, upload to S3
      };

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onDamageReportSubmit?.(reportData);
      
      setFormData({
        damageDescription: '',
        reportedBy: booking?.studentName || '',
      });
      setPhotos([]);
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Damage report submission error:', error);
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


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-foreground" />
            Report Damage
          </DialogTitle>
          <DialogDescription>
            Report any damages found in the room. This helps us maintain the facilities and ensures accountability.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="reportedBy">Reporter Name</Label>
            <Input
              id="reportedBy"
              placeholder="Your name"
              value={formData.reportedBy}
              onChange={(e) => handleInputChange('reportedBy', e.target.value)}
              className={errors.reportedBy ? 'border-destructive' : ''}
            />
            {errors.reportedBy && (
              <p className="text-sm text-destructive">{errors.reportedBy}</p>
            )}
          </div>


          <div className="space-y-2">
            <Label htmlFor="damageDescription">Damage Description</Label>
            <Textarea
              id="damageDescription"
              placeholder="Provide a detailed description of the damage (what happened, where it is located, when it was noticed, etc.)"
              value={formData.damageDescription}
              onChange={(e) => handleInputChange('damageDescription', e.target.value)}
              className={errors.damageDescription ? 'border-destructive' : ''}
              rows={4}
            />
            {errors.damageDescription && (
              <p className="text-sm text-destructive">{errors.damageDescription}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.damageDescription.length}/500 characters (minimum 20 required)
            </p>
          </div>


          <div className="space-y-3">
            <Label>Photos (Optional)</Label>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                />
                <Label 
                  htmlFor="photo-upload"
                  className="flex items-center gap-2 px-4 py-2 border border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Upload Photos
                </Label>
                <span className="text-sm text-muted-foreground">
                  Max 5 photos, 5MB each
                </span>
              </div>
              
              {photos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <Image
                        src={URL.createObjectURL(photo)}
                        alt={`Damage photo ${index + 1}`}
                        width={200}
                        height={96}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removePhoto(index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {errors.photos && (
                <p className="text-sm text-destructive">{errors.photos}</p>
              )}
            </div>
          </div>

          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-foreground mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Important Note</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Report damages immediately to avoid responsibility issues</li>
                  <li>• Include photos whenever possible for faster processing</li>
                  <li>• False reporting may result in booking restrictions</li>
                  <li>• You will receive updates on the repair status via email</li>
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
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}