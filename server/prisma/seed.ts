import { PrismaClient, Role, VehicleClass, ConnectorType, PowerProvider, SessionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting ecoVolt-finder database seed...');

  // 1. Clean existing records in reverse dependency order
  await prisma.review.deleteMany();
  await prisma.session.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.connector.deleteMany();
  await prisma.station.deleteMany();
  await prisma.operator.deleteMany();
  await prisma.tariff.deleteMany();
  await prisma.forecastCache.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.gridZone.deleteMany();

  // 2. Seed Grid Zones (India)
  console.log('⚡ Seeding Grid Zones...');
  const zoneWest = await prisma.gridZone.create({
    data: {
      id: 'IN-WE',
      name: 'Western Regional Grid (Gujarat/Maharashtra/Goa)',
      state: 'Gujarat',
    },
  });

  const zoneNorth = await prisma.gridZone.create({
    data: {
      id: 'IN-NO',
      name: 'Northern Regional Grid (Delhi/NCR/Rajasthan/Punjab)',
      state: 'Delhi',
    },
  });

  const zoneSouth = await prisma.gridZone.create({
    data: {
      id: 'IN-SO',
      name: 'Southern Regional Grid (Karnataka/Tamil Nadu)',
      state: 'Karnataka',
    },
  });

  // 3. Seed Users (Driver, Manager, Admin)
  console.log('👥 Seeding Users...');
  const defaultHash = await bcrypt.hash('Password123!', 12);

  const driverUser = await prisma.user.create({
    data: {
      email: 'driver@ecovolt.in',
      name: 'Aarav Patel',
      role: Role.driver,
      passwordHash: defaultHash,
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      email: 'manager@ecovolt.in',
      name: 'Priya Sharma',
      role: Role.manager,
      passwordHash: defaultHash,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@ecovolt.in',
      name: 'Admin System',
      role: Role.admin,
      passwordHash: defaultHash,
    },
  });

  // 4. Seed Vehicles for Driver
  console.log('🚗 Seeding Vehicles...');
  const nexonEv = await prisma.vehicle.create({
    data: {
      userId: driverUser.id,
      vehicleClass: VehicleClass.car,
      model: 'Tata Nexon EV Max',
      batteryKwh: 40.5,
      efficiencyWhKm: 140.0,
      connectors: [ConnectorType.ccs2, ConnectorType.type2_ac],
      currentChargePct: 35.0,
    },
  });

  const atherBike = await prisma.vehicle.create({
    data: {
      userId: driverUser.id,
      vehicleClass: VehicleClass.bike,
      model: 'Ather 450X Gen 3',
      batteryKwh: 3.7,
      efficiencyWhKm: 35.0,
      connectors: [ConnectorType.type2_ac, ConnectorType.three_pin],
      currentChargePct: 60.0,
    },
  });

  // 5. Seed Operators
  console.log('🏢 Seeding Operators...');
  const operatorStatiq = await prisma.operator.create({
    data: {
      userId: managerUser.id,
      name: 'Statiq EV Charging Network',
      contactEmail: 'support@statiq.in',
    },
  });

  const operatorTata = await prisma.operator.create({
    data: {
      userId: managerUser.id,
      name: 'Tata Power EZ Charge',
      contactEmail: 'ezcharge@tatapower.com',
    },
  });

  // 6. Seed Tariffs per Provider (Base Rates in ₹/kWh)
  console.log('💰 Seeding Tariffs...');
  await prisma.tariff.createMany({
    data: [
      {
        provider: PowerProvider.torrent_power,
        zoneId: zoneWest.id,
        baseRate: 13.5,
        touSlabs: { peak: 16.0, normal: 13.5, offPeak: 10.5 },
      },
      {
        provider: PowerProvider.guvnl_gb,
        zoneId: zoneWest.id,
        baseRate: 11.8,
        touSlabs: { peak: 14.5, normal: 11.8, offPeak: 9.2 },
      },
      {
        provider: PowerProvider.adani_energy,
        zoneId: zoneWest.id,
        baseRate: 12.8,
        touSlabs: { peak: 15.2, normal: 12.8, offPeak: 10.0 },
      },
      {
        provider: PowerProvider.tata_power,
        zoneId: zoneWest.id,
        baseRate: 12.5,
        touSlabs: { peak: 15.0, normal: 12.5, offPeak: 9.8 },
      },
      {
        provider: PowerProvider.bses,
        zoneId: zoneNorth.id,
        baseRate: 14.0,
        touSlabs: { peak: 17.0, normal: 14.0, offPeak: 11.0 },
      },
    ],
  });

  // 7. Seed Charging Stations in Ahmedabad / Western Zone
  console.log('⚡ Seeding Stations & Connectors...');
  const station1 = await prisma.station.create({
    data: {
      name: 'Statiq Hub — SG Highway Sindhu Bhavan',
      operatorId: operatorStatiq.id,
      zoneId: zoneWest.id,
      provider: PowerProvider.torrent_power,
      lat: 23.0441,
      lng: 72.5085,
      address: 'Sindhu Bhavan Road, Bodakdev, Ahmedabad, Gujarat 380054',
      isActive: true,
      connectors: {
        create: [
          {
            type: ConnectorType.ccs2,
            powerKw: 60.0,
            totalCount: 4,
            availableCount: 3,
            status: 'available',
          },
          {
            type: ConnectorType.type2_ac,
            powerKw: 22.0,
            totalCount: 2,
            availableCount: 2,
            status: 'available',
          },
        ],
      },
      pricingRules: {
        create: {
          providerMarkup: 3.5,
          enableDynamicDiscount: true,
          discountMaxKwh: 3.0,
        },
      },
    },
    include: { connectors: true },
  });

  const station2 = await prisma.station.create({
    data: {
      name: 'Tata EZ Charge — Prahlad Nagar',
      operatorId: operatorTata.id,
      zoneId: zoneWest.id,
      provider: PowerProvider.adani_energy,
      lat: 23.0125,
      lng: 72.5112,
      address: 'Prahlad Nagar Corporate Road, Ahmedabad, Gujarat 380015',
      isActive: true,
      connectors: {
        create: [
          {
            type: ConnectorType.ccs2,
            powerKw: 120.0,
            totalCount: 2,
            availableCount: 1,
            status: 'available',
          },
          {
            type: ConnectorType.bharat_dc_001,
            powerKw: 15.0,
            totalCount: 2,
            availableCount: 2,
            status: 'available',
          },
        ],
      },
      pricingRules: {
        create: {
          providerMarkup: 2.8,
          enableDynamicDiscount: true,
          discountMaxKwh: 2.5,
        },
      },
    },
    include: { connectors: true },
  });

  const station3 = await prisma.station.create({
    data: {
      name: 'Statiq Fast Charger — Infocity Gandhinagar',
      operatorId: operatorStatiq.id,
      zoneId: zoneWest.id,
      provider: PowerProvider.guvnl_gb,
      lat: 23.1895,
      lng: 72.6288,
      address: 'Infocity Club & Resort Road, Gandhinagar, Gujarat 382007',
      isActive: true,
      connectors: {
        create: [
          {
            type: ConnectorType.ccs2,
            powerKw: 50.0,
            totalCount: 2,
            availableCount: 2,
            status: 'available',
          },
          {
            type: ConnectorType.type2_ac,
            powerKw: 7.4,
            totalCount: 4,
            availableCount: 3,
            status: 'available',
          },
        ],
      },
      pricingRules: {
        create: {
          providerMarkup: 2.0,
          enableDynamicDiscount: true,
          discountMaxKwh: 2.0,
          lowOccupancyDiscountInr: 2.0,
          occupancyThresholdPct: 50.0,
        },
      },
    },
    include: { connectors: true },
  });

  // 7b. Seed 6 EV Charging Stations in Mumbai (Maharashtra / Western Zone)
  console.log('⚡ Seeding Mumbai Stations & Connectors...');
  const mumbaiStation1 = await prisma.station.create({
    data: {
      name: 'Tata Power EV Hub — BKC Bandra',
      operatorId: operatorTata.id,
      zoneId: zoneWest.id,
      provider: PowerProvider.tata_power,
      lat: 19.0657,
      lng: 72.8683,
      address: 'G Block BKC, Bandra East, Mumbai, Maharashtra 400051',
      isActive: true,
      connectors: {
        create: [
          {
            type: ConnectorType.ccs2,
            powerKw: 60.0,
            totalCount: 4,
            availableCount: 4, // 100% available (low occupancy deal)
            status: 'available',
          },
          {
            type: ConnectorType.type2_ac,
            powerKw: 22.0,
            totalCount: 2,
            availableCount: 2,
            status: 'available',
          },
        ],
      },
      pricingRules: {
        create: {
          providerMarkup: 3.5,
          enableDynamicDiscount: true,
          discountMaxKwh: 3.5,
          lowOccupancyDiscountInr: 3.5,
          occupancyThresholdPct: 50.0,
        },
      },
    },
    include: { connectors: true },
  });

  const mumbaiStation2 = await prisma.station.create({
    data: {
      name: 'Adani Electricity Supercharge — Andheri West',
      operatorId: operatorTata.id,
      zoneId: zoneWest.id,
      provider: PowerProvider.adani_energy,
      lat: 19.1363,
      lng: 72.8277,
      address: 'Link Road, Andheri West, Mumbai, Maharashtra 400053',
      isActive: true,
      connectors: {
        create: [
          {
            type: ConnectorType.ccs2,
            powerKw: 120.0,
            totalCount: 4,
            availableCount: 3,
            status: 'available',
          },
        ],
      },
      pricingRules: {
        create: {
          providerMarkup: 4.0,
          enableDynamicDiscount: true,
          discountMaxKwh: 4.0,
          lowOccupancyDiscountInr: 3.8,
          occupancyThresholdPct: 50.0,
        },
      },
    },
    include: { connectors: true },
  });

  const mumbaiStation3 = await prisma.station.create({
    data: {
      name: 'Jio-bp Pulse Hub — Worli Sea Face',
      operatorId: operatorStatiq.id,
      zoneId: zoneWest.id,
      provider: PowerProvider.tata_power,
      lat: 19.0178,
      lng: 72.8172,
      address: 'Worli Sea Face, Mumbai, Maharashtra 400018',
      isActive: true,
      connectors: {
        create: [
          {
            type: ConnectorType.ccs2,
            powerKw: 60.0,
            totalCount: 4,
            availableCount: 3,
            status: 'available',
          },
        ],
      },
      pricingRules: {
        create: {
          providerMarkup: 3.0,
          enableDynamicDiscount: true,
          discountMaxKwh: 3.0,
          lowOccupancyDiscountInr: 3.0,
          occupancyThresholdPct: 50.0,
        },
      },
    },
    include: { connectors: true },
  });

  const mumbaiStation4 = await prisma.station.create({
    data: {
      name: 'Fortum Charge & Drive — Lower Parel',
      operatorId: operatorStatiq.id,
      zoneId: zoneWest.id,
      provider: PowerProvider.adani_energy,
      lat: 18.9953,
      lng: 72.8242,
      address: 'High Street Phoenix, Lower Parel, Mumbai, Maharashtra 400013',
      isActive: true,
      connectors: {
        create: [
          {
            type: ConnectorType.ccs2,
            powerKw: 50.0,
            totalCount: 2,
            availableCount: 1,
            status: 'available',
          },
          {
            type: ConnectorType.type2_ac,
            powerKw: 22.0,
            totalCount: 4,
            availableCount: 3,
            status: 'available',
          },
        ],
      },
      pricingRules: {
        create: {
          providerMarkup: 3.2,
          enableDynamicDiscount: true,
          discountMaxKwh: 3.0,
          lowOccupancyDiscountInr: 3.0,
          occupancyThresholdPct: 50.0,
        },
      },
    },
    include: { connectors: true },
  });

  const mumbaiStation5 = await prisma.station.create({
    data: {
      name: 'MSEDCL Green Grid Station — Dadar TT Circle',
      operatorId: operatorTata.id,
      zoneId: zoneWest.id,
      provider: PowerProvider.adani_energy,
      lat: 19.0178,
      lng: 72.8478,
      address: 'Dadar East, Mumbai, Maharashtra 400014',
      isActive: true,
      connectors: {
        create: [
          {
            type: ConnectorType.ccs2,
            powerKw: 50.0,
            totalCount: 2,
            availableCount: 2,
            status: 'available',
          },
        ],
      },
      pricingRules: {
        create: {
          providerMarkup: 2.5,
          enableDynamicDiscount: true,
          discountMaxKwh: 2.5,
          lowOccupancyDiscountInr: 2.5,
          occupancyThresholdPct: 50.0,
        },
      },
    },
    include: { connectors: true },
  });

  const mumbaiStation6 = await prisma.station.create({
    data: {
      name: 'Ather & Fast EV Hub — Powai Hiranandani',
      operatorId: operatorTata.id,
      zoneId: zoneWest.id,
      provider: PowerProvider.tata_power,
      lat: 19.1197,
      lng: 72.9051,
      address: 'Central Ave, Hiranandani Gardens, Powai, Mumbai, Maharashtra 400076',
      isActive: true,
      connectors: {
        create: [
          {
            type: ConnectorType.ccs2,
            powerKw: 50.0,
            totalCount: 4,
            availableCount: 4,
            status: 'available',
          },
          {
            type: ConnectorType.type2_ac,
            powerKw: 7.4,
            totalCount: 4,
            availableCount: 4,
            status: 'available',
          },
        ],
      },
      pricingRules: {
        create: {
          providerMarkup: 3.0,
          enableDynamicDiscount: true,
          discountMaxKwh: 3.0,
          lowOccupancyDiscountInr: 3.0,
          occupancyThresholdPct: 50.0,
        },
      },
    },
    include: { connectors: true },
  });

  // 8. Seed Bookings & Sessions
  console.log('📅 Seeding Bookings & Sessions...');
  const ccs2Connector = station1.connectors.find((c) => c.type === ConnectorType.ccs2)!;

  const sampleBooking = await prisma.booking.create({
    data: {
      userId: driverUser.id,
      stationId: station1.id,
      connectorId: ccs2Connector.id,
      connectorType: ConnectorType.ccs2,
      vehicleId: nexonEv.id,
      status: SessionStatus.completed,
      windowStart: new Date(Date.now() - 3600 * 1000 * 4), // 4 hours ago
      windowEnd: new Date(Date.now() - 3600 * 1000 * 3),   // 3 hours ago
      lockedPrice: {
        stationId: station1.id,
        connectorType: 'ccs2',
        baseTariff: 13.5,
        providerMarkup: 3.5,
        touAdjustment: -2.5, // Green discount
        finalPrice: 14.5,
        isEstimate: false,
        currency: 'INR',
        validUntil: new Date().toISOString(),
      },
    },
  });

  await prisma.session.create({
    data: {
      bookingId: sampleBooking.id,
      stationId: station1.id,
      connectorId: ccs2Connector.id,
      connectorType: ConnectorType.ccs2,
      vehicleId: nexonEv.id,
      userId: driverUser.id,
      status: SessionStatus.completed,
      startedAt: new Date(Date.now() - 3600 * 1000 * 4),
      endedAt: new Date(Date.now() - 3600 * 1000 * 3 + 1800 * 1000),
      energyKwh: 24.5,
      cost: 355.25, // 24.5 kWh * 14.5 ₹
      avgRenewablePct: 78.4,
      co2AvoidedKg: 14.2,
    },
  });

  // Seed sample review
  await prisma.review.create({
    data: {
      userId: driverUser.id,
      stationId: station1.id,
      rating: 5,
      comment: 'Super fast CCS2 charging and great clean solar power discount during afternoon hours!',
    },
  });

  console.log('✅ ecoVolt-finder database seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
