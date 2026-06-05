export const PLATFORM_DIMENSIONS: Record<string, { width: number; height: number }> = {
  'Instagram Post': { width: 1080, height: 1080 },
  'Instagram Story': { width: 1080, height: 1920 },
  'Facebook Feed': { width: 1200, height: 628 },
  'Facebook Story': { width: 1080, height: 1920 },
  'Google Display': { width: 728, height: 90 },
  'LinkedIn': { width: 1200, height: 627 },
  'Twitter/X': { width: 1600, height: 900 },
};

export function getAspectRatio(platform: string): string {
  const dims = PLATFORM_DIMENSIONS[platform];
  if (!dims) return '1:1';
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(dims.width, dims.height);
  return `${dims.width / d}:${dims.height / d}`;
}
