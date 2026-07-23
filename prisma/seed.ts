import 'dotenv/config';
import { PrismaClient, Priority, Severity, TaskStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
const db = new PrismaClient();
async function main() {
  const user = await db.user.upsert({
    where: { email: 'demo@umpisa.dev' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@umpisa.dev',
      passwordHash: await bcrypt.hash('Password123!', 12),
    },
  });
  const existing = await db.project.findFirst({
    where: { ownerId: user.id, name: 'Website Launch' },
  });
  if (!existing)
    await db.project.create({
      data: {
        name: 'Website Launch',
        description: 'Plan and deliver the new marketing site.',
        ownerId: user.id,
        tasks: {
          create: [
            {
              title: 'Create wireframes',
              status: TaskStatus.DONE,
              priority: Priority.HIGH,
              severity: Severity.MAJOR,
            },
            {
              title: 'Build landing page',
              status: TaskStatus.IN_PROGRESS,
              priority: Priority.HIGH,
              severity: Severity.CRITICAL,
            },
            {
              title: 'QA and release',
              status: TaskStatus.TODO,
              priority: Priority.MEDIUM,
              severity: Severity.MINOR,
            },
          ],
        },
      },
    });
}
main().finally(() => db.$disconnect());
