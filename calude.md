# 🎯 Problem & Goals

Seven “old hostels” (1–7). Each hostel has two common rooms; today one room is used by CNC inventory (blocked), the other is used by students for group study.

**Pain points**

* No visibility into room availability.
* No accountability when damage occurs.

**Rules**

* A room can be allocated for **up to 2 hours per sitting**.

**Goals**

1. Real‑time visibility of availability.
2. Fair, low‑friction booking that enforces rules.
3. Strong accountability: identity, check‑in/out, audit trail, damage reporting.

---

# 🏗️ High-Level Architecture (Next.js App Router)

**Frontend/SSR**: Next.js (App Router), Tailwind CSS, shadcn/ui, TanStack Table.

**APIs**: Next.js Route Handlers (`app/api/*`) + Server Actions for trusted mutations.

**Database**: PostgreSQL (Prisma ORM).

**Cache & Locks**: Redis (availability cache, rate limits, distributed locks to prevent double bookings).

**Real-time**: WebSockets (Pusher, Ably, or Socket.IO) to broadcast slot/booking updates.

**Auth**: Clerk

**Notifications**: Email (Resend) + Push (PWA) + In‑app toasts.

**Observability**: OpenTelemetry + Log drain (Datadog/ELK), Sentry for errors.

**Infra**: deploy on Vercel 

**Time & TZ**: IST default
---

# 📚 Domain Model (Prisma)

```prisma
model Hostel {
  id        Int      @id @default(autoincrement())
  name      String   // "Old Hostel 1".."7"
  code      String   @unique // "H1".."H7"
  rooms     Room[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Room {
  id           Int       @id @default(autoincrement())
  hostelId     Int
  name         String    // e.g., "Common Room A"
  type         RoomType  // STUDY | INVENTORY | OTHER
  status       RoomStatus @default(ACTIVE) // ACTIVE | BLOCKED | MAINTENANCE
  capacity     Int        @default(12)
  amenities    String[]   // ["Whiteboard", "Projector"]
  bookings     Booking[]
  qrTag        String?    @unique // for check-in/out scanning
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  hostel Hostel @relation(fields: [hostelId], references: [id])
  @@index([hostelId])
}

enum RoomType { STUDY INVENTORY OTHER }
enum RoomStatus { ACTIVE BLOCKED MAINTENANCE }

enum BookingStatus { PENDING CONFIRMED CHECKED_IN COMPLETED NO_SHOW CANCELLED }

enum DamageStatus { REPORTED UNDER_REVIEW CONFIRMED DISMISSED SETTLED }

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  name        String
  role        Role     @default(STUDENT)
  phone       String?
  dept        String?
  year        Int?
  bannedUntil DateTime?
  lastUsedAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

enum Role { STUDENT WARDEN ADMIN }

model Booking {
  id              String        @id @default(cuid())
  roomId          Int
  userId          String
  startTime       DateTime
  endTime         DateTime
  status          BookingStatus @default(PENDING)
  partySize       Int           @default(1)
  purpose         String?
  checkInAt       DateTime?
  checkOutAt      DateTime?
  fairnessScoreAt BookingFairnessSnapshot?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  room Room @relation(fields: [roomId], references: [id])
  user User @relation(fields: [userId], references: [id])

  @@index([roomId, startTime])
  @@index([userId, startTime])
  @@unique([roomId, startTime, endTime]) // optimistic guard
}

model BookingFairnessSnapshot {
  id           String   @id @default(cuid())
  bookingId    String   @unique
  userId       String
  dailyCount   Int      // bookings today by user
  weeklyCount  Int
  lastUseAt    DateTime?
  penaltyScore Int      // for no-shows/damages
}

model DamageReport {
  id          String       @id @default(cuid())
  bookingId   String
  roomId      Int
  reporterId  String       // student or warden
  description String
  photos      String[]     // S3 keys
  status      DamageStatus @default(REPORTED)
  assessedBy  String?
  assessedAt  DateTime?
  penalty     Int?         // in campus currency or amount
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  booking Booking @relation(fields: [bookingId], references: [id])
  room    Room    @relation(fields: [roomId], references: [id])
}

model AuditLog {
  id        String   @id @default(cuid())
  actorId   String?
  action    String   // BOOK_CREATE, BOOK_CANCEL, CHECK_IN, CHECK_OUT, DAMAGE_REPORT, etc.
  target    String?  // bookingId/roomId
  meta      Json?
  createdAt DateTime @default(now())
}

model RateLimit {
  id        String   @id @default(cuid())
  userId    String
  key       String
  window    String   // e.g. "DAILY"
  count     Int      @default(0)
  resetAt   DateTime
  @@index([userId, key])
}
```

**Seed**: Create Hostels `H1..H7` with 2 rooms each; mark one room per hostel as `INVENTORY` + `BLOCKED`, the other as `STUDY` + `ACTIVE`.

---

# 🔁 Booking Rules & Fairness

**Core constraints**

* Max **2 hours** per booking; 15‑min granularity.
* Hard clash prevention: unique constraint on `(roomId, startTime, endTime)`.
* Same‑day per‑user cap (configurable, e.g., **2 bookings/day** and **6 hours/week**).
* 10‑minute grace for **check‑in** via QR; no‑show auto-cancels and increments penalty.
* **Cooldown**: after completing a booking, a user enters a short cooldown (e.g., 1 hour) before booking the same room again.

**Fairness score** (used for waitlist resolution & tie‑breaks):

* `score = base - dailyCount*W1 - weeklyCount*W2 - penalty*W3 + timeSinceLastUse*W4` (weights configurable).
* Waitlisted requests are ordered by score; when a booking is cancelled/no‑show, the top candidate is auto‑promoted.

**Race conditions**

* Use Redis **mutex** (`SET NX PX`) on `lock:room:{id}:{timeslot}` for 5–10s while validating & inserting.
* Double‑check availability with a **serializable** transaction when committing.

---

# ✅ Accountability & Check‑in/out Flow

1. **Booking** → status `CONFIRMED`.
2. **Check‑in** (within 10 min of start):

   * Scan **Room QR** (room.qrTag → resolves to deep link `/rooms/[id]/checkin?booking=`),
   * Server verifies booking ownership + time window + QR matches.
   * Optional: quick **pre‑use photo** (damage evidence); stored to S3.
   * Status → `CHECKED_IN`, `checkInAt` set.
3. **Check‑out** (at or before end time):

   * Prompt **post‑use photos** + damage note (if any).
   * Status → `COMPLETED`, `checkOutAt` set.
4. **No‑show**: 10‑minute grace passes → auto `CANCELLED`, penalty++.
5. **Damage Reporting**:

   * Any user or Warden can open **DamageReport** against a booking/room.
   * Warden/Admin triage → set status + penalty.
   * All actions logged in **AuditLog**; user notified.

---

# 🔌 API Surface (Route Handlers)

**Auth**

* `POST /api/auth/callback` (NextAuth providers)

**Hostels/Rooms**

* `GET /api/hostels` → list hostels with aggregated live availability.
* `GET /api/rooms?hostel=H1&date=2025-09-07` → availability grid (15‑min slots).
* `GET /api/rooms/:id` → room detail, amenities, upcoming bookings.

**Bookings**

* `POST /api/bookings` → `{ roomId, startTime, endTime, purpose, partySize }`
* `GET /api/bookings?me=1&range=today|week` → user bookings.
* `POST /api/bookings/:id/cancel`
* `POST /api/bookings/:id/checkin` → `{ qrTag, photos? }`
* `POST /api/bookings/:id/checkout` → `{ photos?, notes? }`
* `POST /api/bookings/:id/waitlist` → joins waitlist if slot taken.

**Damage**

* `POST /api/damages` → `{ bookingId, roomId, description, photos[] }`
* `GET /api/damages?status=`
* `POST /api/damages/:id/resolve` (warden/admin)

**Admin**

* `POST /api/rooms/:id/block` / `unblock` / `maintenance`
* `POST /api/users/:id/ban` / `unban`
* `GET /api/reports/usage?from=&to=` (aggregations)

All mutations use **Server Actions** or **route handlers** with Zod validation and RBAC guards.

---

# 🖥️ UI/UX (shadcn/ui + Tailwind)

**Core pages**

* `/` Dashboard

  * **Hostel Cards** (Card, Badge, Progress): now-next availability, active rooms per hostel.
  * **Quick Book** (Dialog + Calendar/DatePicker + TimeRange Slider).
  * **My Bookings** (DataTable with TanStack Table + Badge for status + Actions dropdown).

* `/rooms` Rooms & Availability

  * **Filter Bar** (Combobox for hostel, DatePicker, Switch “only active”).
  * **Availability Grid** (CSS grid, 15‑min columns; each cell = Slot button). Real‑time updates via WS; Slot cells show states: free, reserved‑me, reserved‑others, past.
  * **Booking Drawer** (Sheet) opens when selecting a slot → form (Form, Input, Textarea), shows constraints.

* `/bookings/[id]` Booking Detail

  * Status timeline (Steps), QR section for check‑in, timers, action buttons.

* `/checkin` Check‑in Camera

  * Mobile-first; uses device camera; (Card, Button, Toast). Upload to S3 pre‑signed URL.

* `/admin` Admin Console

  * Tabs: Rooms, Damages, Users, Reports.
  * **Rooms** table (DataTable) with inline status changes (DropdownMenu).
  * **Damages** Kanban (Cards + DnD) or Table with actions; Lightbox for photos.
  * **Reports**: charts (recharts) for utilization, no‑show rate, damage trends.

**shadcn/ui components to integrate**

* Layout: `Card`, `Tabs`, `Separator`, `ScrollArea`, `Accordion`, `Sheet`, `Dialog`, `Drawer`, `Tooltip`, `Toast`, `Badge`, `Avatar`, `DropdownMenu`, `Breadcrumb`.
* Forms: `Form`, `Input`, `Textarea`, `Select`, `RadioGroup`, `Checkbox`, `Switch`, `Calendar`, `Popover`, `Slider`.
* Tables: TanStack Table + shadcn `Table` styling, `Skeleton` for loading states.
* Feedback: `Alert`, `AlertDialog`, `Toaster`.

**Design language**

* Neutral palette, rounded‑2xl cards, subtle shadows, grid layout, large targets for mobile, progressive disclosure in Dialog/Sheet.

---

# 🔒 Security, Integrity & Abuse Controls

* **Auth**: Clerk Auth
* **RBAC** middleware gate per route; server actions validate `role`.
* **CSRF** protection on mutations; cookies `SameSite=Lax`, secure in prod.
* **Rate limits**: Redis sliding window on create/cancel/check‑in.
* **Booking invariants**: server-side validation only; never trust client CAPs.
* **No‑show penalties**: escalate cooldowns, temporary bans; visible in UI.
* **AuditLog** for every critical action; immutable once written.

---

# ⏱️ Availability Engine

**Slotting**: 15‑minute discrete slots; booking spans 4–8 slots (1–2 hours). Precompute daily grids per room and cache in Redis hash `room:{id}:YYYY-MM-DD` with bitset/bitmap for slots.

**Read path**: UI asks `/api/rooms?date=…` → API reads Redis bitmap; if miss, compute from Postgres bookings and backfill cache (TTL = 2–5 min, or listen on `booking:*` stream to invalidate).

**Write path**: acquire lock → validate caps & conflicts → insert booking (serializable tx) → publish WS update + invalidate cache.

**Grace**: background cron (Queue worker) marks `NO_SHOW` at `start+10min` if not checked in; frees slots.

---

# 🔔 Notifications

* **Booking confirmed** (email + push + in‑app toast)
* **Upcoming reminder** (15 min before start)
* **Check‑in window opened** (5 min before)
* **No‑show warning** (at start)
* **Auto-cancel** (10 min after start if absent)
* **Damage report updates**

Use a job queue (BullMQ/Cloud Tasks) for scheduled notifications.

---

# 🧪 Testing Strategy

* **Unit**: booking validation, fairness score, rate limits.
* **Integration**: race tests for concurrent booking on same slot.
* **E2E**: Playwright flows (book → check‑in → check‑out → report damage).
* **Load**: k6/Artillery to validate lock/throughput under peak (e.g., evening rush).

---

# 🚀 Deployment Topology

* Next.js on Vercel (Edge for reads, Node region close to Postgres/Redis for writes).
* Postgres (Neon/Supabase/RDS), Redis (Upstash/Valkey managed).
* Image storage (R2/S3), image proxy (Next Image).
* WebSocket: Pusher hosted (simplest) or a dedicated WS service if self‑hosting.

---

# 📂 Suggested Project Structure (App Router)

```
app/
  layout.tsx
  page.tsx                       // dashboard
  rooms/
    page.tsx
    [id]/page.tsx
  bookings/
    page.tsx
    [id]/page.tsx
  admin/
    page.tsx
    rooms/page.tsx
    damages/page.tsx
    reports/page.tsx
  api/
    hostels/route.ts
    rooms/route.ts
    rooms/[id]/route.ts
    bookings/route.ts
    bookings/[id]/{route.ts,checkin/route.ts,checkout/route.ts,cancel/route.ts}
    damages/route.ts
    damages/[id]/resolve/route.ts

components/
  ui/...(shadcn)
  availability-grid.tsx
  booking-sheet.tsx
  booking-table.tsx
  checkin-qr.tsx
  webcam-capture.tsx
lib/
  auth.ts
  db.ts (prisma)
  redis.ts
  rbac.ts
  availability.ts
  booking.ts
  notifier.ts
  locks.ts
  rate-limit.ts

prisma/
  schema.prisma
```

---

# 🧩 Example: Booking Creation (Server Action)

```ts
'use server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { withRoomLock } from '@/lib/locks'
import { ensureLimits } from '@/lib/booking'
import { revalidateTag } from 'next/cache'

const schema = z.object({
  roomId: z.number(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  purpose: z.string().max(200).optional(),
  partySize: z.number().min(1).max(20).default(1)
})

export async function createBooking(input: z.infer<typeof schema>, userId: string) {
  const data = schema.parse(input)
  return withRoomLock(`${data.roomId}:${data.startTime}:${data.endTime}`, async () => {
    await ensureLimits(userId, data)

    // serializable transaction to avoid phantom overlaps
    const result = await db.$transaction(async (tx) => {
      // conflict check
      const overlap = await tx.booking.findFirst({
        where: {
          roomId: data.roomId,
          NOT: [{ endTime: { lte: new Date(data.startTime) } }],
          startTime: { lt: new Date(data.endTime) }
        },
        select: { id: true }
      })
      if (overlap) throw new Error('Time slot already booked.')

      const booking = await tx.booking.create({
        data: { ...data, userId, status: 'CONFIRMED' }
      })
      return booking
    }, { isolationLevel: 'Serializable' })

    // broadcast + cache invalidation
    revalidateTag(`room-${data.roomId}-day-${new Date(data.startTime).toDateString()}`)
    return result
  })
}
```

---

# 🧭 Availability Grid Rendering (UI Outline)

* `AvailabilityGrid` takes `{ roomId, date }` and renders 96 slots (24\*4) with 15‑min steps.
* Cells show states: `free` (clickable), `mine` (highlight), `busy` (disabled), `past` (muted).
* Hover/press → Tooltip with details; click on `free` → opens `BookingSheet` with prefilled time range (snap to 2h max).

**shadcn/ui** used: `Table` (or div grid), `Button` (as Slot), `Tooltip`, `Sheet`, `Form`, `Select`, `Calendar`, `Toast`, `Skeleton`.

---

# 🧾 Reporting & Analytics

* Utilization per room/hostel/day.
* Peak hours heatmap.
* No‑show rate by user cohort.
* Damage incidents per 100 hours.
* Export CSV.

---

# ⚙️ Configuration Flags (env or admin UI)

* `MAX_BOOKING_HOURS=2`
* `CHECKIN_GRACE_MIN=10`
* `DAILY_BOOKING_CAP=2`
* `WEEKLY_HOURS_CAP=6`
* `COOLDOWN_MIN=60`
* `SLOT_MINUTES=15`
* `TZ=Europe/Stockholm`
* `INVENTORY_ROOMS=[H1:A,H2:A,...]` (seed script sets to BLOCKED)

---

# 🧭 Rollout Plan

1. MVP: visibility grid + booking + check‑in with QR + no‑show auto cancel.
2. Phase 2: fairness scoring + waitlist + penalties UI.
3. Phase 3: damage workflow + admin console + analytics.

---

# ✅ Edge Cases & Safeguards

* Back‑to‑back bookings by same user in same room → enforce cooldown.
* Bookings crossing midnight → disallow (force same‑day) for simplicity.
* Clock drift on devices → server time is source of truth; show countdown.
* User banned/unverified → block booking endpoint with clear error.
* Room flipped to `MAINTENANCE` → auto cancel future bookings, notify.

---

# 📌 Notes for the CNC Inventory Room

* In seed, mark one room/hostel as `type=INVENTORY` and `status=BLOCKED`.
* Hide blocked rooms from student UI; only ADMIN/WARDEN can view/edit.
* If CNC frees a room, admin flips to `STUDY` + `ACTIVE`; system immediately exposes it to students and availability recomputes.

---

# 🧰 Developer Experience

* shadcn/ui installed with CLI; components colocated in `components/ui`.
* Storybook for component dev (AvailabilityGrid, BookingSheet, Checkin camera).
* Zod schemas shared between client & server.
* Strict TypeScript, ESLint, Prettier, Vitest for units, Playwright for E2E.

---

# 📦 Nice-to-haves

* Group ownership: allow leader + members; shared accountability.
* Reputation score visible in profile.
* Kiosk mode screen near rooms (public display of ‘Now/Next’ per hostel).
* ICS export of bookings; Google Calendar sync opt‑in.

---

# 🧩 Minimal UI Sketch (pseudo-TSX)

```tsx
<Card>
  <CardHeader>
    <CardTitle>Rooms — {hostelName}</CardTitle>
    <div className="flex gap-2">
      <HostelCombobox />
      <DatePicker />
      <Switch label="Only active" />
    </div>
  </CardHeader>
  <CardContent>
    <AvailabilityGrid roomId={room.id} date={selectedDate} />
  </CardContent>
</Card>

<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent>
    <Form /* shadcn form */>
      <TimeRangeSlider maxHours={2} stepMinutes={15} />
      <Input name="purpose" placeholder="Purpose" />
      <Button type="submit">Book</Button>
    </Form>
  </SheetContent>
</Sheet>
```

---

# 📣 Summary

This design gives you: fast, fair booking with strict rule enforcement; real‑time availability; QR‑based check‑in/out and photo-backed accountability; an admin workflow for damages; and a clean, professional UI with shadcn/ui and Tailwind. It scales with Redis locks + cached slot bitmaps and remains simple to operate on modern managed infra.
