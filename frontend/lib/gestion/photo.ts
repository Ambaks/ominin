/*
 * Compression côté client avant upload : recadre à PHOTO_MAX_EDGE px de
 * grand côté et ré-encode en WebP à PHOTO_QUALITY. Chaque visiteur du menu
 * télécharge ces photos depuis Supabase : leur poids compte dans l'egress
 * du free tier. 1080 px couvrent une fiche plein écran sur un téléphone 3×.
 */

export const PHOTO_MAX_EDGE = 1080;
export const PHOTO_QUALITY = 0.8;

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

  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, PHOTO_QUALITY));
  // Un navigateur qui n'encode pas le WebP rend du PNG, bien plus lourd :
  // le JPEG reste alors le meilleur choix.
  const webp = await encode("image/webp");
  const blob = webp?.type === "image/webp" ? webp : await encode("image/jpeg");
  if (!blob) throw new Error("Compression impossible sur ce navigateur.");
  return blob;
}

/** Téléverse une photo (compressée) et renvoie son URL publique. */
export async function uploadPhoto(file: File): Promise<string> {
  const blob = await compressPhoto(file);
  const form = new FormData();
  form.append("file", new File([blob], "photo", { type: blob.type }));
  const response = await fetch("/api/photos", { method: "POST", body: form });
  const body = (await response.json()) as { url?: string; error?: string };
  if (!response.ok || !body.url) {
    throw new Error(body.error ?? "L'envoi de la photo a échoué.");
  }
  return body.url;
}
