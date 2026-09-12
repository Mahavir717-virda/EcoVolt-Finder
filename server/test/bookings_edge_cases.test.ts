import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/client';

const app = createApp();

describe('Booking & Availability Engine Edge Cases Test Suite', () => {
  const user1Email = `driver_edge1_${Date.now()}@ecovolt.in`;
  const user2Email = `driver_edge2_${Date.now()}@ecovolt.in`;
  const password = 'SecurePassword123!';

  let token1: string;
  let token2: string;
  let user1Id: string;
  let user2Id: string;
  let vehicle1Id: string;
  let vehicle2Id: string;
  let testStationId: string;
  let maintenancePlugStationId: string;

  beforeAll(async () => {
    // 1. Create User 1 & Vehicle 1
    const res1 = await request(app).post('/auth/signup').send({
      email: user1Email,
      password,
      name: 'Edge Driver 1',
      role: 'driver',
    });
    token1 = res1.body.accessToken;
    user1Id = res1.body.user.id;

    const veh1Res = await request(app)
      .post('/vehicles')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        vehicleClass: 'car',
        model: 'Tata Nexon EV Max',
        batteryKwh: 40.5,
      });
    vehicle1Id = veh1Res.body.id;

    // 2. Create User 2 & Vehicle 2
    const res2 = await request(app).post('/auth/signup').send({
      email: user2Email,
      password,
      name: 'Edge Driver 2',
      role: 'driver',
    });
    token2 = res2.body.accessToken;
    user2Id = res2.body.user.id;

    const veh2Res = await request(app)
      .post('/vehicles')
      .set('Authorization', `Bearer ${token2}`)
      .send({
        vehicleClass: 'car',
        model: 'Hyundai Ioniq 5',
        batteryKwh: 72.6,
      });
    vehicle2Id = veh2Res.body.id;

    const operator = await prisma.operator.findFirst();

    // 3. Create Multi-Connector Test Station (1x CCS2, 1x CHAdeMO)
    const st1 = await prisma.station.create({
      data: {
        operatorId: operator!.id,
        zoneId: 'IN-WE',
        name: 'Multi-Connector Edge Station',
        address: 'SG Highway, Ahmedabad',
        lat: 23.08,
        lng: 72.51,
        provider: 'torrent_power',
        connectors: {
          create: [
            {
              type: 'ccs2',
              powerKw: 60.0,
              totalCount: 1,
              availableCount: 1,
              status: 'available',
            },
            {
              type: 'chademo',
              powerKw: 50.0,
              totalCount: 1,
              availableCount: 1,
              status: 'available',
            },
          ],
        },
      },
    });
    testStationId = st1.id;

    // 4. Create Station with a Maintenance Connector
    const st2 = await prisma.station.create({
      data: {
        operatorId: operator!.id,
        zoneId: 'IN-WE',
        name: 'Maintenance Plug Station',
        address: 'Navrangpura, Ahmedabad',
        lat: 23.04,
        lng: 72.56,
        provider: 'torrent_power',
        connectors: {
          create: [
            {
              type: 'ccs2',
              powerKw: 50.0,
              totalCount: 2,
              availableCount: 0,
              status: 'maintenance',
            },
          ],
        },
      },
    });
    maintenancePlugStationId = st2.id;
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({
      where: { stationId: { in: [testStationId, maintenancePlugStationId] } },
    });
    await prisma.connector.deleteMany({
      where: { stationId: { in: [testStationId, maintenancePlugStationId] } },
    });
    await prisma.station.deleteMany({
      where: { id: { in: [testStationId, maintenancePlugStationId] } },
    });
    await prisma.vehicle.deleteMany({
      where: { id: { in: [vehicle1Id, vehicle2Id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [user1Id, user2Id] } },
    });
    await prisma.$disconnect();
  });

  it('1. Rejects booking with start time in the past', async () => {
    const pastStart = new Date(Date.now() - 3600 * 1000 * 2).toISOString();
    const pastEnd = new Date(Date.now() - 3600 * 1000 * 1).toISOString();

    const res = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        stationId: testStationId,
        connectorType: 'ccs2',
        vehicleId: vehicle1Id,
        windowStart: pastStart,
        windowEnd: pastEnd,
      });

    expect(res.status).toBe(422); // Zod validation failure for past dates
  });

  it('2. Rejects booking with horizon > 30 days', async () => {
    const farFutureStart = new Date(Date.now() + 3600 * 1000 * 24 * 35).toISOString();
    const farFutureEnd = new Date(Date.now() + 3600 * 1000 * 24 * 35 + 3600 * 1000).toISOString();

    const res = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        stationId: testStationId,
        connectorType: 'ccs2',
        vehicleId: vehicle1Id,
        windowStart: farFutureStart,
        windowEnd: farFutureEnd,
      });

    expect(res.status).toBe(422);
  });

  it('3. Successfully books an available slot and returns full relations', async () => {
    const start = new Date(Date.now() + 3600 * 1000 * 5).toISOString();
    const end = new Date(Date.now() + 3600 * 1000 * 6).toISOString();

    const res = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        stationId: testStationId,
        connectorType: 'ccs2',
        vehicleId: vehicle1Id,
        windowStart: start,
        windowEnd: end,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.station).toBeDefined();
    expect(res.body.station.name).toBe('Multi-Connector Edge Station');
    expect(res.body.vehicle).toBeDefined();
    expect(res.body.connector).toBeDefined();
  });

  it('4. Rejects same-user overlapping booking (Conflict 409)', async () => {
    // User 1 tries to book overlapping window (5:30 to 6:30) while having booking from 5:00 to 6:00
    const overlapStart = new Date(Date.now() + 3600 * 1000 * 5.5).toISOString();
    const overlapEnd = new Date(Date.now() + 3600 * 1000 * 6.5).toISOString();

    const res = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        stationId: testStationId,
        connectorType: 'chademo', // Even on another connector
        vehicleId: vehicle1Id,
        windowStart: overlapStart,
        windowEnd: overlapEnd,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/already have an active reservation/i);
  });

  it('5. Allows back-to-back contiguous bookings on the same plug without conflict', async () => {
    // User 1 has 5:00 to 6:00. User 2 books exactly 12:00 to 13:00 on day +2
    const contiguousStart = new Date(Date.now() + 3600 * 1000 * 24 * 2).toISOString();
    const contiguousEnd = new Date(Date.now() + 3600 * 1000 * (24 * 2 + 1)).toISOString();

    const res = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${token2}`)
      .send({
        stationId: testStationId,
        connectorType: 'ccs2',
        vehicleId: vehicle2Id,
        windowStart: contiguousStart,
        windowEnd: contiguousEnd,
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('reserved');
  });

  it('6. Multi-connector independence: User 2 can book CHAdeMO during User 1 CCS2 window (off-peak solar hours)', async () => {
    // Pick an off-peak time (e.g. 10:00 AM IST)
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setUTCHours(6, 0, 0, 0); // 11:30 AM IST (solar off-peak)
    const multiConnStart = d.toISOString();
    const multiConnEnd = new Date(d.getTime() + 3600 * 1000).toISOString();

    // First, User 1 books CCS2 for this window
    await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        stationId: testStationId,
        connectorType: 'ccs2',
        vehicleId: vehicle1Id,
        windowStart: multiConnStart,
        windowEnd: multiConnEnd,
      });

    // User 2 books CHAdeMO for the exact same window at same station
    const res = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${token2}`)
      .send({
        stationId: testStationId,
        connectorType: 'chademo',
        vehicleId: vehicle2Id,
        windowStart: multiConnStart,
        windowEnd: multiConnEnd,
      });

    expect(res.status).toBe(201);
    expect(res.body.connectorType).toBe('chademo');
  });

  it('7. Rejects booking on a connector under maintenance (409 Conflict)', async () => {
    const start = new Date(Date.now() + 3600 * 1000 * 24 * 4).toISOString();
    const end = new Date(Date.now() + 3600 * 1000 * (24 * 4 + 1)).toISOString();

    const res = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        stationId: maintenancePlugStationId,
        connectorType: 'ccs2',
        vehicleId: vehicle1Id,
        windowStart: start,
        windowEnd: end,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/maintenance/i);
  });

  it('8. Slot matrix correctly reflects maintenance status and 0 availableCount', async () => {
    const res = await request(app)
      .get(`/bookings/station/${maintenancePlugStationId}/slots`)
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.totalFree).toBe(0);
    expect(res.body.connectors[0].status).toBe('maintenance');
    expect(res.body.connectors[0].availableCount).toBe(0);
  });
});
