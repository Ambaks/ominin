import { PHOTO_MAX_WIDTH, PHOTO_WEBP_QUALITY } from "./constants";

/*
 * Compression des photos produit dans le navigateur avant envoi : grand
 * côté ramené à PHOTO_MAX_WIDTH, ré-encodage WebP. Même logique que
 * lib/gestion/photo.ts (JPEG) ; le WebP est plus léger pour des visuels
 * boutique affichés en grand.
 */
export async function compressPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_MAX_WIDTH / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Compression impossible sur ce navigateur.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", PHOTO_WEBP_QUALITY));
  if (!blob) throw new Error("Compression impossible sur ce navigateur.");
  return blob;
}
