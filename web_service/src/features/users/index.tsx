import { getRouteApi } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UsersDialogs } from './components/users-dialogs'
import { UsersPrimaryButtons } from './components/users-primary-buttons'
import { UsersProvider } from './components/users-provider'
import { UsersTable } from './components/users-table'
import { type User } from './data/schema'

const route = getRouteApi('/_authenticated/users/')

export function Users() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, error, isError } = useQuery({
    queryKey: ['users'],
    queryFn: api.users,
  })
  const isForbidden = error instanceof ApiError && error.status === 403
  const users: User[] = (data?.users ?? []).map((user) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    phoneNumber: user.phoneNumber ?? '',
    status: user.status.toLowerCase() as User['status'],
    role: user.role.toLowerCase() as User['role'],
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  }))

  return (
    <UsersProvider>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>User List</h2>
            <p className='text-muted-foreground'>
              Manage your users and their roles here.
            </p>
          </div>
          {!isError && <UsersPrimaryButtons />}
        </div>
        {isError ? (
          <Alert variant={isForbidden ? 'default' : 'destructive'}>
            <AlertTitle>
              {isForbidden ? 'Not authorized to view users' : 'Unable to load users'}
            </AlertTitle>
            <AlertDescription>
              {isForbidden
                ? 'Your account does not have permission to view or manage the user directory. Please sign in with an Administrator, Manager, or Superadmin account.'
                : error instanceof Error
                  ? error.message
                  : 'The user directory could not be loaded. Please try again.'}
            </AlertDescription>
          </Alert>
        ) : (
          <UsersTable data={users} search={search} navigate={navigate} />
        )}
      </Main>

      <UsersDialogs />
    </UsersProvider>
  )
}
