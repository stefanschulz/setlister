import { createBrowserRouter } from 'react-router'
import App from '@/App'
import DashboardPage from '@/pages/DashboardPage'
import EpisodesPage from '@/pages/EpisodesPage'
import EpisodePlaylistPage from '@/pages/EpisodePlaylistPage'
import ArtistsPage from '@/pages/ArtistsPage'
import AlbumsPage from '@/pages/AlbumsPage'
import TracksPage from '@/pages/TracksPage'
import OutputChannelsPage from '@/pages/OutputChannelsPage'
import SetlistsPage from '@/pages/SetlistsPage'
import BackupPage from '@/pages/BackupPage'

// A data router (rather than plain <BrowserRouter>) is required for
// useBlocker, which EpisodePlaylistPage uses to guard unsaved changes.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'episodes', element: <EpisodesPage /> },
      { path: 'episodes/:id', element: <EpisodePlaylistPage /> },
      { path: 'setlists', element: <SetlistsPage /> },
      { path: 'artists', element: <ArtistsPage /> },
      { path: 'albums', element: <AlbumsPage /> },
      { path: 'tracks', element: <TracksPage /> },
      { path: 'output-channels', element: <OutputChannelsPage /> },
      { path: 'backup', element: <BackupPage /> },
    ],
  },
])
