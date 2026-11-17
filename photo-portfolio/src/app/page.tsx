import Link from 'next/link';

import { shortCaption } from '@/components/PhotoMeta';
import { SanityPicture } from '@/components/SanityPicture';
import { client } from '@/sanity/client';
import { HOME_QUERY, type Photo, photoSequence, type SiteSettings } from '@/sanity/queries';

type HomeData = {
  settings: SiteSettings | null;
  featured: (Photo | null)[] | null;
  all: Photo[];
  hasAbout: boolean;
};

export default async function Home() {
  const data = await client.fetch<HomeData>(HOME_QUERY);
  const settings = data.settings ?? {};
  const photos = photoSequence(data);
  const title = settings.title ?? settings.siteName ?? 'Photographs';

  return (
    <>
      <section className="hero">
        <h1 className="display">{title}</h1>
        {settings.heroImage?.asset && (
          <SanityPicture
            image={settings.heroImage}
            alt={settings.heroImage.alt ?? ''}
            width={2400}
            sizes="100vw"
            className="hero-image"
            priority
          />
        )}
        {(settings.byline || settings.intro) && (
          <div className="hero-text">
            {settings.byline && <p className="byline">{settings.byline}</p>}
            {settings.intro && (
              <p className="intro">
                {settings.intro}
                {data.hasAbout && (
                  <>
                    {' '}
                    <Link href="/about" className="text-link">
                      About →
                    </Link>
                  </>
                )}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="series" id="work" aria-labelledby="series-title">
        <header className="series-header">
          <h2 className="section-title" id="series-title">
            {settings.seriesTitle ?? 'Work'}
          </h2>
          {settings.seriesDescription && (
            <p className="series-description">{settings.seriesDescription}</p>
          )}
        </header>

        {photos.length > 0 ? (
          <ul className="photo-grid">
            {photos.map((photo, index) => (
              <li key={photo._id}>
                <Link href={`/photos/${photo.slug}`} className="photo-tile">
                  <SanityPicture
                    image={photo.image}
                    alt={photo.image.alt ?? photo.title}
                    width={1200}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="photo-tile-image"
                    priority={index < 3}
                  />
                  <span className="photo-tile-caption">
                    <span>{photo.title}</span>
                    {shortCaption(photo) && <span>{shortCaption(photo)}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">
            No published photographs yet. Publish a photo in the Studio to see it here.
          </p>
        )}
      </section>
    </>
  );
}
