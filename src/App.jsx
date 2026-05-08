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

export default function App() {
  const { session } = useAuth()
  useNotifications(session)

  // Still checking session
  if (session === undefined) {
    return (
      <div className="flex items-center justify-center h-full bg-bg-primary">
        <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Not logged in — show login
  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }

  // Logged in — show the app
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
