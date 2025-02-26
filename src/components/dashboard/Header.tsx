
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavLinkProps {
  to: string
  current: boolean
  children: React.ReactNode
}

function NavLink({ to, current, children }: NavLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium",
        current
          ? "border-[#0A66C2] text-[#111827]"
          : "border-transparent text-[#4B5563] hover:border-[#E5E7EB] hover:text-[#111827]"
      )}
    >
      {children}
    </Link>
  )
}

function MobileNavLink({ to, current, children }: NavLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        "block pl-3 pr-4 py-2 border-l-4 text-base font-medium",
        current
          ? "bg-[#F0F9FF] border-[#0A66C2] text-[#0A66C2]"
          : "border-transparent text-[#4B5563] hover:bg-[#F9FAFB] hover:border-[#E5E7EB] hover:text-[#111827]"
      )}
    >
      {children}
    </Link>
  )
}

export function Header() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/dashboard" className="text-xl font-bold text-[#0A66C2]">
                LinkedIn Posts
              </Link>
            </div>
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <NavLink to="/dashboard" current={location.pathname === '/dashboard'}>
                Dashboard
              </NavLink>
              <NavLink to="/posts" current={location.pathname.startsWith('/posts')}>
                Posts
              </NavLink>
              <NavLink to="/settings" current={location.pathname === '/settings'}>
                Settings
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center">
            {user && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-[#4B5563] hidden md:inline">
                  {user.email}
                </span>
                <Button
                  variant="secondary"
                  onClick={handleSignOut}
                  className="hidden sm:inline-flex"
                >
                  Sign Out
                </Button>
              </div>
            )}
            <div className="sm:hidden ml-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="relative inline-flex items-center justify-center text-[#4B5563] hover:text-[#111827]"
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className={cn(
        "sm:hidden border-t border-[#E5E7EB]",
        mobileMenuOpen ? "block" : "hidden"
      )}>
        <div className="pt-2 pb-3 space-y-1">
          <MobileNavLink to="/dashboard" current={location.pathname === '/dashboard'}>
            Dashboard
          </MobileNavLink>
          <MobileNavLink to="/posts" current={location.pathname.startsWith('/posts')}>
            Posts
          </MobileNavLink>
          <MobileNavLink to="/settings" current={location.pathname === '/settings'}>
            Settings
          </MobileNavLink>
          <div className="px-4 py-2">
            <Button
              variant="secondary"
              onClick={handleSignOut}
              className="w-full justify-center"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
