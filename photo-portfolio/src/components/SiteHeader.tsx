'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export type NavLink = { href: string; label: string };

export function SiteHeader({ siteName, links }: { siteName: string; links: NavLink[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu after navigating.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run on route change
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' || pathname.startsWith('/photos/') : pathname === href;

  return (
    <header className="site-header">
      <Link href="/" className="site-name">
        {siteName}
      </Link>
      <button
        type="button"
        className="menu-toggle"
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Close' : 'Menu'}
      </button>
      <nav id="site-nav" className="site-nav" data-open={open} aria-label="Main">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive(link.href) ? 'page' : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
