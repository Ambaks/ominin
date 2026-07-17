const YOUTUBE_RE =
  /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?.*v=|live\/|shorts\/)|youtu\.be\/)/;

const TWITCH_VOD_RE =
  /^https?:\/\/(?:www\.)?twitch\.tv\/videos\//;

export function isValidSourceUrl(raw: string): boolean {
  const url = raw.trim();
  return YOUTUBE_RE.test(url) || TWITCH_VOD_RE.test(url);
}
