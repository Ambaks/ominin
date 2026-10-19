import { useVideoConfig } from "remotion";

/**
 * The 16:9 master and the 9:16 cut share every scene: a scene reads the
 * frame it is laid into and picks its values with `pick(landscape, portrait)`.
 * 4K is the 16:9 master rendered with --scale=2, so sizes stay in 1080p px.
 */
export const useLayout = () => {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  return {
    width,
    height,
    portrait,
    pick: <T,>(landscape: T, vertical: T): T => (portrait ? vertical : landscape),
  };
};
