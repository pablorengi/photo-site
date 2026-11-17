'use client';

import { useRouter } from 'next/navigation';
import { type MouseEvent, type ReactNode, useCallback, useEffect, useRef } from 'react';

/**
 * Dark full-screen overlay for a photo opened from the grid. Rendered by the
 * intercepted /photos/[slug] route, so the URL is shareable and closing it
 * (Esc, the close button, a click on the dark area, or browser Back) returns
 * to the page underneath.
 *
 * Uses a native <dialog> opened with showModal(), which traps focus and makes
 * the page behind inert.
 */
export function PhotoLightbox({ children }: { children: ReactNode }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const close = useCallback(() => router.back(), [router]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();

    // Stop the page behind from scrolling while the lightbox is open.
    const { overflow } = document.documentElement.style;
    document.documentElement.style.overflow = 'hidden';

    // Esc fires "cancel"; route back instead of just closing the element.
    const onCancel = (event: Event) => {
      event.preventDefault();
      close();
    };
    dialog.addEventListener('cancel', onCancel);

    return () => {
      dialog.removeEventListener('cancel', onCancel);
      document.documentElement.style.overflow = overflow;
    };
  }, [close]);

  // Clicks on the dark area (the dialog itself or anything marked
  // data-lightbox-backdrop) close it; clicks on the photo or controls don't.
  function onClick(event: MouseEvent<HTMLDialogElement>) {
    const target = event.target as HTMLElement;
    if (target === event.currentTarget || target.hasAttribute('data-lightbox-backdrop')) close();
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Esc closes via the dialog's cancel event
    <dialog ref={dialogRef} className="lightbox" aria-label="Photo viewer" onClick={onClick}>
      <button type="button" className="lightbox-close" onClick={close}>
        Close
      </button>
      {children}
    </dialog>
  );
}
