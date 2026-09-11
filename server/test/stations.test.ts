import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/client';

const app = createApp();

describe('M2-C5 Stations & Operators Acceptance Tests', () => {
  const managerAEmail = `manager_sta_a_${Date.now()}@ecovolt.in`;
  const managerBEmail = `manager_sta_b_${Date.now()}@ecovolt.in`;
  const driverEmail = `driver_sta_${Date.now()}@ecovolt.in`;
  const password = 'SecurePassword123!';

  let managerAToken: string;
  let managerBToken: string;
  let driverToken: string;
  let stationAId: string;

  beforeAll(async () => {
    const resA = await request(app).post('/auth/signup').send({
      email: managerAEmail,
      password,
      name: 'Manager A',
      role: 'manager',
    });
    managerAToken = resA.body.accessToken;

    const resB = await request(app).post('/auth/signup').send({
      email: managerBEmail,
      password,
      name: 'Manager B',
      role: 'manager',
    });
    managerBToken = resB.body.accessToken;

    const resDriver = await request(app).post('/auth/signup').send({
      email: driverEmail,
      password,
      name: 'Driver User',
      role: 'driver',
    });
    driverToken = resDriver.body.accessToken;
  });

  afterAll(async () => {
    if (stationAId) {
      await prisma.connector.deleteMany({ where: { stationId: stationAId } });
      await prisma.pricingRule.deleteMany({ where: { stationId: stationAId } });
      await prisma.station.deleteMany({ where: { id: stationAId } });
    }
    await prisma.operator.deleteMany({
      where: {
        user: {
          email: { in: [managerAEmail, managerBEmail] },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: [managerAEmail, managerBEmail, driverEmail] },
      },
    });
    await prisma.$disconnect();
  });

  it('1. GET /stations - spatial Haversine search returns nearby seed stations in Ahmedabad', async () => {
    const res = await request(app).get('/stations?lat=23.0440&lng=72.5080&radiusKm=10');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);

    const firstStation = res.body[0];
    expect(firstStation.id).toBeDefined();
    expect(firstStation.name).toBeDefined();
    expect(firstStation.location.lat).toBeDefined();
    expect(firstStation.location.lng).toBeDefined();
    expect(firstStation.provider).toBeDefined();
    expect(firstStation.greenness).toBeDefined();
    expect(firstStation.priceFrom).toBeGreaterThan(0);
  });

  it('2. GET /stations - connector filter respects requested connector type', async () => {
    const res = await request(app).get(
      '/stations?lat=23.0440&lng=72.5080&radiusKm=25&connector=ccs2'
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach((st: any) => {
      const hasCcs2 = st.connectors.some((c: any) => c.type === 'ccs2');
      expect(hasCcs2).toBe(true);
    });
  });

  it('3. POST /stations - manager can create a station', async () => {
    const res = await request(app)
      .post('/stations')
      .set('Authorization', `Bearer ${managerAToken}`)
      .send({
        name: 'Manager A Test Station — Vastrapur',
        location: { lat: 23.035, lng: 72.528 },
        address: 'Vastrapur Lake Road, Ahmedabad',
        provider: 'torrent_power',
        connectors: [
          { type: 'ccs2', powerKw: 60, totalCount: 2, availableCount: 2 },
          { type: 'type2_ac', powerKw: 22, totalCount: 2, availableCount: 2 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Manager A Test Station — Vastrapur');
    expect(res.body.connectors.length).toBe(2);

    stationAId = res.body.id;
  });

  it('4. POST /stations - driver role receives 403 Forbidden', async () => {
    const res = await request(app)
      .post('/stations')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        name: 'Driver Fake Station',
        location: { lat: 23.0, lng: 72.0 },
        provider: 'adani_energy',
      });

    expect(res.status).toBe(403);
  });

  it('5. PATCH /stations/:id - manager A can update own station', async () => {
    const res = await request(app)
      .patch(`/stations/${stationAId}`)
      .set('Authorization', `Bearer ${managerAToken}`)
      .send({
        name: 'Manager A Station — Vastrapur Premium Hub',
      });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Manager A Station — Vastrapur Premium Hub');
  });

  it('6. PATCH /stations/:id - manager B gets 403 Forbidden mutating manager A station', async () => {
    const res = await request(app)
      .patch(`/stations/${stationAId}`)
      .set('Authorization', `Bearer ${managerBToken}`)
      .send({
        name: 'Hacked Station Name',
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
  });

  it('7. GET /stations/:id - retrieves full station detail', async () => {
    const res = await request(app).get(`/stations/${stationAId}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(stationAId);
    expect(res.body.operator).toBeDefined();
    expect(res.body.connectors).toBeDefined();
    expect(res.body.pricingRules).toBeDefined();
  });

  it('8. GET /stations/operators - reads public operator list', async () => {
    const res = await request(app).get('/stations/operators');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});
