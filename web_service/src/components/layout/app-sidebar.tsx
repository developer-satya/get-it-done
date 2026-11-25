import { useLayout } from '@/context/layout-provider'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
// import { AppTitle } from './app-title'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { data } = useQuery({ queryKey: ['auth', 'me'], queryFn: api.me })
  const account = data?.user
  const name = [account?.firstName, account?.lastName]
    .filter(Boolean)
    .join(' ') || account?.username || 'User'
  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />

        {/* Replace <TeamSwitch /> with the following <AppTitle />
         /* if you want to use the normal app title instead of TeamSwitch dropdown */}
        {/* <AppTitle /> */}
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name, email: account?.email ?? '', avatar: '' }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
