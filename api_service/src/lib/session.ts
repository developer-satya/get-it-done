import crypto from 'node:crypto'
import type { Response } from 'express'
import { prisma } from './prisma.js'

const COOKIE_NAME = 'shadcn_admin_session'
const SESSION_DAYS = 7
const configuredSessionSecret = process.env.SESSION_SECRET
const cookieSecure = process.env.COOKIE_SECURE === 'true'

if (!configuredSessionSecret) {
  throw new Error('SESSION_SECRET must be set before starting the API.')
}
const sessionSecret: string = configuredSessionSecret

export function hashToken(token: string) {
  return crypto.createHmac('sha256', sessionSecret).update(token).digest('hex')
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  })
  return { token, expiresAt }
}

export function setSessionCookie(
  response: Response,
  token: string,
  expiresAt: Date
) {
  response.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    // Use true only when Apache/Ingress terminates HTTPS. A Secure cookie is
    // correctly rejected by browsers when the application is served over HTTP.
    secure: cookieSecure,
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(COOKIE_NAME, { path: '/' })
}

export async function deleteSession(token?: string) {
  if (!token) return
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } })
}

export { COOKIE_NAME }
