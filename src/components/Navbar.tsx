'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CheckSquare, ShieldCheck, Home } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  return (
    <header className="border-b border-zinc-200 bg-white/90 backdrop-blur-sm sticky top-0 z-40 dark:border-zinc-800 dark:bg-zinc-950/90 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-black text-sm shadow-sm">
            Q
          </div>
          <span className="text-zinc-900 dark:text-zinc-100">
            Quiz<span className="font-light text-zinc-500">System</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3 text-sm">
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              !isAdmin
                ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>หน้าหลัก</span>
          </Link>

          <Link
            href="/admin"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              isAdmin
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>สำหรับอาจารย์</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
