import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { client } from '@/sanity/client';
import { PhotoKeyboardNav } from '../../../components/PhotoKeyboardNav';
import { mediumLabel } from '../../../components/PhotoMeta';
import { SanityPicture } from '../../../components/SanityPicture';
import { urlFor } from '../../../sanity/image';
import {
  PHOTO_SLUGS_QUERY,
  type Photo,
  photoSequence,
  SEQUENCE_QUERY,
} from '../../../sanity/queries';

type Params = Promise<{ slug: string }>;
type SequenceData = { featured: (Photo | null)[] | null; all: Photo[] };

export async function generateStaticParams() {
  const slugs = await client.fetch<string[]>(PHOTO_SLUGS_QUERY);
  return slugs.map((slug) => ({ slug }));
}

/**
 * The photo plus its neighbours. Prev/next follow the home grid's order; a
 * photo that isn't featured falls back to the order of all photos.
 */
async function loadPhoto(slug: string) {
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

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadPhoto(slug);
  if (!result) return {};
  const { photo } = result;
  return {
    title: photo.title,
    description: photo.description,
    openGraph: {
      images: [{ url: urlFor(photo.image).width(1200).auto('format').url() }],
    },
  };
}

export default async function PhotoPage({ params }: { params: Params }) {
  const { slug } = await params;
  const result = await loadPhoto(slug);
  if (!result) notFound();
  const { photo, index, total, prev, next } = result;

  const details: [string, string | undefined][] = [
    ['Location', photo.location],
    ['Year', photo.year?.toString()],
    ['Camera', photo.camera],
    ['Medium', mediumLabel(photo)],
    [
      'People',
      photo.people
        ?.filter(Boolean)
        .map((person) => person.name)
        .join(', ') || undefined,
    ],
  ];

  const prevHref = prev && `/photos/${prev.slug}`;
  const nextHref = next && `/photos/${next.slug}`;

  return (
    <article className="photo-view">
      <PhotoKeyboardNav prev={prevHref} next={nextHref} />

      <div className="photo-view-bar">
        <Link href="/#work" className="text-link">
          ← All work
        </Link>
        <span>
          {index + 1} / {total}
        </span>
      </div>

      <figure className="photo-view-figure">
        <SanityPicture
          image={photo.image}
          alt={photo.image.alt ?? photo.title}
          width={2400}
          sizes="100vw"
          className="photo-view-image"
          priority
        />
      </figure>

      <div className="photo-view-info">
        <h1 className="section-title">{photo.title}</h1>
        <dl className="photo-details">
          {details
            .filter((entry): entry is [string, string] => Boolean(entry[1]))
            .map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
        {photo.description && <p className="photo-description">{photo.description}</p>}
      </div>

      <nav className="photo-view-pager" aria-label="Photos">
        {prevHref ? (
          <Link href={prevHref} rel="prev">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {nextHref ? (
          <Link href={nextHref} rel="next">
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
