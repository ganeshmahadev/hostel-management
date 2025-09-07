import { Hostel, Room, Booking, TimeSlot } from '@/types';

export const hostels: Hostel[] = [
  { id: 1, name: 'Hostel 1', totalRooms: 2 },
  { id: 2, name: 'Hostel 2', totalRooms: 2 },
  { id: 3, name: 'Hostel 3', totalRooms: 2 },
  { id: 4, name: 'Hostel 4', totalRooms: 2 },
  { id: 5, name: 'Hostel 5', totalRooms: 2 },
  { id: 6, name: 'Hostel 6', totalRooms: 2 },
  { id: 7, name: 'Hostel 7', totalRooms: 2 },
];

export const rooms: Room[] = hostels.flatMap(hostel => [
  {
    id: `${hostel.id}-cnc`,
    hostelId: hostel.id,
    roomNumber: 'Common Room 1',
    type: 'CNC_INVENTORY' as const,
    isActive: false,
    capacity: 20,
  },
  {
    id: `${hostel.id}-study`,
    hostelId: hostel.id,
    roomNumber: 'Common Room 2',
    type: 'GROUP_STUDY' as const,
    isActive: true,
    capacity: 25,
  },
]);

export const generateTimeSlots = (date: string): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let hour = 8; hour < 22; hour += 2) {
    const startHour = hour.toString().padStart(2, '0');
    const endHour = (hour + 2).toString().padStart(2, '0');
    slots.push({
      id: `${date}-${startHour}`,
      startTime: `${startHour}:00`,
      endTime: `${endHour}:00`,
      date,
    });
  }
  return slots;
};

export const mockBookings: Booking[] = [
  {
    id: '1',
    roomId: '1-study',
    studentId: 'ST001',
    studentName: 'John Doe',
    studentEmail: 'john.doe@example.com',
    studentPhone: '+91 9876543210',
    timeSlot: {
      id: '2025-01-08-14',
      startTime: '14:00',
      endTime: '16:00',
      date: '2025-01-08',
    },
    purpose: 'Group project discussion for Computer Science assignment',
    status: 'CONFIRMED',
    createdAt: new Date('2025-01-07T10:30:00'),
    updatedAt: new Date('2025-01-07T10:30:00'),
  },
  {
    id: '2',
    roomId: '2-study',
    studentId: 'ST002',
    studentName: 'Alice Smith',
    studentEmail: 'alice.smith@example.com',
    studentPhone: '+91 9876543211',
    timeSlot: {
      id: '2025-01-08-16',
      startTime: '16:00',
      endTime: '18:00',
      date: '2025-01-08',
    },
    purpose: 'Study session for upcoming Mathematics exam',
    status: 'CONFIRMED',
    createdAt: new Date('2025-01-07T11:00:00'),
    updatedAt: new Date('2025-01-07T11:00:00'),
  },
];