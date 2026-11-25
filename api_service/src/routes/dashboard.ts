import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth.js'

export const dashboardRouter = Router()
dashboardRouter.use(requireAuth)

dashboardRouter.get('/', async (_request, response) => {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const [activeUsers, totalTasks, completedTasks, recentActivity, metrics] = await Promise.all([
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.task.count(),
    prisma.task.count({ where: { status: 'DONE' } }),
    prisma.activityLog.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { username: true, email: true } } },
    }),
    prisma.dashboardMetric.findMany({ where: { periodEnd: { gte: monthStart } }, orderBy: { periodEnd: 'asc' } }),
  ])
  return response.json({
    summary: { activeUsers, totalTasks, completedTasks },
    metrics: metrics.map((metric) => ({ ...metric, value: Number(metric.value) })),
    recentActivity,
  })
})

const metricSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.coerce.number(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  metadata: z.record(z.string(), z.string()).optional(),
})

dashboardRouter.put('/metrics', requireRole('SUPERADMIN', 'ADMIN', 'MANAGER'), async (request, response) => {
  const result = metricSchema.safeParse(request.body)
  if (!result.success) return response.status(400).json({ message: 'Invalid metric.', issues: result.error.issues })
  const { user } = request as AuthenticatedRequest
  const metric = await prisma.dashboardMetric.upsert({
    where: {
      key_periodStart_periodEnd: {
        key: result.data.key,
        periodStart: result.data.periodStart,
        periodEnd: result.data.periodEnd,
      },
    },
    create: result.data,
    update: { value: result.data.value, metadata: result.data.metadata },
  })
  await prisma.activityLog.create({ data: { action: 'upserted', entity: 'dashboard_metric', entityId: metric.id, userId: user.id } })
  return response.json({ metric: { ...metric, value: Number(metric.value) } })
})
