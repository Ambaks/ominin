/*
 * Compression côté client avant upload : recadre à PHOTO_MAX_EDGE px de
 * grand côté et ré-encode en JPEG à PHOTO_JPEG_QUALITY. Une photo de
 * téléphone (~4 Mo) descend ainsi vers ~200-400 Ko — le free tier Storage
 * (1 Go) absorbe des dizaines de restaurants.
 */

export const PHOTO_MAX_EDGE = 1600;
export const PHOTO_JPEG_QUALITY = 0.82;

export async function compressPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Compression impossible sur ce navigateur.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", PHOTO_JPEG_QUALITY)
  );
  if (!blob) throw new Error("Compression impossible sur ce navigateur.");
  return blob;
}

/** Téléverse une photo (compressée) et renvoie son URL publique. */
export async function uploadPhoto(file: File): Promise<string> {
  const blob = await compressPhoto(file);
  const form = new FormData();
  form.append("file", new File([blob], "photo.jpg", { type: "image/jpeg" }));
  const response = await fetch("/api/photos", { method: "POST", body: form });
  const body = (await response.json()) as { url?: string; error?: string };
  if (!response.ok || !body.url) {
    throw new Error(body.error ?? "L'envoi de la photo a échoué.");
  }
  return body.url;
}
