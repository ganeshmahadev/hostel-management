export interface Hostel {
  id: number;
  name: string;
  totalRooms: number;
}

export interface Room {
  id: string;
  hostelId: number;
  roomNumber: string;
  type: 'CNC_INVENTORY' | 'GROUP_STUDY';
  isActive: boolean;
  capacity: number;
}

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  date: string;
}

export interface Booking {
  id: string;
  roomId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  timeSlot: TimeSlot;
  purpose: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

export interface DamageReport {
  id: string;
  bookingId: string;
  roomId: string;
  reportedBy: string;
  damageDescription: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  photos?: string[];
  status: 'REPORTED' | 'UNDER_REVIEW' | 'RESOLVED';
  estimatedCost?: number;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface RoomAvailability {
  roomId: string;
  room: Room;
  availableSlots: TimeSlot[];
  bookedSlots: Booking[];
}