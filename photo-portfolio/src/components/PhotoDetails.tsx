import { mediumLabel } from '@/components/PhotoMeta';
import type { Photo } from '@/sanity/queries';

/** Location / Year / Camera / Medium / People, skipping empty rows. */
export function PhotoDetails({ photo, className }: { photo: Photo; className?: string }) {
  const people = photo.people
    ?.filter(Boolean)
    .map((person) => person.name)
    .join(', ');

  const rows: [string, string | undefined][] = [
    ['Location', photo.location],
    ['Year', photo.year?.toString()],
    ['Camera', photo.camera],
    ['Medium', mediumLabel(photo)],
    ['People', people || undefined],
  ];

  return (
    <dl className={['photo-details', className].filter(Boolean).join(' ')}>
      {rows
        .filter((row): row is [string, string] => Boolean(row[1]))
        .map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}
