const { PowerProvider, ConnectorType } = require('@prisma/client');

module.exports = async function seedAhmedabad(prisma, { operatorStatiq, operatorTata, operatorJioBp, zoneWest, managerUser }) {
  console.log('⚡ Seeding 15 Real-World Ahmedabad Stations...');

  const operatorChargeZone = await prisma.operator.create({
    data: {
      userId: managerUser.id,
      name: 'ChargeZone',
      contactEmail: 'support@chargezone.com',
    },
  });

  const operatorAther = await prisma.operator.create({
    data: {
      userId: managerUser.id,
      name: 'Ather Energy',
      contactEmail: 'support@atherenergy.com',
    },
  });

  const stations = [
    {
      name: 'Tata Power – Khanij Bhavan / GMDC',
      lat: 23.0381, lng: 72.5368,
      address: '132 Ft Ring Rd, Vastrapur, Ahmedabad',
      operatorId: operatorTata.id,
      provider: PowerProvider.tata_power,
      connectors: [
        { type: ConnectorType.ccs2, powerKw: 60.0, totalCount: 2, availableCount: 2, status: 'available' }
      ]
    },
    {
      name: 'Torrent Power – Naranpura Char Rasta',
      lat: 23.0530, lng: 72.5486,
      address: 'AEC Cross Roads, Swaminarayan Ave, Ahmedabad',
      operatorId: operatorStatiq.id,
      provider: PowerProvider.torrent_power,
      connectors: [
        { type: ConnectorType.ccs2, powerKw: 60.0, totalCount: 2, availableCount: 1, status: 'available' }
      ]
    },
    {
      name: 'Torrent Power – Drive-In Road',
      lat: 23.0485, lng: 72.5312,
      address: 'Near Memnagar Fire Station / Substation, Ahmedabad',
      operatorId: operatorStatiq.id,
      provider: PowerProvider.torrent_power,
      connectors: [
        { type: ConnectorType.ccs2, powerKw: 60.0, totalCount: 1, availableCount: 1, status: 'available' },
        { type: ConnectorType.type2_ac, powerKw: 22.0, totalCount: 1, availableCount: 1, status: 'available' }
      ]
    },
    {
      name: 'ChargeZone – Bodakdev MegaCharger',
      lat: 23.0360, lng: 72.5185,
      address: 'Near Pakwan Cross Rd / Judges Bungalow Rd, Ahmedabad',
      operatorId: operatorChargeZone.id,
      provider: PowerProvider.torrent_power,
      connectors: [
        { type: ConnectorType.ccs2, powerKw: 60.0, totalCount: 4, availableCount: 3, status: 'available' },
        { type: ConnectorType.type2_ac, powerKw: 22.0, totalCount: 2, availableCount: 2, status: 'available' }
      ]
    },
    {
      name: 'ChargeZone – Taj Skyline Hub',
      lat: 23.0610, lng: 72.5025,
      address: 'Frizbee / Taj Skyline, Thaltej, Ahmedabad',
      operatorId: operatorChargeZone.id,
      provider: PowerProvider.torrent_power,
      connectors: [
        { type: ConnectorType.ccs2, powerKw: 60.0, totalCount: 2, availableCount: 1, status: 'available' }
      ]
    },
    {
      name: 'ChargeZone – Renaissance Hotel',
      lat: 23.0782, lng: 72.5301,
      address: 'Behind Ganesh Meridian, Sola Rd / SG Highway, Ahmedabad',
      operatorId: operatorChargeZone.id,
      provider: PowerProvider.torrent_power,
      connectors: [
        { type: ConnectorType.ccs2, powerKw: 60.0, totalCount: 2, availableCount: 2, status: 'available' }
      ]
    },
    {
      name: 'Tata Power – Nexus Ahmedabad One Mall',
      lat: 23.0398, lng: 72.5312,
      address: 'Basement Parking, Vastrapur, Ahmedabad',
      operatorId: operatorTata.id,
      provider: PowerProvider.tata_power,
      connectors: [
        { type: ConnectorType.ccs2, powerKw: 30.0, totalCount: 2, availableCount: 1, status: 'available' },
        { type: ConnectorType.type2_ac, powerKw: 7.4, totalCount: 2, availableCount: 2, status: 'available' }
      ]
    },
    {
      name: 'AMC Multilevel Parking – Navrangpura',
      lat: 23.0392, lng: 72.5601,
      address: 'Navrangpura Bus Stand, CG Road, Ahmedabad',
      operatorId: operatorStatiq.id,
      provider: PowerProvider.guvnl_gb,
      connectors: [
        { type: ConnectorType.ccs2, powerKw: 50.0, totalCount: 1, availableCount: 1, status: 'available' },
        { type: ConnectorType.chademo, powerKw: 50.0, totalCount: 1, availableCount: 1, status: 'available' },
        { type: ConnectorType.bharat_ac_001, powerKw: 3.3, totalCount: 2, availableCount: 2, status: 'available' }
      ]
    },
    {
      name: 'Jio-bp Pulse – SG Highway Pump',
      lat: 23.1092, lng: 72.5385,
      address: 'Near Gota Cross Road / Chharodi, Ahmedabad',
      operatorId: operatorJioBp.id,
      provider: PowerProvider.torrent_power,
      connectors: [
        { type: ConnectorType.ccs2, powerKw: 60.0, totalCount: 2, availableCount: 1, status: 'available' },
        { type: ConnectorType.type2_ac, powerKw: 22.0, totalCount: 1, availableCount: 1, status: 'available' }
      ]
    },
    {
      name: 'Torrent Power – Anand Nagar / Prahlad Nagar',
      lat: 23.0118, lng: 72.5115,
      address: 'Near Anand Nagar Cross Rd, Ahmedabad',
      operatorId: operatorStatiq.id,
      provider: PowerProvider.torrent_power,
      connectors: [
        { type: ConnectorType.ccs2, powerKw: 60.0, totalCount: 1, availableCount: 1, status: 'available' },
        { type: ConnectorType.ccs2, powerKw: 30.0, totalCount: 1, availableCount: 1, status: 'available' },
        { type: ConnectorType.bharat_ac_001, powerKw: 3.3, totalCount: 2, availableCount: 2, status: 'available' }
      ]
    },
    {
      name: 'ChargeZone – BMW Sarkhej',
      lat: 22.9985, lng: 72.4950,
      address: 'Sarkhej-Sanand Cross Road, SG Highway, Ahmedabad',
      operatorId: operatorChargeZone.id,
      provider: PowerProvider.torrent_power,
      connectors: [
        { type: ConnectorType.ccs2, powerKw: 60.0, totalCount: 2, availableCount: 2, status: 'available' }
      ]
    },
    {
      name: 'ChargeZone – Maninagar Hub',
      lat: 22.9980, lng: 72.6045,
      address: 'Planet House, Near Radhe Circle / Anupam Cinema, Ahmedabad',
      operatorId: operatorChargeZone.id,
      provider: PowerProvider.torrent_power,
      connectors: [
        { type: ConnectorType.ccs2, powerKw: 30.0, totalCount: 2, availableCount: 1, status: 'available' },
        { type: ConnectorType.type2_ac, powerKw: 22.0, totalCount: 2, availableCount: 1, status: 'available' }
      ]
    },
    {
      name: 'IOCL EV Station – Airport Circle',
      lat: 23.0760, lng: 72.6240,
      address: 'Hansol / Sardar Vallabhbhai Patel Airport Rd, Ahmedabad',
      operatorId: operatorStatiq.id,
      provider: PowerProvider.guvnl_gb,
      connectors: [
        { type: ConnectorType.ccs2, powerKw: 30.0, totalCount: 1, availableCount: 1, status: 'available' },
        { type: ConnectorType.bharat_ac_001, powerKw: 3.3, totalCount: 2, availableCount: 2, status: 'available' }
      ]
    },
    {
      name: 'Ather Space & Grid – Bodakdev',
      lat: 23.0365, lng: 72.5150,
      address: 'Sindhu Bhavan Marg, Ahmedabad',
      operatorId: operatorAther.id,
      provider: PowerProvider.torrent_power,
      connectors: [
        { type: ConnectorType.type2_ac, powerKw: 7.4, totalCount: 2, availableCount: 2, status: 'available' },
        { type: ConnectorType.three_pin, powerKw: 3.3, totalCount: 2, availableCount: 2, status: 'available' }
      ]
    },
    {
      name: 'Ather Grid – Stadium Cross Road',
      lat: 23.0346, lng: 72.5562,
      address: 'CG Road, Navrangpura, Ahmedabad',
      operatorId: operatorAther.id,
      provider: PowerProvider.torrent_power,
      connectors: [
        { type: ConnectorType.type2_ac, powerKw: 7.4, totalCount: 2, availableCount: 2, status: 'available' }
      ]
    }
  ];

  for (const st of stations) {
    await prisma.station.create({
      data: {
        name: st.name,
        operatorId: st.operatorId,
        zoneId: zoneWest.id,
        provider: st.provider,
        lat: st.lat,
        lng: st.lng,
        address: st.address,
        isActive: true,
        connectors: {
          create: st.connectors
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
      }
    });
  }
  console.log('✅ Added 15 Ahmedabad stations successfully.');
};
