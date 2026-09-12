import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/client';

const app = createApp();

describe('Gamification, Green Score & Live Leaderboard APIs Acceptance Tests', () => {
  let driverToken: string;
  let driverId: string;

  beforeAll(async () => {
    // Login as default seeded driver
    const resLogin = await request(app).post('/auth/login').send({
      email: 'driver@ecovolt.in',
      password: 'Password123!',
    });

    driverToken = resLogin.body.accessToken;
    driverId = resLogin.body.user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /impact/leaderboard', () => {
    it('should return live leaderboard ranked by green score descending', async () => {
      const res = await request(app)
        .get('/impact/leaderboard')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('leaderboard');
      expect(res.body).toHaveProperty('currentUserRank');
      expect(Array.isArray(res.body.leaderboard)).toBe(true);
      expect(res.body.leaderboard.length).toBeGreaterThanOrEqual(2);

      // Verify descending sort by greenScore
      const scores = res.body.leaderboard.map((e: any) => e.greenScore);
      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
      }

      // Verify entry structure
      const first = res.body.leaderboard[0];
      expect(first.rank).toBe(1);
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('tier');
      expect(first).toHaveProperty('tierColor');
      expect(first).toHaveProperty('greenScore');
      expect(first).toHaveProperty('co2AvoidedKg');
      expect(first).toHaveProperty('cleanKwh');
      expect(first).toHaveProperty('greenStreak');

      // Verify current user identification
      const currentUserEntry = res.body.leaderboard.find((e: any) => e.userId === driverId);
      expect(currentUserEntry).toBeDefined();
      expect(currentUserEntry.isCurrentUser).toBe(true);

      // Verify rank summary
      expect(res.body.currentUserRank.totalUsers).toBe(res.body.leaderboard.length);
      expect(res.body.currentUserRank.rank).toBe(currentUserEntry.rank);
    });

    it('should allow public unauthenticated access to leaderboard', async () => {
      const res = await request(app).get('/impact/leaderboard').expect(200);
      expect(res.body.leaderboard.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /impact/gamification/me', () => {
    it('should return complete gamification profile for logged in driver', async () => {
      const res = await request(app)
        .get('/impact/gamification/me')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(res.body.userId).toBe(driverId);
      expect(res.body.name).toBe('Aarav Patel');
      expect(res.body.greenScore).toBeGreaterThan(0);
      expect(['Eco Sprout', 'Solar Cruiser', 'Green Pioneer', 'Net-Zero Champion']).toContain(
        res.body.tier
      );
      expect(res.body.currentStreak).toBeGreaterThanOrEqual(1);
      expect(res.body.co2AvoidedKg).toBeGreaterThan(0);
      expect(res.body.cleanKwh).toBeGreaterThan(0);
      expect(res.body.treesEquivalent).toBeGreaterThanOrEqual(1);
      expect(res.body.cleanKmDriven).toBeGreaterThan(0);

      // Verify badges array
      expect(Array.isArray(res.body.badges)).toBe(true);
      expect(res.body.badges.length).toBeGreaterThanOrEqual(5);

      const firstBadge = res.body.badges[0];
      expect(firstBadge).toHaveProperty('id');
      expect(firstBadge).toHaveProperty('title');
      expect(firstBadge).toHaveProperty('description');
      expect(firstBadge).toHaveProperty('unlocked');
      expect(firstBadge).toHaveProperty('progress');

      // Verify shareable summary string
      expect(res.body.shareableSummary).toContain('EcoVolt');
      expect(res.body.shareableSummary).toContain(String(res.body.greenScore));
    });

    it('should return 401 for unauthenticated request to /impact/gamification/me', async () => {
      await request(app).get('/impact/gamification/me').expect(401);
    });
  });
});
