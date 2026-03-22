import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Toaster } from '@/components/ui/toaster'

export function Layout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f8fafc]">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}
