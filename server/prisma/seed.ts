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

  const demoDriver2 = await prisma.user.create({
    data: {
      email: 'priya.nair@demo.ecovolt.in',
      name: 'Priya Nair',
      role: Role.driver,
      passwordHash: defaultHash,
    },
  });

  const demoDriver3 = await prisma.user.create({
    data: {
      email: 'rohan.mehta@demo.ecovolt.in',
      name: 'Rohan Mehta',
      role: Role.driver,
      passwordHash: defaultHash,
    },
  });

  const demoDriver4 = await prisma.user.create({
    data: {
      email: 'vikram.desai@demo.ecovolt.in',
      name: 'Vikram Desai',
      role: Role.driver,
      passwordHash: defaultHash,
    },
  });

  const demoDriver5 = await prisma.user.create({
    data: {
      email: 'ananya.iyer@demo.ecovolt.in',
      name: 'Ananya Iyer',
      role: Role.driver,
      passwordHash: defaultHash,
    },
  });

  const demoDriver6 = await prisma.user.create({
    data: {
      email: 'sameer.joshi@demo.ecovolt.in',
      name: 'Sameer Joshi',
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

  // 4. Seed Vehicles for Drivers
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

  const mgZsEv = await prisma.vehicle.create({
    data: {
      userId: demoDriver2.id,
      vehicleClass: VehicleClass.car,
      model: 'MG ZS EV Excite',
      batteryKwh: 50.3,
      efficiencyWhKm: 155.0,
      connectors: [ConnectorType.ccs2, ConnectorType.type2_ac],
      currentChargePct: 70.0,
    },
  });

  const curvvEv = await prisma.vehicle.create({
    data: {
      userId: demoDriver3.id,
      vehicleClass: VehicleClass.car,
      model: 'Tata Curvv EV 55',
      batteryKwh: 55.0,
      efficiencyWhKm: 145.0,
      connectors: [ConnectorType.ccs2, ConnectorType.type2_ac],
      currentChargePct: 45.0,
    },
  });

  const tiagoEv = await prisma.vehicle.create({
    data: {
      userId: demoDriver4.id,
      vehicleClass: VehicleClass.car,
      model: 'Tata Tiago EV',
      batteryKwh: 24.0,
      efficiencyWhKm: 110.0,
      connectors: [ConnectorType.ccs2, ConnectorType.type2_ac],
      currentChargePct: 50.0,
    },
  });

  const ioniqEv = await prisma.vehicle.create({
    data: {
      userId: demoDriver5.id,
      vehicleClass: VehicleClass.car,
      model: 'Hyundai Ioniq 5',
      batteryKwh: 72.6,
      efficiencyWhKm: 160.0,
      connectors: [ConnectorType.ccs2, ConnectorType.type2_ac],
      currentChargePct: 55.0,
    },
  });

  const olaS1 = await prisma.vehicle.create({
    data: {
      userId: demoDriver6.id,
      vehicleClass: VehicleClass.bike,
      model: 'Ola S1 Pro Gen 2',
      batteryKwh: 4.0,
      efficiencyWhKm: 38.0,
      connectors: [ConnectorType.three_pin, ConnectorType.type2_ac],
      currentChargePct: 40.0,
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

  // 8. Seed Bookings & Sessions with Rich Historical Data
  console.log('📅 Seeding Bookings & Sessions for Live Leaderboard & Gamification...');

  // Helper to create completed booking and charging session
  const seedCompletedSession = async (params: {
    user: any;
    station: any;
    vehicle: any;
    daysAgo: number;
    hoursAgo: number;
    hourOfDay: number; // e.g. 13 for 1 PM solar peak
    durationMinutes: number;
    energyKwh: number;
    finalPricePerKwh: number;
    renewablePct: number;
    co2Kg: number;
  }) => {
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - params.daysAgo);
    startTime.setHours(params.hourOfDay, 0, 0, 0);

    const endTime = new Date(startTime.getTime() + params.durationMinutes * 60 * 1000);
    const connector = params.station.connectors[0];

    const booking = await prisma.booking.create({
      data: {
        userId: params.user.id,
        stationId: params.station.id,
        connectorId: connector.id,
        connectorType: connector.type,
        vehicleId: params.vehicle.id,
        status: SessionStatus.completed,
        windowStart: startTime,
        windowEnd: endTime,
        lockedPrice: {
          stationId: params.station.id,
          connectorType: connector.type,
          baseTariff: 13.5,
          providerMarkup: 3.0,
          touAdjustment: params.renewablePct >= 70 ? -3.0 : 0,
          finalPrice: params.finalPricePerKwh,
          isEstimate: false,
          currency: 'INR',
          validUntil: endTime.toISOString(),
        },
      },
    });

    await prisma.session.create({
      data: {
        bookingId: booking.id,
        stationId: params.station.id,
        connectorId: connector.id,
        connectorType: connector.type,
        vehicleId: params.vehicle.id,
        userId: params.user.id,
        status: SessionStatus.completed,
        startedAt: startTime,
        endedAt: endTime,
        energyKwh: params.energyKwh,
        cost: Number((params.energyKwh * params.finalPricePerKwh).toFixed(2)),
        avgRenewablePct: params.renewablePct,
        co2AvoidedKg: params.co2Kg,
      },
    });
  };

  // 1. Sessions for Aarav Patel (Current User, driver@ecovolt.in) - 6 sessions, 5 consecutive green streak
  await seedCompletedSession({
    user: driverUser,
    station: mumbaiStation1,
    vehicle: nexonEv,
    daysAgo: 12,
    hoursAgo: 288,
    hourOfDay: 10,
    durationMinutes: 45,
    energyKwh: 22.0,
    finalPricePerKwh: 15.0,
    renewablePct: 62.0, // Older non-green session
    co2Kg: 8.5,
  });

  await seedCompletedSession({
    user: driverUser,
    station: mumbaiStation2,
    vehicle: nexonEv,
    daysAgo: 9,
    hoursAgo: 216,
    hourOfDay: 13, // Solar peak
    durationMinutes: 40,
    energyKwh: 28.5,
    finalPricePerKwh: 12.5,
    renewablePct: 78.5,
    co2Kg: 18.2,
  });

  await seedCompletedSession({
    user: driverUser,
    station: mumbaiStation3,
    vehicle: nexonEv,
    daysAgo: 7,
    hoursAgo: 168,
    hourOfDay: 14, // Solar peak
    durationMinutes: 50,
    energyKwh: 32.0,
    finalPricePerKwh: 13.0,
    renewablePct: 84.0,
    co2Kg: 22.4,
  });

  await seedCompletedSession({
    user: driverUser,
    station: mumbaiStation4,
    vehicle: nexonEv,
    daysAgo: 4,
    hoursAgo: 96,
    hourOfDay: 12, // Solar peak
    durationMinutes: 38,
    energyKwh: 26.0,
    finalPricePerKwh: 12.8,
    renewablePct: 76.0,
    co2Kg: 17.5,
  });

  await seedCompletedSession({
    user: driverUser,
    station: mumbaiStation1,
    vehicle: nexonEv,
    daysAgo: 2,
    hoursAgo: 48,
    hourOfDay: 13, // Solar peak
    durationMinutes: 45,
    energyKwh: 30.5,
    finalPricePerKwh: 12.2,
    renewablePct: 88.0,
    co2Kg: 24.8,
  });

  await seedCompletedSession({
    user: driverUser,
    station: mumbaiStation6,
    vehicle: nexonEv,
    daysAgo: 0,
    hoursAgo: 4,
    hourOfDay: 14, // Solar peak
    durationMinutes: 42,
    energyKwh: 27.5,
    finalPricePerKwh: 12.5,
    renewablePct: 79.5,
    co2Kg: 19.4,
  });

  // 2. Sessions for Priya Nair (Top Rank #1 Leader) - 8 high green sessions
  for (let i = 8; i >= 1; i--) {
    await seedCompletedSession({
      user: demoDriver2,
      station: i % 2 === 0 ? mumbaiStation1 : mumbaiStation2,
      vehicle: mgZsEv,
      daysAgo: i * 2,
      hoursAgo: i * 48,
      hourOfDay: 13,
      durationMinutes: 55,
      energyKwh: 38.0,
      finalPricePerKwh: 12.0,
      renewablePct: 86.0 + (i % 5),
      co2Kg: 29.5,
    });
  }

  // 3. Sessions for Rohan Mehta (#3)
  for (let i = 4; i >= 1; i--) {
    await seedCompletedSession({
      user: demoDriver3,
      station: mumbaiStation3,
      vehicle: curvvEv,
      daysAgo: i * 3,
      hoursAgo: i * 72,
      hourOfDay: 12,
      durationMinutes: 40,
      energyKwh: 26.0,
      finalPricePerKwh: 13.5,
      renewablePct: 75.0,
      co2Kg: 18.0,
    });
  }

  // 4. Sessions for Vikram Desai (#4)
  for (let i = 3; i >= 1; i--) {
    await seedCompletedSession({
      user: demoDriver4,
      station: mumbaiStation5,
      vehicle: tiagoEv,
      daysAgo: i * 4,
      hoursAgo: i * 96,
      hourOfDay: 15,
      durationMinutes: 35,
      energyKwh: 18.0,
      finalPricePerKwh: 14.0,
      renewablePct: 72.0,
      co2Kg: 12.5,
    });
  }

  // 5. Sessions for Ananya Iyer (#5)
  for (let i = 2; i >= 1; i--) {
    await seedCompletedSession({
      user: demoDriver5,
      station: mumbaiStation4,
      vehicle: ioniqEv,
      daysAgo: i * 5,
      hoursAgo: i * 120,
      hourOfDay: 11,
      durationMinutes: 45,
      energyKwh: 25.0,
      finalPricePerKwh: 13.0,
      renewablePct: 80.0,
      co2Kg: 17.0,
    });
  }

  // 6. Sessions for Sameer Joshi (#6)
  await seedCompletedSession({
    user: demoDriver6,
    station: mumbaiStation6,
    vehicle: olaS1,
    daysAgo: 1,
    hoursAgo: 24,
    hourOfDay: 14,
    durationMinutes: 30,
    energyKwh: 3.5,
    finalPricePerKwh: 11.5,
    renewablePct: 75.0,
    co2Kg: 2.8,
  });

  // Seed sample review
  await prisma.review.create({
    data: {
      userId: driverUser.id,
      stationId: mumbaiStation1.id,
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

