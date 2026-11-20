import { defineQuery, type PortableTextBlock } from 'next-sanity';

// ---------------------------------------------------------------------------
// Types (hand-written to match the GROQ projections below)
// ---------------------------------------------------------------------------

export type SanityImage = {
  alt?: string;
  hotspot?: { x: number; y: number; height: number; width: number };
  crop?: { top: number; bottom: number; left: number; right: number };
  asset: {
    _id: string;
    metadata?: {
      lqip?: string;
      dimensions?: { width: number; height: number; aspectRatio: number };
    };
  };
};

export type Photo = {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  image: SanityImage;
  year?: number;
  camera?: string;
  medium?: 'film' | 'digital';
  format?: '35mm' | '120';
  filmStock?: string;
  location?: string;
  people?: { _id: string; name: string }[];
};

export type SocialLink = { _key: string; label: string; url: string };

export type SiteSettings = {
  siteName?: string;
  title?: string;
  byline?: string;
  intro?: string;
  seriesTitle?: string;
  seriesDescription?: string;
  heroImage?: SanityImage;
  email?: string;
  socialLinks?: SocialLink[];
};

export type Page = {
  _id: string;
  title: string;
  slug: string;
  image?: SanityImage;
  body?: PortableTextBlock[];
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const IMAGE = /* groq */ `{
  alt, hotspot, crop,
  asset->{ _id, metadata { lqip, dimensions { width, height, aspectRatio } } }
}`;

const PHOTO = /* groq */ `{
  _id, title, "slug": slug.current, description,
  year, camera, medium, format, filmStock, location,
  image ${IMAGE},
  people[]->{ _id, name }
}`;

const ALL_PHOTOS = /* groq */ `*[_type == "photo" && defined(slug.current) && defined(image.asset)]
  | order(coalesce(publishedAt, _createdAt) desc)`;

const SETTINGS = /* groq */ `*[_type == "siteSettings" && _id == "siteSettings"][0]`;

/** Header/footer data: settings plus which pages exist, for the nav. */
export const LAYOUT_QUERY = defineQuery(`{
  "settings": ${SETTINGS}{ siteName, email, socialLinks },
  "pageSlugs": *[_type == "page" && defined(slug.current)].slug.current
}`);

/**
 * The ordered list of photos shown on the home page: the featured photos if
 * any are set, otherwise every photo, newest first.
 */
export const SEQUENCE_QUERY = defineQuery(`{
  "featured": ${SETTINGS}.featuredPhotos[]->${PHOTO},
  "all": ${ALL_PHOTOS}${PHOTO}
}`);

export const HOME_QUERY = defineQuery(`{
  "settings": ${SETTINGS}{
    siteName, title, byline, intro, seriesTitle, seriesDescription,
    heroImage ${IMAGE}
  },
  "featured": ${SETTINGS}.featuredPhotos[]->${PHOTO},
  "all": ${ALL_PHOTOS}${PHOTO},
  "hasAbout": count(*[_type == "page" && slug.current == "about"]) > 0
}`);

export const PHOTO_SLUGS_QUERY = defineQuery(`${ALL_PHOTOS}.slug.current`);

export const PAGE_QUERY = defineQuery(`{
  "page": *[_type == "page" && slug.current == $slug][0]{
    _id, title, "slug": slug.current, body, image ${IMAGE}
  },
  "settings": ${SETTINGS}{ siteName, email, socialLinks }
}`);

export const PAGE_SLUGS_QUERY = defineQuery(
  `*[_type == "page" && defined(slug.current)].slug.current`,
);

/** Featured photos if set (dropping unpublished/deleted refs), else all photos. */
export function photoSequence(data: { featured?: (Photo | null)[] | null; all: Photo[] }): Photo[] {
  const featured = (data.featured ?? []).filter((photo): photo is Photo =>
    Boolean(photo?.slug && photo.image?.asset),
  );
  return featured.length > 0 ? featured : data.all;
}
