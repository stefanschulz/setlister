import { useEffect, useState } from 'react'
import './App.css'

type HealthStatus = { status: string }

function App() {
  const [health, setHealth] = useState<HealthStatus | 'loading' | 'error'>('loading')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data: HealthStatus) => setHealth(data))
      .catch(() => setHealth('error'))
  }, [])

  return (
    <main>
      <h1>SetLister</h1>
      <p>Podcast Sendungsverwaltung</p>
      <p>
        API-Status:{' '}
        {health === 'loading' ? '…' : health === 'error' ? 'nicht erreichbar' : health.status}
      </p>
    </main>
  )
}

export default App
