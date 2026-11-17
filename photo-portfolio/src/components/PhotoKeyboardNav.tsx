'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** ← / → move between photos, Esc goes back to the grid. */
export function PhotoKeyboardNav({ prev, next }: { prev?: string; next?: string }) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea')) return;
      if (event.key === 'ArrowLeft' && prev) router.push(prev);
      else if (event.key === 'ArrowRight' && next) router.push(next);
      else if (event.key === 'Escape') router.push('/#work');
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [prev, next, router]);

  return null;
}
