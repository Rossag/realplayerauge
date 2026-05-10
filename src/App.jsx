import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth.jsx'
import { useNotifications } from './lib/notifications.js'
import Layout from './components/Layout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import StatusPage from './pages/StatusPage.jsx'
import LogPage from './pages/LogPage.jsx'
import TimelinePage from './pages/TimelinePage.jsx'
import InsightsPage from './pages/InsightsPage.jsx'
import GuildPage from './pages/GuildPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import MorningCheckin from './pages/MorningCheckin.jsx'
import EveningCheckin from './pages/EveningCheckin.jsx'
import QuestsPage from './pages/QuestsPage.jsx'

const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#0d0a06', flexDirection: 'column', gap: 16 }}>
    <div style={{ width: 32, height: 32, border: '2px solid #c9a84c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <p style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: '#5a4520', letterSpacing: '0.12em' }}>ENTERING THE REALM…</p>
  </div>
)

export default function App() {
  const { session } = useAuth()
  useNotifications(session)

  if (session === undefined) return <Spinner />

  if (!session) return (
    <Routes>
      <Route path="*" element={<LoginPage />} />
    </Routes>
  )

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<StatusPage />} />
        <Route path="/log" element={<LogPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/guild" element={<GuildPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/morning-checkin" element={<MorningCheckin />} />
        <Route path="/evening-checkin" element={<EveningCheckin />} />
        <Route path="/quests" element={<QuestsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
