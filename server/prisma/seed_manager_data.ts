import { PrismaClient, Role, SessionStatus, ConnectorType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding dynamic data for Manager Hub (Mahavir EV Charging Network)...');

  // 1. Resolve or create Mahavir Manager User
  const user = await prisma.user.upsert({
    where: { email: 'mahavir@gmail.com' },
    update: { role: Role.manager },
    create: {
      email: 'mahavir@gmail.com',
      name: 'Mahavir Virda',
      role: Role.manager,
      passwordHash: '$2a$12$e/9V4K.q23L...mock_hash_for_dev',
    },
  });

  // 2. Resolve or create Operator record
  let operator = await prisma.operator.findFirst({
    where: { userId: user.id },
  });

  if (!operator) {
    operator = await prisma.operator.create({
      data: {
        userId: user.id,
        name: 'Mahavir EV Charging Network',
        contactEmail: 'mahavir@gmail.com',
        payoutBankDetails: {
          accountName: 'Mahavir Virda',
          bankName: 'HDFC Bank',
          accountNumber: '50100234567891',
          ifscCode: 'HDFC0000240',
        },
        notificationPrefs: {
          emailAlerts: true,
          outageAlerts: true,
        },
      },
    });
  } else {
    operator = await prisma.operator.update({
      where: { id: operator.id },
      data: {
        payoutBankDetails: {
          accountName: 'Mahavir Virda',
          bankName: 'HDFC Bank',
          accountNumber: '50100234567891',
          ifscCode: 'HDFC0000240',
        },
      },
    });
  }

  // 3. Assign all existing stations to Mahavir's Operator Network
  await prisma.station.updateMany({
    data: {
      operatorId: operator.id,
      isActive: true,
    },
  });

  const stations = await prisma.station.findMany({
    where: { operatorId: operator.id },
    include: { connectors: true },
  });

  console.log(`✅ ${stations.length} stations linked to ${operator.name}`);

  // 4. Ensure pricing rules exist for each station
  for (const station of stations) {
    const existingRule = await prisma.pricingRule.findFirst({
      where: { stationId: station.id },
    });

    if (!existingRule) {
      await prisma.pricingRule.create({
        data: {
          stationId: station.id,
          providerMarkup: 2.5,
          enableDynamicDiscount: true,
          discountMaxKwh: 3.0,
          lowOccupancyDiscountInr: 2.0,
          occupancyThresholdPct: 50.0,
        },
      });
    }
  }

  // 5. Create dynamic active & completed sessions for real-time telemetry
  const driverUser = await prisma.user.findFirst({ where: { role: Role.driver } });
  const vehicle = await prisma.vehicle.findFirst();

  if (driverUser && vehicle && stations.length > 0) {
    const targetStation = stations[0];
    const targetConnector = targetStation.connectors[0] || await prisma.connector.create({
      data: {
        stationId: targetStation.id,
        type: ConnectorType.ccs2,
        powerKw: 60.0,
        totalCount: 2,
        availableCount: 1,
      },
    });

    // Create a demo booking for session link
    const booking1 = await prisma.booking.create({
      data: {
        userId: driverUser.id,
        stationId: targetStation.id,
        connectorId: targetConnector.id,
        connectorType: targetConnector.type,
        vehicleId: vehicle.id,
        status: SessionStatus.active,
        windowStart: new Date(Date.now() - 30 * 60 * 1000),
        windowEnd: new Date(Date.now() + 60 * 60 * 1000),
        lockedPrice: { baseTariff: 12.5, providerMarkup: 2.5, finalPrice: 15.0 },
      },
    });

    // Active session
    await prisma.session.upsert({
      where: { bookingId: booking1.id },
      update: {
        status: SessionStatus.active,
        energyKwh: 24.5,
        cost: 367.5,
      },
      create: {
        bookingId: booking1.id,
        stationId: targetStation.id,
        connectorId: targetConnector.id,
        connectorType: targetConnector.type,
        vehicleId: vehicle.id,
        userId: driverUser.id,
        status: SessionStatus.active,
        startedAt: new Date(Date.now() - 30 * 60 * 1000),
        energyKwh: 24.5,
        cost: 367.5,
        avgRenewablePct: 91.2,
        co2AvoidedKg: 19.6,
      },
    });

    // Completed session for past revenue
    const booking2 = await prisma.booking.create({
      data: {
        userId: driverUser.id,
        stationId: targetStation.id,
        connectorId: targetConnector.id,
        connectorType: targetConnector.type,
        vehicleId: vehicle.id,
        status: SessionStatus.completed,
        windowStart: new Date(Date.now() - 3 * 60 * 60 * 1000),
        windowEnd: new Date(Date.now() - 2 * 60 * 60 * 1000),
        lockedPrice: { baseTariff: 12.5, providerMarkup: 2.5, finalPrice: 15.0 },
      },
    });

    await prisma.session.upsert({
      where: { bookingId: booking2.id },
      update: {},
      create: {
        bookingId: booking2.id,
        stationId: targetStation.id,
        connectorId: targetConnector.id,
        connectorType: targetConnector.type,
        vehicleId: vehicle.id,
        userId: driverUser.id,
        status: SessionStatus.completed,
        startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        endedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        energyKwh: 45.0,
        cost: 675.0,
        avgRenewablePct: 88.0,
        co2AvoidedKg: 36.0,
      },
    });

    console.log('✅ Demo active & completed sessions seeded for manager telemetry!');
  }

  console.log('✨ Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding manager data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
