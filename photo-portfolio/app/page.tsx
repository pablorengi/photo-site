import Image from 'next/image'

import {defineQuery} from 'next-sanity'

import {client} from '../src/sanity/client'
import {urlFor} from '../src/sanity/image'

type Photo = {
  _id: string
  title: string
  description?: string
  image: {
    asset: {_ref: string}
  }
}

const PHOTOS_QUERY = defineQuery(`
  *[_type == "photo"] | order(coalesce(publishedAt, _createdAt) desc) {
    _id,
    title,
    description,
    image {
      asset
    }
  }
`)

export default async function Home() {
  const photos = await client.fetch<Photo[]>(PHOTOS_QUERY)

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
  )
}
