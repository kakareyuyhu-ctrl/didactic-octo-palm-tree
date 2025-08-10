import { NavLink } from 'react-router-dom';
import { X, LayoutDashboard, Users, Settings } from 'lucide-react';
import clsx from 'clsx';

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      <div
        className={clsx('fixed inset-0 z-40 bg-black/30 lg:hidden', open ? 'block' : 'hidden')}
        onClick={onClose}
      />
      <aside
        className={clsx(
          'fixed z-50 flex h-full w-72 flex-col border-r bg-white transition-transform duration-200 ease-out lg:static lg:z-0 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div className="text-base font-semibold">Pat services</div>
          <button className="rounded-lg p-2 hover:bg-gray-100 lg:hidden" aria-label="Close menu" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100',
                  isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600'
                )
              }
              onClick={onClose}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-3 text-xs text-gray-500">© {new Date().getFullYear()} Pat services</div>
      </aside>
    </>
  );
}