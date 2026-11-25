import type { NextFunction, Request, Response } from 'express'
import { UserRole } from '@prisma/client'
import { COOKIE_NAME, hashToken } from '../lib/session.js'
import { prisma } from '../lib/prisma.js'

export type AuthenticatedRequest = Request & {
  user: { id: string; role: UserRole }
}

export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const token = request.cookies?.[COOKIE_NAME] as string | undefined
  if (!token) return response.status(401).json({ message: 'Authentication required.' })

  const session = await prisma.session.findFirst({
    where: { tokenHash: hashToken(token), expiresAt: { gt: new Date() } },
    include: { user: { select: { id: true, role: true, status: true } } },
  })
  if (!session || session.user.status !== 'ACTIVE') {
    return response.status(401).json({ message: 'Session is invalid or expired.' })
  }

  ;(request as AuthenticatedRequest).user = session.user
  return next()
}

export function requireRole(...roles: UserRole[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    const user = (request as AuthenticatedRequest).user
    if (!user || !roles.includes(user.role)) {
      return response.status(403).json({ message: 'Insufficient permissions.' })
    }
    return next()
  }
}
