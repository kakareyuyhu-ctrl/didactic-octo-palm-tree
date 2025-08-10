import { Menu } from 'lucide-react';

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-white/90 px-4 backdrop-blur lg:col-span-2 lg:hidden">
      <button aria-label="Open menu" className="rounded-lg p-2 hover:bg-gray-100" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </button>
      <div className="font-semibold">Pat services — Admin</div>
    </header>
  );
}