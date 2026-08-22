import {
  Disc3Icon,
  LayoutDashboardIcon,
  LibraryIcon,
  ListMusicIcon,
  Share2Icon,
  UsersIcon,
} from 'lucide-react'
import { Link, Route, Routes, useLocation } from 'react-router'
import { Logo } from '@/components/Logo'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
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
} from '@/components/ui/sidebar'
import DashboardPage from '@/pages/DashboardPage'
import EpisodesPage from '@/pages/EpisodesPage'
import EpisodePlaylistPage from '@/pages/EpisodePlaylistPage'
import ArtistsPage from '@/pages/ArtistsPage'
import AlbumsPage from '@/pages/AlbumsPage'
import TracksPage from '@/pages/TracksPage'
import OutputChannelsPage from '@/pages/OutputChannelsPage'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboardIcon },
  { to: '/episodes', label: 'Episoden', icon: ListMusicIcon },
  { to: '/artists', label: 'Künstler', icon: UsersIcon },
  { to: '/albums', label: 'Alben', icon: LibraryIcon },
  { to: '/tracks', label: 'Tracks', icon: Disc3Icon },
  { to: '/output-channels', label: 'Ausgabekanäle', icon: Share2Icon },
]

function App() {
  const location = useLocation()

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2 py-1">
              <Logo className="size-6 shrink-0 text-sidebar-foreground" />
              <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">
                SetLister
              </span>
            </div>
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

          <main className="mx-auto w-full max-w-5xl px-4 py-6">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/episodes" element={<EpisodesPage />} />
              <Route path="/episodes/:id" element={<EpisodePlaylistPage />} />
              <Route path="/artists" element={<ArtistsPage />} />
              <Route path="/albums" element={<AlbumsPage />} />
              <Route path="/tracks" element={<TracksPage />} />
              <Route path="/output-channels" element={<OutputChannelsPage />} />
            </Routes>
          </main>
        </SidebarInset>

        <Toaster />
      </SidebarProvider>
    </TooltipProvider>
  )
}

export default App
