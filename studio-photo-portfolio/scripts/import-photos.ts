/**
 * Import Lightroom exports into Sanity as draft photo documents.
 *
 * Reads the XMP packet Lightroom embeds in each file and maps the keyword
 * hierarchy onto the photo schema:
 *   Camera|<name>  -> camera (+ inferred format)
 *   Film|<stock>   -> medium = film, filmStock
 *   People|<name>  -> people[] (person documents are created if missing)
 *   Places|<name>  -> location
 *   DateCreated    -> year
 *
 * EXIF Make/Model is deliberately ignored: for film scans it describes the
 * scanner, not the camera.
 *
 * Usage (from studio-photo-portfolio/):
 *   npm run import-photos -- --dry-run ~/Desktop/1958_JPEGs/Pontevedra_1958.jpg
 *   npm run import-photos -- ~/Desktop/1958_JPEGs
 *
 * Auth: uses your `sanity login` session. Set SANITY_WRITE_TOKEN to use an
 * API token instead.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { getCliClient } from 'sanity/cli';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp']);

/** Keyword hierarchy roots in the Lightroom catalog. */
const KEYWORD_ROOTS = {
  camera: 'camera',
  film: 'film',
  people: 'people',
  places: 'places',
};

/** Camera name -> film format. Order matters: more specific patterns first. */
const CAMERA_FORMATS: [RegExp, '35mm' | '120'][] = [
  [
    /rollei(flex|cord)|hasselblad|mamiya|bronica|yashica[\s-]?mat|pentax\s?6(7|45)|fuji\s?ga?w?\d{3}|lubitel|kiev\s?(60|88)/i,
    '120',
  ],
  [
    /leica|nikon|canon|olympus|minolta|contax|pentax|konica|ricoh|yashica|zeiss\s?ikon|praktica|zenit/i,
    '35mm',
  ],
];

type Draft = Record<string, unknown> & { _id: string; _type: string };

type Parsed = {
  file: string;
  slug: string;
  title: string;
  year?: number;
  camera?: string;
  medium?: 'film' | 'digital';
  format?: '35mm' | '120';
  filmStock?: string;
  location?: string;
  people: string[];
  warnings: string[];
};

// ---------------------------------------------------------------------------
// XMP parsing (no dependencies; Lightroom's XMP is regular enough for regex)
// ---------------------------------------------------------------------------

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readXmp(file: string): string | undefined {
  const data = readFileSync(file).toString('latin1');
  const match = data.match(/<x:xmpmeta[\s\S]*?<\/x:xmpmeta>/);
  // XMP is UTF-8; re-decode the matched bytes.
  return match ? Buffer.from(match[0], 'latin1').toString('utf8') : undefined;
}

/** A simple property, written either as an attribute or as an element. */
function xmpValue(xmp: string, name: string): string | undefined {
  const n = escapeRegex(name);
  const attr = xmp.match(new RegExp(`\\s${n}="([^"]*)"`));
  if (attr) return decodeXml(attr[1]);
  const el = xmp.match(new RegExp(`<${n}>([^<]*)</${n}>`));
  return el ? decodeXml(el[1]) : undefined;
}

/** An rdf:Bag / rdf:Seq / rdf:Alt property. */
function xmpList(xmp: string, name: string): string[] {
  const n = escapeRegex(name);
  const block = xmp.match(new RegExp(`<${n}>\\s*<rdf:(Bag|Seq|Alt)>([\\s\\S]*?)</rdf:\\1>`));
  if (!block) return [];
  return [...block[2].matchAll(/<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/g)].map((m) => decodeXml(m[1]));
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
    .replace(/-+$/g, '');
}

/** Leaf values of keywords under a hierarchy root, e.g. "Places|Spain|Vigo" -> "Vigo". */
function keywordsUnder(hierarchical: string[], root: string): string[] {
  const values = hierarchical
    .map((k) => k.split('|').map((part) => part.trim()))
    .filter((parts) => parts.length > 1 && parts[0].toLowerCase() === root)
    .map((parts) => parts[parts.length - 1]);
  return [...new Set(values)];
}

function single(values: string[], label: string, warnings: string[]): string | undefined {
  if (values.length > 1)
    warnings.push(`multiple ${label} keywords (${values.join(', ')}); using "${values[0]}"`);
  return values[0];
}

function parseFile(file: string): Parsed {
  const stem = basename(file, extname(file));
  const warnings: string[] = [];
  const xmp = readXmp(file);
  if (!xmp) warnings.push('no XMP metadata found; only title and slug will be set');

  const hierarchical = xmp ? xmpList(xmp, 'lr:hierarchicalSubject') : [];
  const flat = xmp ? xmpList(xmp, 'dc:subject').map((k) => k.toLowerCase()) : [];

  const title = (xmp && xmpList(xmp, 'dc:title')[0]) || stem.replace(/[_]+/g, ' ').trim();

  const camera = single(keywordsUnder(hierarchical, KEYWORD_ROOTS.camera), 'Camera', warnings);
  const filmStock = single(keywordsUnder(hierarchical, KEYWORD_ROOTS.film), 'Film', warnings);
  const location = single(keywordsUnder(hierarchical, KEYWORD_ROOTS.places), 'Places', warnings);
  const people = keywordsUnder(hierarchical, KEYWORD_ROOTS.people);

  const isFilm = Boolean(filmStock) || flat.includes('analog') || flat.includes('film');
  const medium = isFilm ? 'film' : undefined;
  if (!medium) warnings.push('could not tell film from digital; set Medium in the Studio');

  let format: Parsed['format'];
  if (medium === 'film') {
    format = camera ? CAMERA_FORMATS.find(([pattern]) => pattern.test(camera))?.[1] : undefined;
    if (!format)
      warnings.push(`unknown format for camera "${camera ?? '(none)'}"; set Format in the Studio`);
  }
  if (!camera) warnings.push('no Camera| keyword');

  let year: number | undefined;
  const date =
    xmp && (xmpValue(xmp, 'photoshop:DateCreated') ?? xmpValue(xmp, 'exif:DateTimeOriginal'));
  const yearMatch = date?.match(/^(\d{4})/);
  if (yearMatch) {
    const y = Number(yearMatch[1]);
    if (y >= 1826 && y <= new Date().getFullYear()) year = y;
    else warnings.push(`ignoring out-of-range year ${y}`);
  } else {
    warnings.push('no capture date (photoshop:DateCreated)');
  }

  return {
    file,
    slug: slugify(stem),
    title,
    year,
    camera,
    medium,
    format,
    filmStock,
    location,
    people,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Sanity
// ---------------------------------------------------------------------------

const baseClient = getCliClient({ apiVersion: '2025-02-19' });
const client = process.env.SANITY_WRITE_TOKEN
  ? baseClient.withConfig({ token: process.env.SANITY_WRITE_TOKEN })
  : baseClient;

const SYSTEM_FIELDS = ['_rev', '_createdAt', '_updatedAt'];

function stripSystemFields<T extends Record<string, unknown>>(doc: T): T {
  const copy = { ...doc };
  for (const key of SYSTEM_FIELDS) delete copy[key];
  return copy;
}

/** Find a published person by name, or plan a new one with a deterministic id. */
async function resolvePerson(name: string): Promise<{ id: string; exists: boolean }> {
  const existing = await client.fetch<string | null>(
    `*[_type == "person" && lower(name) == lower($name) && !(_id in path("drafts.**"))][0]._id`,
    { name },
  );
  if (existing) return { id: existing, exists: true };
  return { id: `person-${slugify(name)}`, exists: false };
}

async function importPhoto(parsed: Parsed, dryRun: boolean): Promise<void> {
  const publishedId = `photo-${parsed.slug}`;
  const draftId = `drafts.${publishedId}`;

  const clash = await client.fetch<string | null>(
    `*[_type == "photo" && slug.current == $slug && !(_id in [$publishedId, $draftId])][0]._id`,
    { slug: parsed.slug, publishedId, draftId },
  );
  if (clash) {
    console.log(`  SKIP: another photo (${clash}) already uses slug "${parsed.slug}"`);
    return;
  }

  const [draft, published] = await Promise.all([
    client.getDocument<Draft>(draftId),
    client.getDocument<Draft>(publishedId),
  ]);
  const base = draft ?? published;

  const people = await Promise.all(
    parsed.people.map(async (name) => ({ name, ...(await resolvePerson(name)) })),
  );

  console.log(
    `  ${base ? 'update' : 'create'} ${draftId}${base ? ` (from ${draft ? 'draft' : 'published'})` : ''}`,
  );
  for (const person of people) {
    console.log(
      `  person "${person.name}": ${person.exists ? `reuse ${person.id}` : `create ${person.id}`}`,
    );
  }

  if (dryRun) return;

  const asset = await client.assets.upload('image', readFileSync(parsed.file), {
    filename: basename(parsed.file),
  });

  const baseImage = (base?.image ?? {}) as Record<string, unknown>;
  const imported: Record<string, unknown> = {
    image: { ...baseImage, _type: 'image', asset: { _type: 'reference', _ref: asset._id } },
    people: people.map((p) => ({
      _type: 'reference',
      _ref: p.id,
      _key: p.id.replace(/[^a-zA-Z0-9]/g, ''),
    })),
  };
  for (const key of ['year', 'camera', 'medium', 'format', 'filmStock', 'location'] as const) {
    if (parsed[key] !== undefined) imported[key] = parsed[key];
  }

  const doc: Draft = {
    ...(base ? stripSystemFields(base) : {}),
    _id: draftId,
    _type: 'photo',
    title: (base?.title as string | undefined) ?? parsed.title,
    slug: { _type: 'slug', current: parsed.slug },
    ...imported,
  };

  const tx = client.transaction();
  for (const person of people.filter((p) => !p.exists)) {
    tx.createIfNotExists({
      _id: person.id,
      _type: 'person',
      name: person.name,
      slug: { _type: 'slug', current: slugify(person.name) },
    });
  }
  tx.createOrReplace(doc);
  await tx.commit();
  console.log(`  done (asset ${asset._id})`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function collectFiles(args: string[]): string[] {
  const files: string[] = [];
  for (const arg of args) {
    const path = resolve(arg.replace(/^~(?=$|\/)/, process.env.HOME ?? '~'));
    let stats: ReturnType<typeof statSync>;
    try {
      stats = statSync(path);
    } catch {
      continue; // not a path (e.g. the script name passed through by `sanity exec`)
    }
    if (stats.isDirectory()) {
      for (const entry of readdirSync(path).sort()) {
        if (IMAGE_EXTENSIONS.has(extname(entry).toLowerCase())) files.push(join(path, entry));
      }
    } else if (IMAGE_EXTENSIONS.has(extname(path).toLowerCase())) {
      files.push(path);
    }
  }
  return files;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const files = collectFiles(args.filter((a) => !a.startsWith('--')));

  if (files.length === 0) {
    console.error(
      'No image files given. Usage: npm run import-photos -- [--dry-run] <file-or-folder>...',
    );
    process.exit(1);
  }

  const { projectId, dataset } = client.config();
  console.log(
    `${dryRun ? '[dry run] ' : ''}Importing ${files.length} file(s) into ${projectId}/${dataset}\n`,
  );

  let failed = 0;
  for (const file of files) {
    const parsed = parseFile(file);
    console.log(basename(file));
    console.log(
      `  title="${parsed.title}" slug=${parsed.slug} year=${parsed.year ?? '-'} camera=${parsed.camera ?? '-'} ` +
        `medium=${parsed.medium ?? '-'} format=${parsed.format ?? '-'} filmStock=${parsed.filmStock ?? '-'} ` +
        `location=${parsed.location ?? '-'} people=[${parsed.people.join(', ')}]`,
    );
    for (const warning of parsed.warnings) console.log(`  WARN: ${warning}`);
    try {
      await importPhoto(parsed, dryRun);
    } catch (error) {
      failed++;
      console.log(`  ERROR: ${error instanceof Error ? error.message : String(error)}`);
    }
    console.log();
  }

  if (failed > 0) {
    console.error(`${failed} file(s) failed.`);
    process.exit(1);
  }
  if (dryRun) console.log('Dry run: nothing was uploaded. Re-run without --dry-run to import.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
