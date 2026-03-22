import { NavLink, useLocation } from 'react-router-dom'
import { MessageSquare, Files, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  end?: boolean
}

const navItems: NavItem[] = [
  { to: '/', icon: MessageSquare, label: 'Chat', end: true },
  { to: '/documents', icon: Files, label: 'Documents' },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="flex h-screen w-56 flex-col flex-shrink-0 bg-[#0f172a] border-r border-[#1e293b]">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-[18px] border-b border-[#1e293b]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div className="leading-none">
          <div className="text-[15px] font-semibold tracking-tight text-white">
            ranything
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-mono tracking-widest uppercase">
            RAG Platform
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        <p className="px-2 pt-1 pb-2 text-[10px] font-mono uppercase tracking-widest text-slate-600">
          Menu
        </p>
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-[#1e293b] hover:text-slate-200'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-white' : 'text-slate-500')} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#1e293b] px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[10px] text-slate-500 tracking-wider">
            {location.pathname === '/' ? 'chat' : location.pathname.replace('/', '')} · online
          </span>
        </div>
      </div>
    </aside>
  )
}
