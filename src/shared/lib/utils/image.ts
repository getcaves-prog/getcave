/**
 * Convert a Supabase Storage public URL to use Image Transforms.
 * This serves resized, optimized images instead of full-resolution originals.
 *
 * @see https://supabase.com/docs/guides/storage/serving/image-transformations
 */
export function getOptimizedImageUrl(
  url: string,
  width: number,
  quality = 60,
): string {
  if (!url) return url;

  // Only optimize Supabase Storage URLs
  if (!url.includes("supabase.co/storage/v1/object/public/")) {
    return url;
  }

  // Convert: /storage/v1/object/public/bucket/path
  // To:      /storage/v1/render/image/public/bucket/path?width=X&quality=Y
  return url
    .replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/",
    )
    .concat(`?width=${width}&quality=${quality}&resize=contain`);
}
