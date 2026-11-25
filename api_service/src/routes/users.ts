import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth.js'

export const usersRouter = Router()
usersRouter.use(requireAuth, requireRole('SUPERADMIN', 'ADMIN', 'MANAGER'))

const publicUser = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
  email: true,
  phoneNumber: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const

const userCreate = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  username: z.string().min(2).max(30).regex(/^[a-zA-Z0-9._-]+$/),
  email: z.email().transform((value) => value.toLowerCase()),
  phoneNumber: z.string().max(40).nullable().optional(),
  password: z.string().min(8).max(128),
  role: z.enum(['SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'USER']),
})

const userUpdate = z.object({
  firstName: z.string().max(80).optional(),
  lastName: z.string().max(80).optional(),
  username: z.string().min(2).max(30).optional(),
  phoneNumber: z.string().max(40).nullable().optional(),
  email: z.email().transform((value) => value.toLowerCase()).optional(),
  password: z.string().min(8).max(128).optional(),
  role: z.enum(['SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'USER']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'INVITED', 'SUSPENDED']).optional(),
})

usersRouter.get('/', async (_request, response) => {
  const users = await prisma.user.findMany({
    select: publicUser,
    orderBy: { createdAt: 'desc' },
  })
  return response.json({ users })
})

usersRouter.post('/', async (request, response) => {
  const result = userCreate.safeParse(request.body)
  if (!result.success) {
    const issue = result.error.issues[0]
    const field = issue?.path.join('.') || 'user data'
    return response.status(400).json({
      message: `${field}: ${issue?.message || 'Invalid value.'}`,
      issues: result.error.issues,
    })
  }

  const data = result.data
  const exists = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { username: data.username }] },
  })
  if (exists) return response.status(409).json({ message: 'An account already uses this email or username.' })

  const { user: actor } = request as unknown as AuthenticatedRequest
  const user = await prisma.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      username: data.username,
      email: data.email,
      phoneNumber: data.phoneNumber || null,
      passwordHash: await bcrypt.hash(data.password, 12),
      role: data.role,
      settings: { create: {} },
    },
    select: publicUser,
  })
  await prisma.activityLog.create({ data: { action: 'created', entity: 'user', entityId: user.id, userId: actor.id } })
  return response.status(201).json({ user })
})

usersRouter.patch('/:id', async (request, response) => {
  const result = userUpdate.safeParse(request.body)
  if (!result.success) return response.status(400).json({ message: 'Invalid user update.', issues: result.error.issues })
  const { user } = request as unknown as AuthenticatedRequest
  const data = result.data
  if (data.email || data.username) {
    const conflict = await prisma.user.findFirst({
      where: {
        id: { not: request.params.id },
        OR: [
          ...(data.email ? [{ email: data.email }] : []),
          ...(data.username ? [{ username: data.username }] : []),
        ],
      },
    })
    if (conflict) return response.status(409).json({ message: 'An account already uses this email or username.' })
  }
  const { password, ...userData } = data
  const updated = await prisma.user.update({
    where: { id: request.params.id },
    data: { ...userData, ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}) },
    select: publicUser,
  }).catch(() => null)
  if (!updated) return response.status(404).json({ message: 'User not found.' })
  await prisma.activityLog.create({ data: { action: 'updated', entity: 'user', entityId: updated.id, userId: user.id } })
  return response.json({ user: updated })
})

usersRouter.delete('/:id', async (request, response) => {
  const { user } = request as unknown as AuthenticatedRequest
  if (user.id === request.params.id) return response.status(400).json({ message: 'You cannot delete your own account.' })
  const deleted = await prisma.user.delete({ where: { id: request.params.id } }).catch(() => null)
  if (!deleted) return response.status(404).json({ message: 'User not found.' })
  await prisma.activityLog.create({ data: { action: 'deleted', entity: 'user', entityId: deleted.id, userId: user.id } })
  return response.status(204).send()
})
