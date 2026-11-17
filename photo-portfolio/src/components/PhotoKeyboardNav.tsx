'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

type Props = {
  prev?: string;
  next?: string;
  /**
   * "page": the standalone photo page. Prev/next do a full page load, so they
   * aren't intercepted into the lightbox; Esc goes to the grid.
   * "lightbox": prev/next replace the current history entry, so Back closes
   * the lightbox instead of stepping through photos. Esc is handled by the
   * lightbox itself.
   */
  mode: 'page' | 'lightbox';
};

/** ← / → move between photos. */
export function PhotoKeyboardNav({ prev, next, mode }: Props) {
  const router = useRouter();

  useEffect(() => {
    function go(href: string) {
      if (mode === 'lightbox') router.replace(href, { scroll: false });
      else window.location.assign(href);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea')) return;
      if (event.key === 'ArrowLeft' && prev) go(prev);
      else if (event.key === 'ArrowRight' && next) go(next);
      else if (event.key === 'Escape' && mode === 'page') router.push('/#work');
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [prev, next, mode, router]);

  return null;
}
