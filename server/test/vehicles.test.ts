import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/client';

const app = createApp();

describe('M2-C4 Vehicles API Acceptance Tests', () => {
  const userAEmail = `driver_veh_a_${Date.now()}@ecovolt.in`;
  const userBEmail = `driver_veh_b_${Date.now()}@ecovolt.in`;
  const password = 'SecurePassword123!';

  let tokenA: string;
  let tokenB: string;
  let vehicleAId: string;

  beforeAll(async () => {
    // 1. Create User A
    const resA = await request(app).post('/auth/signup').send({
      email: userAEmail,
      password,
      name: 'Driver User A',
      role: 'driver',
    });
    tokenA = resA.body.accessToken;

    // 2. Create User B
    const resB = await request(app).post('/auth/signup').send({
      email: userBEmail,
      password,
      name: 'Driver User B',
      role: 'driver',
    });
    tokenB = resB.body.accessToken;
  });

  afterAll(async () => {
    await prisma.vehicle.deleteMany({
      where: {
        user: {
          email: { in: [userAEmail, userBEmail] },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: [userAEmail, userBEmail] },
      },
    });
    await prisma.$disconnect();
  });

  it('1. POST /vehicles - creates a car vehicle with class defaults', async () => {
    const res = await request(app)
      .post('/vehicles')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        vehicleClass: 'car',
        model: 'Tata Nexon EV Max',
        currentChargePct: 45,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.vehicleClass).toBe('car');
    expect(res.body.model).toBe('Tata Nexon EV Max');
    expect(res.body.batteryKwh).toBe(40.0); // Default applied
    expect(res.body.efficiencyWhKm).toBe(140.0); // Default applied
    expect(res.body.connectors).toEqual(['ccs2', 'type2_ac']); // Default applied
    expect(res.body.currentChargePct).toBe(45);

    vehicleAId = res.body.id;
  });

  it('2. POST /vehicles - creates a bike vehicle with custom attributes', async () => {
    const res = await request(app)
      .post('/vehicles')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        vehicleClass: 'bike',
        model: 'Ather 450X',
        batteryKwh: 3.7,
        efficiencyWhKm: 33.0,
        connectors: ['type2_ac', 'three_pin'],
        currentChargePct: 80,
      });

    expect(res.status).toBe(201);
    expect(res.body.vehicleClass).toBe('bike');
    expect(res.body.batteryKwh).toBe(3.7);
    expect(res.body.efficiencyWhKm).toBe(33.0);
  });

  it('3. POST /vehicles - rejects invalid numerics (negative battery or > 100% charge)', async () => {
    const res = await request(app)
      .post('/vehicles')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        vehicleClass: 'car',
        batteryKwh: -10,
        currentChargePct: 150,
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toBeDefined();
  });

  it('4. GET /vehicles - lists all vehicles for authenticated user', async () => {
    const res = await request(app)
      .get('/vehicles')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  it('5. PATCH /vehicles/:id - updates vehicle fields', async () => {
    const res = await request(app)
      .patch(`/vehicles/${vehicleAId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        currentChargePct: 65,
        model: 'Tata Nexon EV Max 2024 Edition',
      });

    expect(res.status).toBe(200);
    expect(res.body.currentChargePct).toBe(65);
    expect(res.body.model).toBe('Tata Nexon EV Max 2024 Edition');
  });

  it('6. PATCH /vehicles/:id - prevents User B from mutating User A vehicle', async () => {
    const res = await request(app)
      .patch(`/vehicles/${vehicleAId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        currentChargePct: 10,
      });

    expect(res.status).toBe(404);
  });

  it('7. DELETE /vehicles/:id - prevents User B from deleting User A vehicle', async () => {
    const res = await request(app)
      .delete(`/vehicles/${vehicleAId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });

  it('8. DELETE /vehicles/:id - allows User A to delete own vehicle', async () => {
    const res = await request(app)
      .delete(`/vehicles/${vehicleAId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(204);

    const checkRes = await request(app)
      .get('/vehicles')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(checkRes.body.length).toBe(1); // 1 remaining
  });
});
