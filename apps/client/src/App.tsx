import { Route, Routes } from 'react-router'
import { NavLink } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import ArtistsPage from '@/pages/ArtistsPage'
import AlbumsPage from '@/pages/AlbumsPage'
import TracksPage from '@/pages/TracksPage'

const navItems = [
  { to: '/artists', label: 'Künstler' },
  { to: '/albums', label: 'Alben' },
  { to: '/tracks', label: 'Tracks' },
]

function App() {
  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-3">
          <span className="font-semibold">SetLister</span>
          <nav className="flex gap-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'text-sm text-muted-foreground hover:text-foreground',
                    isActive && 'font-medium text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <Routes>
          <Route path="/" element={<ArtistsPage />} />
          <Route path="/artists" element={<ArtistsPage />} />
          <Route path="/albums" element={<AlbumsPage />} />
          <Route path="/tracks" element={<TracksPage />} />
        </Routes>
      </main>

      <Toaster />
    </div>
  )
}

export default App
