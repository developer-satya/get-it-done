import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  setSessionCookie,
} from '../lib/session.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

export const authRouter = Router()

const credentialsSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  username: z.string().min(2).max(30).regex(/^[a-zA-Z0-9._-]+$/).optional(),
})

const publicUser = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
} as const

authRouter.post('/sign-up', async (request, response) => {
  const result = credentialsSchema.safeParse(request.body)
  if (!result.success) return response.status(400).json({ message: 'Invalid sign-up data.', issues: result.error.issues })

  const { email, password, username } = result.data
  const exists = await prisma.user.findFirst({
    where: { OR: [{ email }, ...(username ? [{ username }] : [])] },
  })
  if (exists) return response.status(409).json({ message: 'An account already uses this email.' })

  const userCount = await prisma.user.count()
  const user = await prisma.user.create({
    data: {
      email,
      username: username ?? email.split('@')[0],
      passwordHash: await bcrypt.hash(password, 12),
      role: userCount === 0 ? 'SUPERADMIN' : 'USER',
      settings: { create: {} },
    },
    select: publicUser,
  })
  await prisma.activityLog.create({ data: { action: 'created', entity: 'user', entityId: user.id, userId: user.id } })
  const session = await createSession(user.id)
  setSessionCookie(response, session.token, session.expiresAt)
  return response.status(201).json({ user })
})

authRouter.post('/sign-in', async (request, response) => {
  const result = credentialsSchema.pick({ email: true, password: true }).safeParse(request.body)
  if (!result.success) return response.status(400).json({ message: 'Invalid sign-in data.' })
  const user = await prisma.user.findUnique({ where: { email: result.data.email } })
  if (!user || user.status !== 'ACTIVE' || !(await bcrypt.compare(result.data.password, user.passwordHash))) {
    return response.status(401).json({ message: 'Invalid email or password.' })
  }
  const session = await createSession(user.id)
  setSessionCookie(response, session.token, session.expiresAt)
  return response.json({
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    },
  })
})

authRouter.post('/sign-out', requireAuth, async (request, response) => {
  await deleteSession(request.cookies?.shadcn_admin_session as string | undefined)
  clearSessionCookie(response)
  return response.status(204).send()
})

authRouter.get('/me', requireAuth, async (request, response) => {
  const { user } = request as AuthenticatedRequest
  const account = await prisma.user.findUnique({ where: { id: user.id }, select: publicUser })
  return response.json({ user: account })
})
