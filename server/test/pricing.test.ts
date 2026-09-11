import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/client';
import { PricingService } from '../src/modules/pricing/pricing.service';
import { ConnectorType } from '@prisma/client';

const app = createApp();

describe('M2-C6 Multi-Provider Pricing Engine Acceptance Tests', () => {
  let torrentStationId: string;
  let adaniStationId: string;

  beforeAll(async () => {
    const stations = await prisma.station.findMany({
      include: { connectors: true },
    });
    const torrentStation = stations.find((s) => s.provider === 'torrent_power')!;
    const adaniStation = stations.find((s) => s.provider === 'adani_energy')!;

    torrentStationId = torrentStation.id;
    adaniStationId = adaniStation.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. GET /pricing/quote - computes quote for Torrent Power station with correct base tariff', async () => {
    const res = await request(app).get(
      `/pricing/quote?stationId=${torrentStationId}&connector=ccs2&kwh=20`
    );

    expect(res.status).toBe(200);
    expect(res.body.stationId).toBe(torrentStationId);
    expect(res.body.connectorType).toBe('ccs2');
    expect(res.body.baseTariff).toBe(13.5); // Torrent base
    expect(res.body.providerMarkup).toBeGreaterThanOrEqual(0);
    expect(res.body.finalPrice).toBeDefined();
    expect(res.body.validUntil).toBeDefined();
    expect(res.body.currency).toBe('INR');
  });

  it('2. GET /pricing/quote - quotes for different providers reflect different base tariffs', async () => {
    const resTorrent = await request(app).get(
      `/pricing/quote?stationId=${torrentStationId}&connector=ccs2&kwh=20`
    );
    const resAdani = await request(app).get(
      `/pricing/quote?stationId=${adaniStationId}&connector=ccs2&kwh=20`
    );

    expect(resTorrent.body.baseTariff).toBe(13.5); // Torrent Power
    expect(resAdani.body.baseTariff).toBe(12.8);  // Adani Energy
    expect(resTorrent.body.baseTariff).not.toBe(resAdani.body.baseTariff);
  });

  it('3. GET /pricing/quote - rejects invalid/negative kwh (Edge Case #24)', async () => {
    const res = await request(app).get(
      `/pricing/quote?stationId=${torrentStationId}&connector=ccs2&kwh=-15`
    );

    expect(res.status).toBe(422);
    expect(res.body.error).toBeDefined();
  });

  it('4. Unit Test - Price Floor respects 60% base floor even with extreme discount', async () => {
    const quote = await PricingService.computeQuote({
      stationId: torrentStationId,
      connectorType: ConnectorType.ccs2,
      renewablePctOverride: 100, // 100% renewable
    });

    const minFloor = 13.5 * 0.6; // 8.1
    expect(quote.finalPrice).toBeGreaterThanOrEqual(minFloor);
  });

  it('5. Price Lock - validUntil is set in future (~30 minutes window)', async () => {
    const quote = await PricingService.computeQuote({
      stationId: torrentStationId,
      connectorType: ConnectorType.ccs2,
    });

    const now = Date.now();
    const expiry = new Date(quote.validUntil).getTime();
    expect(expiry).toBeGreaterThan(now + 25 * 60 * 1000);
    expect(expiry).toBeLessThanOrEqual(now + 31 * 60 * 1000);
  });
});
