import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

export const settingsRouter = Router()
settingsRouter.use(requireAuth)

const profileSchema = z.object({
  firstName: z.string().max(80).optional(),
  lastName: z.string().max(80).optional(),
  username: z.string().min(2).max(30).optional(),
  email: z.email().optional(),
  bio: z.string().max(160).nullable().optional(),
  urls: z.array(z.string().url()).max(10).optional(),
})

const settingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  font: z.string().max(80).optional(),
  direction: z.enum(['ltr', 'rtl']).optional(),
  layout: z.string().max(40).optional(),
  sidebarState: z.boolean().optional(),
  notificationType: z.enum(['all', 'mentions', 'none']).optional(),
  mobileNotifications: z.boolean().optional(),
  communicationEmails: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  socialEmails: z.boolean().optional(),
  securityEmails: z.boolean().optional(),
})

settingsRouter.get('/', async (request, response) => {
  const { user } = request as AuthenticatedRequest
  const [account, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, firstName: true, lastName: true, username: true, email: true, bio: true, urls: true },
    }),
    prisma.userSettings.findUnique({ where: { userId: user.id } }),
  ])
  return response.json({ profile: account, settings })
})

settingsRouter.put('/profile', async (request, response) => {
  const result = profileSchema.safeParse(request.body)
  if (!result.success) return response.status(400).json({ message: 'Invalid profile.', issues: result.error.issues })
  const { user } = request as AuthenticatedRequest
  const profile = await prisma.user.update({ where: { id: user.id }, data: result.data }).catch(() => null)
  if (!profile) return response.status(409).json({ message: 'Username or email is already in use.' })
  await prisma.activityLog.create({ data: { action: 'updated', entity: 'profile', entityId: user.id, userId: user.id } })
  return response.json({ profile })
})

settingsRouter.put('/', async (request, response) => {
  const result = settingsSchema.safeParse(request.body)
  if (!result.success) return response.status(400).json({ message: 'Invalid settings.', issues: result.error.issues })
  const { user } = request as AuthenticatedRequest
  const settings = await prisma.userSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...result.data },
    update: result.data,
  })
  return response.json({ settings })
})
