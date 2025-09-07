import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create hostels H1 to H7
  const hostels = []
  for (let i = 1; i <= 7; i++) {
    const hostel = await prisma.hostel.upsert({
      where: { code: `H${i}` },
      update: {},
      create: {
        name: `Old Hostel ${i}`,
        code: `H${i}`,
      },
    })
    hostels.push(hostel)
    console.log(`✅ Created hostel: ${hostel.name} (${hostel.code})`)
  }

  // Create 2 rooms per hostel: 1 INVENTORY (BLOCKED) and 1 STUDY (ACTIVE)
  for (const hostel of hostels) {
    // Create inventory room (blocked)
    const inventoryRoom = await prisma.room.create({
      data: {
        hostelId: hostel.id,
        name: 'Common Room A',
        type: 'INVENTORY',
        status: 'BLOCKED',
        capacity: 20,
        amenities: ['Storage Units', 'Security Lock'],
      },
    })

    // Create study room (active)
    const studyRoom = await prisma.room.create({
      data: {
        hostelId: hostel.id,
        name: 'Common Room B',
        type: 'STUDY',
        status: 'ACTIVE',
        capacity: 25,
        amenities: ['Whiteboard', 'Projector', 'WiFi', 'AC', 'Tables', 'Chairs'],
        qrTag: `QR-${hostel.code}-STUDY-${randomUUID().substring(0, 8)}`,
      },
    })

    console.log(`✅ Created rooms for ${hostel.name}:`)
    console.log(`   📦 ${inventoryRoom.name} (INVENTORY/BLOCKED)`)
    console.log(`   📚 ${studyRoom.name} (STUDY/ACTIVE) - QR: ${studyRoom.qrTag}`)
  }

  // Create a sample user for testing
  const sampleUser = await prisma.user.upsert({
    where: { email: 'student@hostel.edu' },
    update: {},
    create: {
      id: 'temp-user', // Fixed ID for testing
      email: 'student@hostel.edu',
      name: 'Test Student',
      role: 'STUDENT',
      phone: '+91 9876543210',
      dept: 'Computer Science',
      year: 3,
    },
  })

  console.log(`✅ Created sample user: ${sampleUser.name} (${sampleUser.email})`)

  // Create sample warden
  const warden = await prisma.user.upsert({
    where: { email: 'warden@hostel.edu' },
    update: {},
    create: {
      email: 'warden@hostel.edu',
      name: 'Hostel Warden',
      role: 'WARDEN',
      phone: '+91 9876543211',
    },
  })

  console.log(`✅ Created warden: ${warden.name}`)

  // Create some sample bookings for testing
  const studyRooms = await prisma.room.findMany({
    where: {
      type: 'STUDY',
      status: 'ACTIVE',
    },
    take: 3,
  })

  if (studyRooms.length > 0) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(14, 0, 0, 0) // 2 PM tomorrow

    const booking1 = await prisma.booking.create({
      data: {
        roomId: studyRooms[0].id,
        userId: sampleUser.id,
        startTime: tomorrow,
        endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000), // 2 hours
        status: 'CONFIRMED',
        purpose: 'Group study session for upcoming examinations',
        partySize: 4,
      },
    })

    // Create fairness snapshot
    await prisma.bookingFairnessSnapshot.create({
      data: {
        bookingId: booking1.id,
        userId: sampleUser.id,
        dailyCount: 1,
        weeklyCount: 2,
        penaltyScore: 0,
      },
    })

    console.log(`✅ Created sample booking for room ${studyRooms[0].name}`)
  }

  console.log('🎉 Database seed completed successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })