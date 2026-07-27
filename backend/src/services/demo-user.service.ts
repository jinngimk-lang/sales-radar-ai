import { DEMO_USER } from '../config/demo-user.js'
import { prisma } from '../prisma/client.js'

export function ensureDemoUser() {
  return prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: {},
    create: DEMO_USER,
  })
}
