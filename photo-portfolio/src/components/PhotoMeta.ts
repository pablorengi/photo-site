import type { Photo } from '@/sanity/queries';

/** "Ektachrome 120", "Film 35mm", "Digital", or undefined. */
export function mediumLabel(photo: Photo): string | undefined {
  if (photo.medium === 'film') {
    return [photo.filmStock ?? 'Film', photo.format].filter(Boolean).join(' ');
  }
  if (photo.medium === 'digital') return 'Digital';
  return undefined;
}

/** Short caption line for the grid, e.g. "Pontevedra, 1958". */
export function shortCaption(photo: Photo): string {
  return [photo.location, photo.year].filter(Boolean).join(', ');
}
