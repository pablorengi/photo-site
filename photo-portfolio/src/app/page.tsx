import Image from 'next/image';

import { defineQuery } from 'next-sanity';

import { client } from '../sanity/client';
import { urlFor } from '../sanity/image';

// Re-fetch from Sanity at most once a minute, so newly published photos
// appear without a redeploy.
export const revalidate = 60;

type Photo = {
  _id: string;
  title: string;
  description?: string;
  image: {
    asset: { _ref: string };
  };
  year?: number;
  camera?: string;
  medium?: 'film' | 'digital';
  format?: '35mm' | '120';
  filmStock?: string;
  location?: string;
  people?: { _id: string; name: string; slug?: { current: string } }[];
};

const PHOTOS_QUERY = defineQuery(`
  *[_type == "photo"] | order(coalesce(publishedAt, _createdAt) desc) {
    _id,
    title,
    description,
    image {
      asset
    },
    year,
    camera,
    medium,
    format,
    filmStock,
    location,
    people[]->{ _id, name, slug }
  }
`);

export default async function Home() {
  const photos = await client.fetch<Photo[]>(PHOTOS_QUERY);

  return (
    <main className="portfolio-shell">
      <header className="portfolio-header">
        <div>
          <p className="eyebrow">Photo portfolio</p>
          <h1>Quiet places, carefully seen.</h1>
        </div>
        <p className="portfolio-intro">
          A living collection of photographs, published from Sanity.
        </p>
      </header>

      {photos.length > 0 ? (
        <section className="photo-grid" aria-label="Photo portfolio">
          {photos.map((photo) => (
            <article className="photo-card" key={photo._id}>
              <Image
                src={urlFor(photo.image).width(1600).auto('format').url()}
                alt={photo.title}
                width={1600}
                height={1100}
                sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                className="photo-image"
              />
              <div className="photo-caption">
                <h2>{photo.title}</h2>
                {photo.description && <p>{photo.description}</p>}
                {(() => {
                  const details = [
                    photo.location,
                    photo.year,
                    photo.camera,
                    photo.medium === 'film'
                      ? [photo.filmStock ?? 'Film', photo.format]
                          .filter(Boolean)
                          .join(' ')
                      : photo.medium === 'digital'
                        ? 'Digital'
                        : undefined,
                  ].filter(Boolean);
                  return details.length > 0 ? (
                    <p className="photo-details">{details.join(' · ')}</p>
                  ) : null;
                })()}
                {photo.people && photo.people.length > 0 && (
                  <p className="photo-people">
                    {photo.people
                      .filter(Boolean)
                      .map((person) => person.name)
                      .join(', ')}
                  </p>
                )}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-state">
          <p>No published photographs yet.</p>
          <p>Add a photo in the Sanity Studio and publish it to see it here.</p>
        </section>
      )}
    </main>
  );
}
