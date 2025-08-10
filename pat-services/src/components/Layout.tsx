import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="grid min-h-screen grid-rows-[auto,1fr] lg:grid-cols-[18rem,1fr] lg:grid-rows-1">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Topbar onMenuClick={() => setSidebarOpen(true)} />
      <main className="p-4 lg:p-6 bg-gray-50">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}