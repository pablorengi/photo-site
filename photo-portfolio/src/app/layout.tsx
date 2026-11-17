import type { Metadata } from 'next';
import { Archivo, Courier_Prime, IBM_Plex_Mono } from 'next/font/google';
import { SiteFooter } from '@/components/SiteFooter';
import { type NavLink, SiteHeader } from '@/components/SiteHeader';
import { client } from '@/sanity/client';
import { LAYOUT_QUERY, type SiteSettings } from '@/sanity/queries';
import './globals.css';

// Re-fetch from Sanity at most once a minute, so published changes appear
// without a redeploy.
export const revalidate = 60;

// Extended bold grotesque for headings (stand-in for Pragmatica Extended).
const heading = Archivo({
  subsets: ['latin', 'latin-ext'],
  axes: ['wdth'],
  variable: '--font-heading',
});

// Typewriter body text (stand-in for Courier Std).
const body = Courier_Prime({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-body',
});

// Small technical details: captions, metadata, nav.
const meta = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  variable: '--font-meta',
});

type LayoutData = {
  settings: Pick<SiteSettings, 'siteName' | 'email' | 'socialLinks'> | null;
  pageSlugs: string[];
};

const DEFAULT_SITE_NAME = 'Photo portfolio';

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await client.fetch<LayoutData>(LAYOUT_QUERY);
  const siteName = settings?.siteName ?? DEFAULT_SITE_NAME;
  return {
    title: { default: siteName, template: `%s — ${siteName}` },
    description: 'A living collection of photographs.',
  };
}

export default async function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  /** The photo lightbox (app/@modal), when a photo is opened from the grid. */
  modal: React.ReactNode;
}>) {
  const { settings, pageSlugs } = await client.fetch<LayoutData>(LAYOUT_QUERY);
  const siteName = settings?.siteName ?? DEFAULT_SITE_NAME;
  const socialLinks = settings?.socialLinks ?? [];
  const hasContact =
    pageSlugs.includes('contact') || Boolean(settings?.email) || socialLinks.length > 0;

  const links: NavLink[] = [
    { href: '/', label: 'Work' },
    ...(pageSlugs.includes('about') ? [{ href: '/about', label: 'About' }] : []),
    ...(hasContact ? [{ href: '/contact', label: 'Contact' }] : []),
  ];

  return (
    <html lang="en" className={`${heading.variable} ${body.variable} ${meta.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader siteName={siteName} links={links} />
        <main id="main">{children}</main>
        <SiteFooter
          siteName={siteName}
          links={links}
          socialLinks={socialLinks}
          email={settings?.email}
        />
        {modal}
      </body>
    </html>
  );
}
