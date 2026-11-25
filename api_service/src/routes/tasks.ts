import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

export const tasksRouter = Router()
tasksRouter.use(requireAuth)

const taskInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(10_000).nullable().optional(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE', 'CANCELED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  label: z.enum(['BUG', 'FEATURE', 'DOCUMENTATION']).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  assigneeId: z.string().cuid().nullable().optional(),
})

tasksRouter.get('/', async (_request, response) => {
  const tasks = await prisma.task.findMany({
    include: { assignee: { select: { id: true, username: true, email: true } }, creator: { select: { id: true, username: true } } },
    orderBy: { updatedAt: 'desc' },
  })
  return response.json({ tasks })
})

tasksRouter.post('/', async (request, response) => {
  const result = taskInput.safeParse(request.body)
  if (!result.success) return response.status(400).json({ message: 'Invalid task.', issues: result.error.issues })
  const { user } = request as unknown as AuthenticatedRequest
  const task = await prisma.task.create({ data: { ...result.data, creatorId: user.id } })
  await prisma.activityLog.create({ data: { action: 'created', entity: 'task', entityId: task.id, userId: user.id } })
  return response.status(201).json({ task })
})

tasksRouter.patch('/:id', async (request, response) => {
  const result = taskInput.partial().safeParse(request.body)
  if (!result.success) return response.status(400).json({ message: 'Invalid task update.', issues: result.error.issues })
  const { user } = request as unknown as AuthenticatedRequest
  const task = await prisma.task.update({ where: { id: request.params.id }, data: result.data }).catch(() => null)
  if (!task) return response.status(404).json({ message: 'Task not found.' })
  await prisma.activityLog.create({ data: { action: 'updated', entity: 'task', entityId: task.id, userId: user.id } })
  return response.json({ task })
})

tasksRouter.delete('/:id', async (request, response) => {
  const { user } = request as unknown as AuthenticatedRequest
  const task = await prisma.task.delete({ where: { id: request.params.id } }).catch(() => null)
  if (!task) return response.status(404).json({ message: 'Task not found.' })
  await prisma.activityLog.create({ data: { action: 'deleted', entity: 'task', entityId: task.id, userId: user.id } })
  return response.status(204).send()
})
