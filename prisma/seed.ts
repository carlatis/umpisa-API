import 'dotenv/config';
import { PrismaClient, Priority, Severity, TaskStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();
const demoPassword = 'Password123!';

type SeedTask = {
  title: string;
  status: TaskStatus;
  priority: Priority;
  severity: Severity;
};

async function seedProject(
  ownerId: string,
  project: { name: string; description: string; tasks: SeedTask[] },
) {
  const existing = await db.project.findFirst({
    where: { ownerId, name: project.name },
    select: { id: true },
  });

  if (existing) {
    await db.project.update({
      where: { id: existing.id },
      data: {
        description: project.description,
        tasks: {
          deleteMany: {},
          create: project.tasks,
        },
      },
    });

    return;
  }

  await db.project.create({
    data: {
      name: project.name,
      description: project.description,
      ownerId,
      tasks: { create: project.tasks },
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  await db.user.upsert({
    where: { email: 'admin@umpisa.dev' },
    update: {
      name: 'Umpisa Administrator',
      passwordHash,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    },
    create: {
      name: 'Umpisa Administrator',
      email: 'admin@umpisa.dev',
      passwordHash,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    },
  });

  const demoUser = await db.user.upsert({
    where: { email: 'demo@umpisa.dev' },
    update: {
      name: 'Demo User',
      passwordHash,
      createdAt: new Date('2024-01-02T00:00:00.000Z'),
    },
    create: {
      name: 'Demo User',
      email: 'demo@umpisa.dev',
      passwordHash,
      createdAt: new Date('2024-01-02T00:00:00.000Z'),
    },
  });

  await db.project.deleteMany({
    where: {
      ownerId: demoUser.id,
      name: 'Analytical Dashboard',
    },
  });

  await seedProject(demoUser.id, {
    name: 'Website Launch',
    description: 'Plan and deliver the new Umpisa Inc. marketing website.',
    tasks: [
      {
        title: 'Confirm website requirements',
        status: TaskStatus.DONE,
        priority: Priority.HIGH,
        severity: Severity.MAJOR,
      },
      {
        title: 'Create page wireframes',
        status: TaskStatus.DONE,
        priority: Priority.MEDIUM,
        severity: Severity.MINOR,
      },
      {
        title: 'Build responsive landing page',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        severity: Severity.CRITICAL,
      },
      {
        title: 'Integrate contact form',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.MEDIUM,
        severity: Severity.MAJOR,
      },
      {
        title: 'Complete accessibility review',
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        severity: Severity.MAJOR,
      },
      {
        title: 'Run production release checklist',
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
        severity: Severity.CRITICAL,
      },
    ],
  });

  await seedProject(demoUser.id, {
    name: 'Customer Portal',
    description: 'Deliver the first secure customer self-service portal.',
    tasks: [
      {
        title: 'Define portal user journeys',
        status: TaskStatus.DONE,
        priority: Priority.HIGH,
        severity: Severity.MAJOR,
      },
      {
        title: 'Design account dashboard',
        status: TaskStatus.DONE,
        priority: Priority.MEDIUM,
        severity: Severity.MINOR,
      },
      {
        title: 'Implement account authentication',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        severity: Severity.CRITICAL,
      },
      {
        title: 'Connect customer profile API',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        severity: Severity.MAJOR,
      },
      {
        title: 'Prepare security test cases',
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
        severity: Severity.CRITICAL,
      },
      {
        title: 'Document support handover',
        status: TaskStatus.TODO,
        priority: Priority.LOW,
        severity: Severity.MINOR,
      },
    ],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
