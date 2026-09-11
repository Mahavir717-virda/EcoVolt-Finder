import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/client';

const app = createApp();

describe('M2-C10: Impact & Analytics APIs Acceptance Tests', () => {
  const driverEmail = `driver_impact_${Date.now()}@ecovolt.in`;
  const managerEmail = `manager_impact_${Date.now()}@ecovolt.in`;
  const otherManagerEmail = `other_manager_${Date.now()}@ecovolt.in`;
  const adminEmail = `admin_impact_${Date.now()}@ecovolt.in`;
  const password = 'SecurePassword123!';

  let driverToken: string;
  let driverId: string;
  let managerToken: string;
  let managerId: string;
  let otherManagerToken: string;
  let adminToken: string;

  let stationId: string;
  let vehicleId: string;
  let bookingId: string;
  let sessionId: string;

  beforeAll(async () => {
    // 1. Create Driver User
    const resDriver = await request(app).post('/auth/signup').send({
      email: driverEmail,
      password,
      name: 'Impact Driver',
      role: 'driver',
    });
    driverToken = resDriver.body.accessToken;
    driverId = resDriver.body.user.id;

    // 2. Create Manager User
    const resManager = await request(app).post('/auth/signup').send({
      email: managerEmail,
      password,
      name: 'Impact Manager',
      role: 'manager',
    });
    managerToken = resManager.body.accessToken;
    managerId = resManager.body.user.id;

    // 3. Create Other Manager User
    const resOtherManager = await request(app).post('/auth/signup').send({
      email: otherManagerEmail,
      password,
      name: 'Other Manager',
      role: 'manager',
    });
    otherManagerToken = resOtherManager.body.accessToken;

    // 4. Create Admin User
    const resAdmin = await request(app).post('/auth/signup').send({
      email: adminEmail,
      password,
      name: 'Impact Admin',
      role: 'admin',
    });
    adminToken = resAdmin.body.accessToken;

    // 5. Manager creates a station
    const resStation = await request(app)
      .post('/stations')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Impact EcoVolt Hub',
        location: { lat: 23.033, lng: 72.585 },
        provider: 'torrent_power',
      });
    stationId = resStation.body.id;

    // Add connector to station
    await request(app)
      .post(`/stations/${stationId}/connectors`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        type: 'ccs2',
        powerKw: 60,
        totalCount: 4,
      });

    // 6. Driver adds vehicle
    const resVeh = await request(app)
      .post('/vehicles')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        vehicleClass: 'car',
        model: 'Tata Curvv EV',
        batteryKwh: 55,
      });
    vehicleId = resVeh.body.id;

    // 7. Driver books and completes a session
    const resBooking = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        stationId,
        connectorType: 'ccs2',
        vehicleId,
        windowStart: new Date().toISOString(),
        windowEnd: new Date(Date.now() + 3600000).toISOString(),
      });
    bookingId = resBooking.body.id;

    const resSession = await request(app)
      .post(`/sessions/${bookingId}/start`)
      .set('Authorization', `Bearer ${driverToken}`);
    sessionId = resSession.body.id;

    // Stop session to produce metrics
    await request(app)
      .post(`/sessions/${sessionId}/stop`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        energyKwh: 25.0,
      });
  });

  afterAll(async () => {
    if (bookingId) {
      await prisma.session.deleteMany({ where: { bookingId } });
      await prisma.booking.deleteMany({ where: { id: bookingId } });
    }
    if (stationId) {
      await prisma.connector.deleteMany({ where: { stationId } });
      await prisma.station.deleteMany({ where: { id: stationId } });
    }
    if (vehicleId) {
      await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
    }
    await prisma.operator.deleteMany({
      where: {
        userId: {
          in: [managerId],
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [driverEmail, managerEmail, otherManagerEmail, adminEmail],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('GET /impact/me (Driver Lifetime Impact)', () => {
    it('should return aggregated metrics for the authenticated driver', async () => {
      const res = await request(app)
        .get('/impact/me')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(res.body.userId).toBe(driverId);
      expect(res.body.totalSessions).toBeGreaterThanOrEqual(1);
      expect(res.body.totalKwh).toBeGreaterThanOrEqual(25.0);
      expect(res.body.totalSpent).toBeGreaterThan(0);
      expect(res.body).toHaveProperty('savedVsSticker');
      expect(res.body.co2AvoidedKg).toBeGreaterThan(0);
      expect(res.body.avgRenewablePct).toBeGreaterThan(0);
    });

    it('should return 401 for unauthenticated request', async () => {
      await request(app).get('/impact/me').expect(401);
    });
  });

  describe('GET /analytics/station/:id (Manager Station Analytics)', () => {
    it('should return station metrics and demand-charge risk for station owner', async () => {
      const res = await request(app)
        .get(`/analytics/station/${stationId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(res.body.stationId).toBe(stationId);
      expect(res.body.stationName).toBe('Impact EcoVolt Hub');
      expect(res.body.totalSessions).toBeGreaterThanOrEqual(1);
      expect(res.body.totalKwh).toBeGreaterThanOrEqual(25.0);
      expect(res.body.totalRevenue).toBeGreaterThan(0);
      expect(res.body.demandCharge).toBeDefined();
      expect(res.body.demandCharge).toHaveProperty('risk');
      expect(['low', 'medium', 'high']).toContain(res.body.demandCharge.risk);
    });

    it('should return 403 when another manager tries to access the station analytics (Edge Case #22)', async () => {
      await request(app)
        .get(`/analytics/station/${stationId}`)
        .set('Authorization', `Bearer ${otherManagerToken}`)
        .expect(403);
    });

    it('should allow admin to access station analytics', async () => {
      await request(app)
        .get(`/analytics/station/${stationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('GET /analytics/network (Admin Network Analytics)', () => {
    it('should return network-wide aggregates for admin', async () => {
      const res = await request(app)
        .get('/analytics/network')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.totalStations).toBeGreaterThan(0);
      expect(res.body.totalSessions).toBeGreaterThan(0);
      expect(res.body.totalKwh).toBeGreaterThanOrEqual(25.0);
      expect(res.body.totalRevenue).toBeGreaterThan(0);
      expect(res.body.aggregateRenewableShare).toBeGreaterThan(0);
      expect(res.body).toHaveProperty('sessionsShiftedToGreen');
    });

    it('should return 403 when a driver or manager attempts to access network analytics', async () => {
      await request(app)
        .get('/analytics/network')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(403);

      await request(app)
        .get('/analytics/network')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });
  });
});
