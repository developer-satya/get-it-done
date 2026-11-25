export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

export type AuthenticatedUser = {
  id: string
  firstName: string
  lastName: string
  username: string
  email: string
  role: string
  status: string
  createdAt: string
}

export type DatabaseUser = AuthenticatedUser & {
  phoneNumber: string | null
  updatedAt: string
}

export type UserInput = {
  firstName: string
  lastName: string
  username: string
  email: string
  phoneNumber?: string | null
  password?: string
  role: string
  status?: string
}

type ApiTask = {
  id: string
  taskNumber: number
  title: string
  description: string | null
  status: string
  priority: string
  label: string
  dueDate: string | null
}

export type TaskInput = {
  title: string
  status?: string
  priority?: string
  label?: string
  description?: string | null
  dueDate?: string | null
  assigneeId?: string | null
}

type ApiSettings = Record<string, unknown>

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (response.status === 204) return undefined as T
  const body = (await response.json().catch(() => ({}))) as { message?: string } & T
  if (!response.ok) throw new ApiError(body.message ?? 'Request failed.', response.status)
  return body
}

export const api = {
  signIn: (email: string, password: string) =>
    request<{ user: AuthenticatedUser }>('/auth/sign-in', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signUp: (email: string, password: string) =>
    request<{ user: AuthenticatedUser }>('/auth/sign-up', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signOut: () => request<void>('/auth/sign-out', { method: 'POST' }),
  me: () => request<{ user: AuthenticatedUser }>('/auth/me'),
  dashboard: () => request<{ summary: { activeUsers: number; totalTasks: number; completedTasks: number }; metrics: { key: string; value: number }[] }>('/dashboard'),
  tasks: () => request<{ tasks: ApiTask[] }>('/tasks'),
  createTask: (task: TaskInput) => request<{ task: ApiTask }>('/tasks', { method: 'POST', body: JSON.stringify(task) }),
  updateTask: (id: string, task: Partial<TaskInput>) => request<{ task: ApiTask }>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(task) }),
  deleteTask: (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
  users: () => request<{ users: DatabaseUser[] }>('/users'),
  createUser: (user: UserInput) => request<{ user: DatabaseUser }>('/users', { method: 'POST', body: JSON.stringify(user) }),
  updateUser: (id: string, user: Partial<UserInput>) => request<{ user: DatabaseUser }>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(user) }),
  deleteUser: (id: string) => request<void>(`/users/${id}`, { method: 'DELETE' }),
  settings: () => request<{ profile: AuthenticatedUser; settings: ApiSettings }>('/settings'),
  updateSettings: (settings: ApiSettings) => request<{ settings: ApiSettings }>('/settings', { method: 'PUT', body: JSON.stringify(settings) }),
}
