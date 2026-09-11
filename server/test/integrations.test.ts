import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/client';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';

const app = createApp();

describe('M2-C9: Integration Layer (ML Client + Google Proxy + Fallback)', () => {
  let driverToken: string;
  let driverUser: any;
  let driverVehicle: any;
  let sampleStation: any;

  beforeAll(async () => {
    // Ensure driver user exists
    driverUser = await prisma.user.findFirst({
      where: { role: 'driver' },
    });

    if (!driverUser) {
      driverUser = await prisma.user.create({
        data: {
          email: 'driver.m2c9@ecovolt.in',
          passwordHash: 'hashed',
          name: 'Integration Driver',
          role: 'driver',
        },
      });
    }

    driverToken = jwt.sign(
      { userId: driverUser.id, role: driverUser.role, email: driverUser.email },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Ensure vehicle exists
    driverVehicle = await prisma.vehicle.findFirst({
      where: { userId: driverUser.id },
    });

    if (!driverVehicle) {
      driverVehicle = await prisma.vehicle.create({
        data: {
          userId: driverUser.id,
          vehicleClass: 'car',
          model: 'Nexon EV Mock',
          batteryKwh: 40.5,
          efficiencyWhKm: 140,
          connectors: ['ccs2', 'type2_ac'],
          currentChargePct: 45,
        },
      });
    }

    sampleStation = await prisma.station.findFirst({
      include: { zone: true },
    });
  });

  describe('GET /forecast', () => {
    it('should return 24-hour forecast from ML service or fallback mock', async () => {
      const res = await request(app)
        .get('/forecast?zoneId=IN-WE')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('hourStartLocal');
      expect(res.body[0]).toHaveProperty('renewablePct');
      expect(res.body[0]).toHaveProperty('confidence');
    });

    it('should return forecast resolved by stationId', async () => {
      if (sampleStation) {
        const res = await request(app)
          .get(`/forecast?stationId=${sampleStation.id}`)
          .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
      }
    });
  });

  describe('GET /recommendations', () => {
    it('should return mock/fallback-tagged recommendations when ML service is not running', async () => {
      const res = await request(app)
        .get('/recommendations')
        .set('Authorization', `Bearer ${driverToken}`)
        .query({
          originLat: 23.0225,
          originLng: 72.5714,
          vehicleId: driverVehicle.id,
          kwh: 18.0,
        })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const firstRec = res.body[0];
      expect(firstRec).toHaveProperty('station');
      expect(firstRec).toHaveProperty('distanceKm');
      expect(firstRec).toHaveProperty('trueTotalCost');
      expect(firstRec).toHaveProperty('reachable');
      expect(firstRec).toHaveProperty('reason');

      // Check that Google server key is NEVER exposed in the response
      const rawResponseStr = JSON.stringify(res.body);
      expect(rawResponseStr).not.toContain(env.GOOGLE_SERVER_KEY || 'fake_key_never_leak');
      expect(rawResponseStr).not.toContain('AIzaSy');
    });

    it('should reject requests with invalid query params', async () => {
      const res = await request(app)
        .get('/recommendations')
        .set('Authorization', `Bearer ${driverToken}`)
        .query({
          originLat: 'invalid',
          originLng: 72.5714,
          vehicleId: driverVehicle.id,
          kwh: -5,
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });
  });
});
