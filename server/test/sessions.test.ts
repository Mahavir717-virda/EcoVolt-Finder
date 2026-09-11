import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/client';

const app = createApp();

describe('M2-C8 Session Lifecycle & Metering Acceptance Tests', () => {
  const driverEmail = `driver_sess_${Date.now()}@ecovolt.in`;
  const password = 'SecurePassword123!';

  let driverToken: string;
  let driverUserId: string;
  let vehicleId: string;
  let stationId: string;
  let bookingId: string;
  let sessionId: string;

  beforeAll(async () => {
    // 1. Create Driver User
    const resUser = await request(app).post('/auth/signup').send({
      email: driverEmail,
      password,
      name: 'Session Driver',
      role: 'driver',
    });
    driverToken = resUser.body.accessToken;
    driverUserId = resUser.body.user.id;

    // 2. Add Vehicle
    const resVeh = await request(app)
      .post('/vehicles')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        vehicleClass: 'car',
        model: 'Tata Nexon EV Max',
        batteryKwh: 40.5,
      });
    vehicleId = resVeh.body.id;

    // 3. Find a station
    const station = await prisma.station.findFirst({
      where: { provider: 'torrent_power' },
      include: { connectors: true },
    });
    stationId = station!.id;

    // 4. Create a Booking with a locked price snapshot (e.g. 14.5 ₹/kWh)
    const windowStart = new Date(Date.now() + 3600 * 1000 * 1).toISOString();
    const windowEnd = new Date(Date.now() + 3600 * 1000 * 2).toISOString();

    const resBooking = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        stationId,
        connectorType: 'ccs2',
        vehicleId,
        windowStart,
        windowEnd,
      });

    bookingId = resBooking.body.id;
  });

  afterAll(async () => {
    if (bookingId) {
      await prisma.session.deleteMany({ where: { bookingId } });
      await prisma.booking.deleteMany({ where: { id: bookingId } });
    }
    if (vehicleId) {
      await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
    }
    if (driverUserId) {
      await prisma.user.deleteMany({ where: { id: driverUserId } });
    }
    await prisma.$disconnect();
  });

  it('1. POST /sessions/:id/start - activates session from booking', async () => {
    const res = await request(app)
      .post(`/sessions/${bookingId}/start`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('active');
    expect(res.body.startedAt).toBeDefined();

    sessionId = res.body.id;
  });

  it('2. POST /sessions/:id/start - duplicate start returns 409 Conflict', async () => {
    const res = await request(app)
      .post(`/sessions/${sessionId}/start`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
  });

  it('3. GET /sessions/:id - retrieves live session details', async () => {
    const res = await request(app)
      .get(`/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(sessionId);
    expect(res.body.status).toBe('active');
    expect(res.body.station).toBeDefined();
    expect(res.body.vehicle).toBeDefined();
  });

  it('4. POST /sessions/:id/stop - stops session, bills at locked price, calculates CO2 avoided (Edge Case #17)', async () => {
    const res = await request(app)
      .post(`/sessions/${sessionId}/stop`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        energyKwh: 20.0, // 20 kWh delivered
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.energyKwh).toBe(20.0);
    expect(res.body.cost).toBeGreaterThan(0);
    expect(res.body.avgRenewablePct).toBeGreaterThan(0);
    expect(res.body.co2AvoidedKg).toBeGreaterThan(0);
  });

  it('5. POST /sessions/:id/stop - stopping an already completed session returns 409 Conflict', async () => {
    const res = await request(app)
      .post(`/sessions/${sessionId}/stop`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        energyKwh: 10.0,
      });

    expect(res.status).toBe(409);
  });
});
