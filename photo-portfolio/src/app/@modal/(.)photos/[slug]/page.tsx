import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PhotoKeyboardNav } from '@/components/PhotoKeyboardNav';
import { mediumLabel, shortCaption } from '@/components/PhotoMeta';
import { SanityPicture } from '@/components/SanityPicture';
import { getPhotoSlugs, loadPhoto, photoHref } from '@/sanity/photos';

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const slugs = await getPhotoSlugs();
  return slugs.map((slug) => ({ slug }));
}

/** The photo as shown inside the lightbox when opened from the grid. */
export default async function LightboxPhotoPage({ params }: { params: Params }) {
  const { slug } = await params;
  const result = await loadPhoto(slug);
  if (!result) notFound();
  const { photo, index, total, prev, next } = result;

  const caption = [shortCaption(photo), photo.camera, mediumLabel(photo)]
    .filter(Boolean)
    .join(' · ');
  const prevHref = prev && photoHref(prev);
  const nextHref = next && photoHref(next);

  return (
    <>
      <PhotoKeyboardNav mode="lightbox" prev={prevHref} next={nextHref} />

      <p className="lightbox-counter">
        {index + 1} / {total}
      </p>

      <figure className="lightbox-figure" data-lightbox-backdrop>
        <SanityPicture
          key={photo._id}
          image={photo.image}
          alt={photo.image.alt ?? photo.title}
          width={2400}
          sizes="100vw"
          className="lightbox-image"
          priority
        />
      </figure>

      <div className="lightbox-caption" data-lightbox-backdrop>
        <p className="lightbox-title">{photo.title}</p>
        {caption && <p>{caption}</p>}
      </div>

      {prevHref && (
        <Link
          href={prevHref}
          replace
          scroll={false}
          className="lightbox-nav lightbox-nav--prev"
          aria-label={`Previous: ${prev.title}`}
        >
          ←
        </Link>
      )}
      {nextHref && (
        <Link
          href={nextHref}
          replace
          scroll={false}
          className="lightbox-nav lightbox-nav--next"
          aria-label={`Next: ${next.title}`}
        >
          →
        </Link>
      )}
    </>
  );
}
