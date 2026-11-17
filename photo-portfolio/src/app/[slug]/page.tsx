import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PortableText } from 'next-sanity';

import { SanityPicture } from '../../components/SanityPicture';
import { client } from '../../sanity/client';
import { PAGE_QUERY, PAGE_SLUGS_QUERY, type Page, type SiteSettings } from '../../sanity/queries';

type Params = Promise<{ slug: string }>;
type PageData = {
  page: Page | null;
  settings: Pick<SiteSettings, 'email' | 'socialLinks'> | null;
};

export async function generateStaticParams() {
  const slugs = await client.fetch<string[]>(PAGE_SLUGS_QUERY);
  return [...new Set([...slugs, 'contact'])].map((slug) => ({ slug }));
}

async function loadPage(slug: string) {
  const data = await client.fetch<PageData>(PAGE_QUERY, { slug });
  const email = data.settings?.email;
  const socialLinks = data.settings?.socialLinks ?? [];
  // /contact works without a page document, as long as there's something to show.
  const showContact = slug === 'contact' && (Boolean(email) || socialLinks.length > 0);
  if (!data.page && !showContact) return null;
  return { page: data.page, email, socialLinks, showContact };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadPage(slug);
  return result ? { title: result.page?.title ?? 'Contact' } : {};
}

export default async function TextPage({ params }: { params: Params }) {
  const { slug } = await params;
  const result = await loadPage(slug);
  if (!result) notFound();
  const { page, email, socialLinks, showContact } = result;

  return (
    <article className="text-page">
      <h1 className="display">{page?.title ?? 'Contact'}</h1>
      <div className="text-page-columns">
        {page?.image?.asset && (
          <SanityPicture
            image={page.image}
            alt={page.image.alt ?? ''}
            width={1400}
            sizes="(max-width: 900px) 100vw, 45vw"
            className="text-page-image"
            priority
          />
        )}
        <div className="prose">
          {page?.body && <PortableText value={page.body} />}
          {showContact && (
            <ul className="contact-list">
              {email && (
                <li>
                  <span>Email</span>
                  <a href={`mailto:${email}`}>{email}</a>
                </li>
              )}
              {socialLinks.map((link) => (
                <li key={link._key}>
                  <span>{link.label}</span>
                  <a href={link.url} target="_blank" rel="noreferrer">
                    {link.url.replace(/^(https?:\/\/)?(www\.)?|\/$/g, '')}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}
