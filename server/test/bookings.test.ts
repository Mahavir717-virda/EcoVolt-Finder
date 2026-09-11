import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/client';

const app = createApp();

describe('M2-C7 Booking & Scheduling Engine Acceptance Tests', () => {
  const userAEmail = `driver_bk_a_${Date.now()}@ecovolt.in`;
  const userBEmail = `driver_bk_b_${Date.now()}@ecovolt.in`;
  const password = 'SecurePassword123!';

  let tokenA: string;
  let tokenB: string;
  let vehicleAId: string;
  let vehicleBId: string;
  let singlePlugStationId: string;
  let testBookingId: string;

  beforeAll(async () => {
    // 1. Create User A & Vehicle A
    const resA = await request(app).post('/auth/signup').send({
      email: userAEmail,
      password,
      name: 'Booking Driver A',
      role: 'driver',
    });
    tokenA = resA.body.accessToken;

    const vehARes = await request(app)
      .post('/vehicles')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        vehicleClass: 'car',
        model: 'Nexon EV',
      });
    vehicleAId = vehARes.body.id;

    // 2. Create User B & Vehicle B
    const resB = await request(app).post('/auth/signup').send({
      email: userBEmail,
      password,
      name: 'Booking Driver B',
      role: 'driver',
    });
    tokenB = resB.body.accessToken;

    const vehBRes = await request(app)
      .post('/vehicles')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        vehicleClass: 'car',
        model: 'MG ZS EV',
      });
    vehicleBId = vehBRes.body.id;

    // 3. Create a dedicated test station with EXACTLY 1 single CCS2 plug to test race condition
    const station = await prisma.station.create({
      data: {
        operatorId: (await prisma.operator.findFirst())!.id,
        zoneId: 'IN-WE',
        name: 'Single-Plug Concurrency Test Station',
        address: 'Test Hub, Ahmedabad',
        lat: 23.05,
        lng: 72.55,
        provider: 'torrent_power',
        connectors: {
          create: [
            {
              type: 'ccs2',
              powerKw: 50.0,
              totalCount: 1, // EXACTLY 1 PLUG
              availableCount: 1,
            },
          ],
        },
      },
    });
    singlePlugStationId = station.id;
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({
      where: { stationId: singlePlugStationId },
    });
    await prisma.connector.deleteMany({
      where: { stationId: singlePlugStationId },
    });
    await prisma.station.deleteMany({
      where: { id: singlePlugStationId },
    });
    await prisma.vehicle.deleteMany({
      where: { id: { in: [vehicleAId, vehicleBId] } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [userAEmail, userBEmail] } },
    });
    await prisma.$disconnect();
  });

  it('1. POST /bookings - creates a booking with locked price snapshot', async () => {
    const windowStart = new Date(Date.now() + 3600 * 1000 * 2).toISOString();
    const windowEnd = new Date(Date.now() + 3600 * 1000 * 3).toISOString();

    const res = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        stationId: singlePlugStationId,
        connectorType: 'ccs2',
        vehicleId: vehicleAId,
        windowStart,
        windowEnd,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('reserved');
    expect(res.body.lockedPrice).toBeDefined();
    expect(res.body.lockedPrice.baseTariff).toBe(13.5);
    expect(res.body.lockedPrice.finalPrice).toBeDefined();

    testBookingId = res.body.id;
  });

  it('2. Anti-Double-Booking Concurrency Test (Edge Case #15) - Simultaneous parallel booking on same window yields 1 success + 1 409 conflict', async () => {
    const slotStart = new Date(Date.now() + 3600 * 1000 * 10).toISOString();
    const slotEnd = new Date(Date.now() + 3600 * 1000 * 11).toISOString();

    // Fire two simultaneous requests in parallel via Promise.all
    const [reqA, reqB] = await Promise.all([
      request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          stationId: singlePlugStationId,
          connectorType: 'ccs2',
          vehicleId: vehicleAId,
          windowStart: slotStart,
          windowEnd: slotEnd,
        }),
      request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          stationId: singlePlugStationId,
          connectorType: 'ccs2',
          vehicleId: vehicleBId,
          windowStart: slotStart,
          windowEnd: slotEnd,
        }),
    ]);

    const statuses = [reqA.status, reqB.status].sort();
    // Exactly one must succeed (201) and exactly one must fail with conflict (409)
    expect(statuses).toEqual([201, 409]);
  });

  it('3. GET /bookings - lists user bookings', async () => {
    const res = await request(app)
      .get('/bookings')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].station).toBeDefined();
  });

  it('4. PATCH /bookings/:id/cancel - cancels booking and releases slot (Edge Case #23)', async () => {
    const res = await request(app)
      .patch(`/bookings/${testBookingId}/cancel`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.refunded).toBe(true);
    expect(res.body.booking.status).toBe('cancelled');
  });
});
