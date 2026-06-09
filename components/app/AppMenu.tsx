'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MENU_ITEMS = [
  { href: '/game', label: 'Game' },
  { href: '/history', label: 'History' },
  { href: '/help', label: 'Help' },
];

export function AppMenu() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2">
      {MENU_ITEMS.map(item => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
              active
                ? 'border border-cyan-400/40 bg-cyan-500/15 text-cyan-100'
                : 'border border-gray-800 bg-gray-900 text-gray-300'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
