import {
  DatabaseBackupIcon,
  Disc3Icon,
  LayoutDashboardIcon,
  LibraryIcon,
  ListMusicIcon,
  Share2Icon,
  TableIcon,
  UsersIcon,
} from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router'
import { Logo } from '@/components/Logo'
import { Toaster } from '@/components/ui/sonner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboardIcon },
  { to: '/episodes', label: 'Episoden', icon: ListMusicIcon },
  { to: '/setlists', label: 'Setlisten', icon: TableIcon },
  { to: '/artists', label: 'Künstler', icon: UsersIcon },
  { to: '/albums', label: 'Alben', icon: LibraryIcon },
  { to: '/tracks', label: 'Tracks', icon: Disc3Icon },
  { to: '/output-channels', label: 'Ausgabekanäle', icon: Share2Icon },
  { to: '/backup', label: 'Backup', icon: DatabaseBackupIcon },
]

function SidebarBrand() {
  const { state, isMobile } = useSidebar()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-col items-center gap-1 px-1 pt-6 pb-1">
          <Logo className="h-auto w-2/3" />
          <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">
            SetLister
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" align="center" hidden={state !== 'collapsed' || isMobile}>
        SetLister
      </TooltipContent>
    </Tooltip>
  )
}

function App() {
  const location = useLocation()

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarBrand />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const isActive =
                      item.to === '/'
                        ? location.pathname === '/'
                        : location.pathname.startsWith(item.to)
                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                          <Link to={item.to}>
                            <item.icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <header className="flex items-center gap-2 border-b px-4 py-3">
            <SidebarTrigger />
          </header>

          <main className="w-full flex-1 px-4 py-6">
            <Outlet />
          </main>

          <footer className="border-t px-4 py-3 text-center text-xs text-muted-foreground">
            SetLister v{__APP_VERSION__}
          </footer>
        </SidebarInset>

        <Toaster />
      </SidebarProvider>
    </TooltipProvider>
  )
}

export default App
