import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/client';
import { NotificationsService } from '../src/modules/notifications/notifications.service';

const app = createApp();

describe('M2-C11: Notifications & Incentive Nudges Acceptance Tests', () => {
  const driverEmail = `driver_notify_${Date.now()}@ecovolt.in`;
  const password = 'SecurePassword123!';

  let driverToken: string;
  let driverId: string;
  let stationId: string;
  let vehicleId: string;
  let bookingId: string;
  let sessionId: string;
  let notificationId: string;

  beforeAll(async () => {
    // 1. Create Driver User
    const resDriver = await request(app).post('/auth/signup').send({
      email: driverEmail,
      password,
      name: 'Notify Driver',
      role: 'driver',
    });
    driverToken = resDriver.body.accessToken;
    driverId = resDriver.body.user.id;

    // 2. Add vehicle
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
  });

  afterAll(async () => {
    if (bookingId) {
      await prisma.session.deleteMany({ where: { bookingId } });
      await prisma.booking.deleteMany({ where: { id: bookingId } });
    }
    if (vehicleId) {
      await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
    }
    await prisma.user.deleteMany({
      where: { email: driverEmail },
    });
    await prisma.$disconnect();
  });

  it('1. POST /notifications/token - registers an Expo push token for user', async () => {
    const res = await request(app)
      .post('/notifications/token')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        token: 'ExponentPushToken[mock_token_demo_12345]',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('2. Green window nudge hook triggers notification (Edge Case #7)', async () => {
    const notif = await NotificationsService.notifyGreenWindow(
      driverId,
      'Ahmedabad Drive-In Supercharger',
      85,
      34.0
    );

    expect(notif.userId).toBe(driverId);
    expect(notif.type).toBe('green_window_start');
    expect(notif.title).toContain('Solar Peak');
    expect(notif.body).toContain('85%');
    notificationId = notif.id;
  });

  it('3. GET /notifications - returns notification history for user', async () => {
    const res = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].userId).toBe(driverId);
  });

  it('4. PATCH /notifications/:id/read - marks notification as read', async () => {
    const res = await request(app)
      .patch(`/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(notificationId);
    expect(res.body.isRead).toBe(true);
  });

  it('5. Session completion triggers session_completed notification summary hook', async () => {
    // Book and complete session
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

    await request(app)
      .post(`/sessions/${sessionId}/stop`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        energyKwh: 22.0,
      });

    // Check notification history contains session_completed
    const resNotif = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(resNotif.status).toBe(200);
    const completedNotif = resNotif.body.find((n: any) => n.type === 'session_completed');
    expect(completedNotif).toBeDefined();
    expect(completedNotif.body).toContain('22.0 kWh');
  });
});
