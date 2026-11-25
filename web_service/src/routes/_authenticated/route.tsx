
import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { ApiError, api } from '@/lib/api'

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
  beforeLoad: async ({ context, location }) => {
    try {
      return await context.queryClient.fetchQuery({
        queryKey: ['auth', 'me'],
        queryFn: api.me,
        staleTime: 60_000,
      })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw redirect({
          to: '/sign-in',
          search: { redirect: location.href },
        })
      }
      throw error
    }
  },
})
