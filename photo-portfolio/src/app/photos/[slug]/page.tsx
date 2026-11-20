import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PhotoDetails } from '@/components/PhotoDetails';
import { PhotoKeyboardNav } from '@/components/PhotoKeyboardNav';
import { SanityPicture } from '@/components/SanityPicture';
import { urlFor } from '@/sanity/image';
import { getPhotoSlugs, loadPhoto, photoHref } from '@/sanity/photos';

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const slugs = await getPhotoSlugs();
  return slugs.map((slug) => ({ slug }));
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

/**
 * Standalone photo page: what you get from a shared link or a refresh. Clicks
 * from the grid are intercepted and shown in the lightbox instead
 * (see app/@modal/(.)photos).
 */
export default async function PhotoPage({ params }: { params: Params }) {
  const { slug } = await params;
  const result = await loadPhoto(slug);
  if (!result) notFound();
  const { photo, index, total, prev, next } = result;

  const prevHref = prev && photoHref(prev);
  const nextHref = next && photoHref(next);

  return (
    <article className="photo-view">
      <PhotoKeyboardNav mode="page" prev={prevHref} next={nextHref} />

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
        <PhotoDetails photo={photo} />
        {photo.description && <p className="photo-description">{photo.description}</p>}
      </div>

      {/*
        Plain <a> on purpose: a client-side navigation to another /photos/ URL
        would be intercepted and open the lightbox on top of this page.
      */}
      <nav className="photo-view-pager" aria-label="Photos">
        {prevHref ? <a href={prevHref}>← {prev.title}</a> : <span />}
        {nextHref ? <a href={nextHref}>{next.title} →</a> : <span />}
      </nav>
    </article>
  );
}
