import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Network Admin user & initial audit logs...');

  const email = 'admin@ecovolt.in';
  const plainPassword = 'Admin123';
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  // 1. Upsert Admin User
  const adminUser = await prisma.user.upsert({
    where: { email },
    update: {
      role: Role.admin,
      passwordHash,
      name: 'System Network Administrator',
    },
    create: {
      email,
      name: 'System Network Administrator',
      role: Role.admin,
      passwordHash,
    },
  });

  console.log(`✅ Admin user ready: ${adminUser.email} (Role: ${adminUser.role}, ID: ${adminUser.id})`);

  // 2. Create initial audit log entries
  await prisma.auditLog.createMany({
    data: [
      {
        adminId: adminUser.id,
        action: 'SYSTEM_BOOTSTRAP',
        targetId: adminUser.id,
        reason: 'Initial platform deployment and admin governance setup',
      },
      {
        adminId: adminUser.id,
        action: 'STATION_REGISTRY_REVIEW',
        targetId: 'stn-network-all',
        reason: 'Routine compliance audit on 9 managed charging stations',
      },
      {
        adminId: adminUser.id,
        action: 'DATA_QUALITY_VERIFICATION',
        targetId: 'IN-WE',
        reason: 'Verified live grid source integration for Western India zone',
      },
    ],
  });

  console.log('✅ Initial permanent audit logs seeded.');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
