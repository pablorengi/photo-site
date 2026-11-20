import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url';

import { client } from '@/sanity/client';

const builder = createImageUrlBuilder(client);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}
