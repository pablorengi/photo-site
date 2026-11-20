import { client } from '@/sanity/client';
import { PHOTO_SLUGS_QUERY, type Photo, photoSequence, SEQUENCE_QUERY } from '@/sanity/queries';

type SequenceData = { featured: (Photo | null)[] | null; all: Photo[] };

export type LoadedPhoto = {
  photo: Photo;
  index: number;
  total: number;
  prev?: Photo;
  next?: Photo;
};

export async function getPhotoSlugs(): Promise<string[]> {
  return client.fetch<string[]>(PHOTO_SLUGS_QUERY);
}

/**
 * The photo plus its neighbours. Prev/next follow the home grid's order; a
 * photo that isn't featured falls back to the order of all photos.
 */
export async function loadPhoto(slug: string): Promise<LoadedPhoto | null> {
  const data = await client.fetch<SequenceData>(SEQUENCE_QUERY);
  let sequence = photoSequence(data);
  if (!sequence.some((photo) => photo.slug === slug)) sequence = data.all;
  const index = sequence.findIndex((photo) => photo.slug === slug);
  if (index === -1) return null;
  return {
    photo: sequence[index],
    index,
    total: sequence.length,
    prev: sequence[index - 1],
    next: sequence[index + 1],
  };
}

export const photoHref = (photo: Photo) => `/photos/${photo.slug}`;
