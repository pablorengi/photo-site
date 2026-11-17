import Link from 'next/link';
import type { NavLink } from '@/components/SiteHeader';
import type { SocialLink } from '@/sanity/queries';

type Props = {
  siteName: string;
  links: NavLink[];
  socialLinks: SocialLink[];
  email?: string;
};

export function SiteFooter({ siteName, links, socialLinks, email }: Props) {
  return (
    <footer className="site-footer">
      <div className="footer-columns">
        <div>
          <h2 className="footer-heading">Site map</h2>
          <ul>
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        {(socialLinks.length > 0 || email) && (
          <div>
            <h2 className="footer-heading">Elsewhere</h2>
            <ul>
              {email && (
                <li>
                  <a href={`mailto:${email}`}>{email}</a>
                </li>
              )}
              {socialLinks.map((link) => (
                <li key={link._key}>
                  <a href={link.url} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <p className="footer-copy">
        © {new Date().getFullYear()} {siteName}
      </p>
    </footer>
  );
}
