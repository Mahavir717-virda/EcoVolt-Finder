import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'mahavir@gmail.com';
  const plainPassword = 'Mahavir123';
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  // 1. Upsert User
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: Role.manager,
      name: 'Mahavir Virda',
    },
    create: {
      email,
      name: 'Mahavir Virda',
      role: Role.manager,
      passwordHash,
    },
  });

  console.log(`✅ User created/updated: ${user.email} (Role: ${user.role}, ID: ${user.id})`);

  // 2. Upsert Operator for Manager Hub
  const existingOperator = await prisma.operator.findFirst({
    where: { userId: user.id },
  });

  if (!existingOperator) {
    const operator = await prisma.operator.create({
      data: {
        userId: user.id,
        name: 'Mahavir EV Charging Network',
        contactEmail: email,
      },
    });
    console.log(`✅ Operator Hub created for manager: ${operator.name} (ID: ${operator.id})`);
  } else {
    console.log(`ℹ️ Operator Hub already exists: ${existingOperator.name}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error creating manager user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
