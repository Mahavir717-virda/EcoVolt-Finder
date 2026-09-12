import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/client';

const app = createApp();

describe('Booking Persistent Port Identity & Slot Matrix Integration Tests', () => {
  let stationId: string;
  let connectorId: string;
  let tokenA: string;
  let tokenB: string;
  let tokenC: string;
  let userAId: string;
  let userBId: string;
  let userCId: string;
  let vehicleAId: string;
  let vehicleBId: string;
  let vehicleCId: string;

  const emailA = `port-driver-a-${Date.now()}@ecovolt.test`;
  const emailB = `port-driver-b-${Date.now()}@ecovolt.test`;
  const emailC = `port-driver-c-${Date.now()}@ecovolt.test`;

  beforeAll(async () => {
    // 1. Create 3 test users
    const [userA, userB, userC] = await Promise.all([
      prisma.user.create({
        data: {
          email: emailA,
          name: 'Port Tester A',
          passwordHash: 'dummyhash',
          role: 'driver',
        },
      }),
      prisma.user.create({
        data: {
          email: emailB,
          name: 'Port Tester B',
          passwordHash: 'dummyhash',
          role: 'driver',
        },
      }),
      prisma.user.create({
        data: {
          email: emailC,
          name: 'Port Tester C',
          passwordHash: 'dummyhash',
          role: 'driver',
        },
      }),
    ]);

    userAId = userA.id;
    userBId = userB.id;
    userCId = userCId = userC.id;

    // 2. Create vehicles
    const [vehA, vehB, vehC] = await Promise.all([
      prisma.vehicle.create({
        data: {
          userId: userAId,
          vehicleClass: 'car',
          model: 'Tesla Model 3',
          batteryKwh: 60,
          efficiencyWhKm: 150,
          connectors: ['ccs2'],
        },
      }),
      prisma.vehicle.create({
        data: {
          userId: userBId,
          vehicleClass: 'car',
          model: 'Hyundai Ioniq 5',
          batteryKwh: 72.6,
          efficiencyWhKm: 170,
          connectors: ['ccs2'],
        },
      }),
      prisma.vehicle.create({
        data: {
          userId: userCId,
          vehicleClass: 'car',
          model: 'Kia EV6',
          batteryKwh: 77.4,
          efficiencyWhKm: 180,
          connectors: ['ccs2'],
        },
      }),
    ]);

    vehicleAId = vehA.id;
    vehicleBId = vehB.id;
    vehicleCId = vehC.id;

    // 3. Obtain auth tokens
    const [authA, authB, authC] = await Promise.all([
      request(app).post('/auth/signup').send({
        email: `auth-${emailA}`,
        password: 'Password123!',
        name: 'Auth User A',
      }),
      request(app).post('/auth/signup').send({
        email: `auth-${emailB}`,
        password: 'Password123!',
        name: 'Auth User B',
      }),
      request(app).post('/auth/signup').send({
        email: `auth-${emailC}`,
        password: 'Password123!',
        name: 'Auth User C',
      }),
    ]);

    tokenA = authA.body.accessToken;
    tokenB = authB.body.accessToken;
    tokenC = authC.body.accessToken;

    // Attach vehicles to auth users so bookings validation succeeds
    await prisma.vehicle.update({ where: { id: vehicleAId }, data: { userId: authA.body.user.id } });
    await prisma.vehicle.update({ where: { id: vehicleBId }, data: { userId: authB.body.user.id } });
    await prisma.vehicle.update({ where: { id: vehicleCId }, data: { userId: authC.body.user.id } });
    userAId = authA.body.user.id;
    userBId = authB.body.user.id;
    userCId = authC.body.user.id;

    // 4. Ensure GridZone and Station Operator exist
    const zone = await prisma.gridZone.upsert({
      where: { id: 'IN-WE' },
      update: {},
      create: { id: 'IN-WE', name: 'Western Region', state: 'Gujarat' },
    });

    const operator = await prisma.operator.create({
      data: {
        name: 'Port Identity Charging Operator',
        contactEmail: 'operator@ecovolt.test',
        user: {
          create: {
            email: `operator-${Date.now()}@ecovolt.test`,
            passwordHash: 'dummyhash',
            name: 'Operator Admin',
            role: 'manager',
          },
        },
      },
    });

    // 5. Create a test Station with a 2-port CCS2 connector
    const station = await prisma.station.create({
      data: {
        operatorId: operator.id,
        zoneId: zone.id,
        name: 'Dual-Port Hub Station',
        lat: 23.0225,
        lng: 72.5714,
        address: 'Drive-in Road, Ahmedabad',
        provider: 'adani_energy',
        connectors: {
          create: [
            {
              type: 'ccs2',
              powerKw: 120,
              totalCount: 2,
              availableCount: 2,
              status: 'available',
            },
          ],
        },
      },
      include: { connectors: true },
    });

    stationId = station.id;
    connectorId = station.connectors[0].id;
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.session.deleteMany({ where: { stationId } });
    await prisma.booking.deleteMany({ where: { stationId } });
    await prisma.connector.deleteMany({ where: { stationId } });
    await prisma.station.deleteMany({ where: { id: stationId } });
    await prisma.vehicle.deleteMany({ where: { id: { in: [vehicleAId, vehicleBId, vehicleCId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId, userCId] } } });
    await prisma.$disconnect();
  });

  let booking1Start: string;
  let booking1End: string;
  let booking2Start: string;
  let booking2End: string;

  it('1. Assigns Port #1 to the first booking for a time window', async () => {
    booking1Start = new Date(Date.now() + 3600 * 1000 * 4).toISOString();
    booking1End = new Date(Date.now() + 3600 * 1000 * 5).toISOString();

    const res = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        stationId,
        connectorType: 'ccs2',
        vehicleId: vehicleAId,
        windowStart: booking1Start,
        windowEnd: booking1End,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.portNumber).toBe(1);
  });

  it('2. Assigns Port #2 to a concurrent overlapping booking on the same connector', async () => {
    booking2Start = booking1Start;
    booking2End = booking1End;

    const res = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        stationId,
        connectorType: 'ccs2',
        vehicleId: vehicleBId,
        windowStart: booking2Start,
        windowEnd: booking2End,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.portNumber).toBe(2);
  });

  it('3. getSlotMatrix returns both ports as booked with specific windowStart and windowEnd', async () => {
    const res = await request(app)
      .get(`/bookings/station/${stationId}/slots?windowStart=${encodeURIComponent(booking1Start)}&windowEnd=${encodeURIComponent(booking1End)}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.stationId).toBe(stationId);
    expect(res.body.connectors).toHaveLength(1);

    const c = res.body.connectors[0];
    expect(c.totalCount).toBe(2);
    expect(c.bookedCount).toBe(2);
    expect(c.availableCount).toBe(0);
    expect(c.ports).toHaveLength(2);

    // Port 1 should be booked with its exact window and owned by User A
    const port1 = c.ports.find((p: any) => p.portNumber === 1);
    expect(port1).toBeDefined();
    expect(port1.status).toBe('booked');
    expect(port1.windowStart).toBe(booking1Start);
    expect(port1.windowEnd).toBe(booking1End);
    expect(port1.isMine).toBe(true);

    // Port 2 should be booked with its exact window and NOT owned by User A
    const port2 = c.ports.find((p: any) => p.portNumber === 2);
    expect(port2).toBeDefined();
    expect(port2.status).toBe('booked');
    expect(port2.windowStart).toBe(booking2Start);
    expect(port2.windowEnd).toBe(booking2End);
    expect(port2.isMine).toBe(false);

    // Querying as User B flips isMine
    const resB = await request(app)
      .get(`/bookings/station/${stationId}/slots?windowStart=${encodeURIComponent(booking1Start)}&windowEnd=${encodeURIComponent(booking1End)}`)
      .set('Authorization', `Bearer ${tokenB}`);
    const cB = resB.body.connectors[0];
    expect(cB.ports.find((p: any) => p.portNumber === 1)?.isMine).toBe(false);
    expect(cB.ports.find((p: any) => p.portNumber === 2)?.isMine).toBe(true);
  });

  it('4. Rejects a 3rd booking in the same window since both ports are occupied (409 Conflict)', async () => {
    const res = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${tokenC}`)
      .send({
        stationId,
        connectorType: 'ccs2',
        vehicleId: vehicleCId,
        windowStart: booking1Start,
        windowEnd: booking1End,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/No available ccs2 connectors/);
  });

  it('5. Allows a non-overlapping booking in a different window to reuse Port #1', async () => {
    // 2 hours after the previous window (hour 7 to 8)
    const laterStart = new Date(Date.now() + 3600 * 1000 * 7).toISOString();
    const laterEnd = new Date(Date.now() + 3600 * 1000 * 8).toISOString();

    const res = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${tokenC}`)
      .send({
        stationId,
        connectorType: 'ccs2',
        vehicleId: vehicleCId,
        windowStart: laterStart,
        windowEnd: laterEnd,
      });

    expect(res.status).toBe(201);
    expect(res.body.portNumber).toBe(1);

    // getSlotMatrix for the later window should show Port 1 booked, Port 2 available
    const matrixRes = await request(app)
      .get(`/bookings/station/${stationId}/slots?windowStart=${encodeURIComponent(laterStart)}&windowEnd=${encodeURIComponent(laterEnd)}`)
      .set('Authorization', `Bearer ${tokenC}`);

    expect(matrixRes.status).toBe(200);
    const conn = matrixRes.body.connectors[0];
    expect(conn.availableCount).toBe(1);
    expect(conn.bookedCount).toBe(1);

    const p1 = conn.ports.find((p: any) => p.portNumber === 1);
    const p2 = conn.ports.find((p: any) => p.portNumber === 2);
    expect(p1.status).toBe('booked');
    expect(p1.windowStart).toBe(laterStart);
    expect(p2.status).toBe('available');
  });
});
