
import { Outlet } from 'react-router-dom'
import { Header } from '@/components/dashboard/Header'

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Header />
      <main className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
