import { Outlet, NavLink } from 'react-router-dom'

const navItems = [
  { to: '/',         icon: '⚔️',  label: 'Status'   },
  { to: '/log',      icon: '📜',  label: 'Log'       },
  { to: '/quests',   icon: '🎯',  label: 'Quests'    },
  { to: '/guild',    icon: '🛡️', label: 'Guild'     },
  { to: '/profile',  icon: '👤',  label: 'Profile'   },
]

export default function Layout() {
  return (
    <div className="flex flex-col h-full" style={{ background: '#0d0a06' }}>
      <main className="flex-1 overflow-y-auto no-scrollbar pb-16">
        <Outlet />
      </main>

      {/* Bottom navigation — always visible */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom"
        style={{ background: '#13100a', borderTop: '1px solid #3d2e10' }}>
        <div className="flex items-center justify-around max-w-lg mx-auto px-1" style={{ height: 58 }}>
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to} to={to} end={to === '/'}
              className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all"
              style={({ isActive }) => ({ color: isActive ? '#c9a84c' : '#4a3e28' })}
            >
              {({ isActive }) => (
                <>
                  <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
                  <span style={{
                    fontSize: 9, fontFamily: 'Cinzel, serif', letterSpacing: '0.08em',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#c9a84c' : '#4a3e28',
                  }}>{label}</span>
                  {isActive && <div style={{ width: 16, height: 1, background: '#c9a84c', borderRadius: 1, opacity: 0.8 }} />}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
