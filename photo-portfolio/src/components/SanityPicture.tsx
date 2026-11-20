import Image from 'next/image';

import { urlFor } from '@/sanity/image';
import type { SanityImage } from '@/sanity/queries';

type Props = {
  image: SanityImage;
  alt: string;
  /** Width of the generated source image, in pixels. */
  width: number;
  sizes: string;
  className?: string;
  priority?: boolean;
};

/** A Sanity image at its natural aspect ratio, with a blurred placeholder. */
export function SanityPicture({ image, alt, width, sizes, className, priority }: Props) {
  const dimensions = image.asset.metadata?.dimensions;
  // The URL builder applies the Studio crop, so size the box to the cropped area.
  const crop = image.crop ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const aspectRatio = dimensions
    ? (dimensions.width * (1 - crop.left - crop.right)) /
      (dimensions.height * (1 - crop.top - crop.bottom))
    : 3 / 2;
  const height = Math.round(width / aspectRatio);
  const lqip = image.asset.metadata?.lqip;

  return (
    <Image
      src={urlFor(image).width(width).fit('max').auto('format').url()}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      className={className}
      priority={priority}
      placeholder={lqip ? 'blur' : 'empty'}
      blurDataURL={lqip}
    />
  );
}
