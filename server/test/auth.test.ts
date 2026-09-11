import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/client';

const app = createApp();

describe('M2-C3 Auth & RBAC Acceptance Tests', () => {
  const testEmail = `driver_test_${Date.now()}@ecovolt.in`;
  const managerEmail = `manager_test_${Date.now()}@ecovolt.in`;
  const password = 'SecurePassword123!';

  let driverToken: string;
  let driverRefreshToken: string;
  let managerToken: string;

  beforeAll(async () => {
    // Ensure test users don't conflict
    await prisma.user.deleteMany({
      where: {
        email: { in: [testEmail, managerEmail] },
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: { in: [testEmail, managerEmail] },
      },
    });
    await prisma.$disconnect();
  });

  it('1. POST /auth/signup - creates a driver user and returns tokens', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({
        email: testEmail,
        password,
        name: 'Test Driver',
        role: 'driver',
      });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toBeUndefined(); // OpenAPI spec doesn't expose email in signup return
    expect(res.body.user.name).toBe('Test Driver');
    expect(res.body.user.role).toBe('driver');

    driverToken = res.body.accessToken;
    driverRefreshToken = res.body.refreshToken;
  });

  it('2. POST /auth/signup - duplicate email returns 409 Conflict', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({
        email: testEmail,
        password,
        name: 'Duplicate Driver',
        role: 'driver',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('3. POST /auth/login - valid credentials returns 200 and tokens', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: testEmail,
        password,
      });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('4. POST /auth/login - wrong password returns 401 without field leaks', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: testEmail,
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('5. GET /me - without token returns 401 Unauthorized', async () => {
    const res = await request(app).get('/me');
    expect(res.status).toBe(401);
  });

  it('6. GET /me - with valid token returns user profile', async () => {
    const res = await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Test Driver');
    expect(res.body.email).toBe(testEmail);
    expect(res.body.role).toBe('driver');
  });

  it('7. PATCH /me - updates user name', async () => {
    const res = await request(app)
      .patch('/me')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ name: 'Updated Driver Name' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Driver Name');
  });

  it('8. POST /auth/refresh - exchanges valid refresh token for new access token', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: driverRefreshToken });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });
});
