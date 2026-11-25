import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import { Prisma } from '@prisma/client'
import { authRouter } from './routes/auth.js'
import { dashboardRouter } from './routes/dashboard.js'
import { settingsRouter } from './routes/settings.js'
import { tasksRouter } from './routes/tasks.js'
import { usersRouter } from './routes/users.js'

const app = express()
const port = Number(process.env.PORT ?? 3001)

app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))
app.use('/api/auth', authRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/users', usersRouter)
app.use('/api/settings', settingsRouter)

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    return response.status(404).json({ message: 'Record not found.' })
  }
  // Do not send implementation details to clients.
  console.error(error)
  return response.status(500).json({ message: 'Unexpected server error.' })
})

app.listen(port, '0.0.0.0', () => console.log(`API listening on http://0.0.0.0:${port}`))
