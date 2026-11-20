import { PhotoLightbox } from '@/components/PhotoLightbox';

// Persists while stepping between photos, so the overlay doesn't flicker.
export default function LightboxLayout({ children }: { children: React.ReactNode }) {
  return <PhotoLightbox>{children}</PhotoLightbox>;
}
