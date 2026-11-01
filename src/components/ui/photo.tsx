/* eslint-disable @next/next/no-img-element */

/**
 * Photo that fills its (relative, fixed-ratio) parent. It is a plain <img> on
 * purpose: next/image with `fill` writes inline style attributes, which the CSP
 * forbids (style-src-attr 'none'), and the picture would collapse to nothing.
 * The photos are already resized in the browser before upload, and /img serves
 * them, so the image optimizer adds nothing here.
 */
export function Photo({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`absolute inset-0 size-full object-cover ${className}`}
    />
  );
}
