export const themes = [
  { id: 'emerald', name: 'Emerald', description: 'Warm & welcoming' },
  { id: 'corporate', name: 'Corporate', description: 'Clear & focused' },
  { id: 'night', name: 'Night', description: 'Easy after hours' },
] as const;
export type GatherTheme = (typeof themes)[number]['id'];
export const fonts = [
  { value: 'system', label: 'System sans' },
  { value: 'humanist', label: 'Humanist sans' },
  { value: 'serif', label: 'Classic serif' },
  { value: 'mono', label: 'Monospace' },
] as const;
export interface Appearance {
  theme: GatherTheme;
  accent: string;
  font: (typeof fonts)[number]['value'];
  headingFont: 'body' | 'serif';
  fontSize: number;
  lineHeight: number;
  density: 'comfortable' | 'compact';
  corners: 'theme' | 'square' | 'soft' | 'round';
  width: 'focused' | 'wide' | 'full';
  reducedMotion: boolean;
}
export const defaultAppearance: Appearance = {
  theme: 'emerald',
  accent: 'theme',
  font: 'system',
  headingFont: 'body',
  fontSize: 16,
  lineHeight: 1.55,
  density: 'comfortable',
  corners: 'theme',
  width: 'focused',
  reducedMotion: false,
};
export const appearanceCookie = 'gather-appearance';
export const isHexColor = (value: string) => /^#[\da-f]{6}$/i.test(value);
function choice<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return values.includes(value as T) ? (value as T) : fallback;
}
function numberInRange(value: unknown, min: number, max: number, fallback: number, step: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
    ? Math.round(value / step) * step
    : fallback;
}
export function normalizeAppearance(input: unknown): Appearance {
  const value = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  return {
    theme: choice(
      value.theme,
      themes.map((theme) => theme.id),
      defaultAppearance.theme,
    ),
    accent:
      typeof value.accent === 'string' && isHexColor(value.accent)
        ? value.accent.toLowerCase()
        : 'theme',
    font: choice(
      value.font,
      fonts.map((font) => font.value),
      defaultAppearance.font,
    ),
    headingFont: choice(value.headingFont, ['body', 'serif'], defaultAppearance.headingFont),
    fontSize: numberInRange(value.fontSize, 14, 20, 16, 1),
    lineHeight: numberInRange(value.lineHeight, 1.4, 1.8, 1.55, 0.05),
    density: choice(value.density, ['comfortable', 'compact'], defaultAppearance.density),
    corners: choice(value.corners, ['theme', 'square', 'soft', 'round'], defaultAppearance.corners),
    width: choice(value.width, ['focused', 'wide', 'full'], defaultAppearance.width),
    reducedMotion: value.reducedMotion === true,
  };
}
export function readAppearance(cookie?: string, legacyTheme?: string): Appearance {
  try {
    if (cookie) return normalizeAppearance(JSON.parse(decodeURIComponent(cookie)));
  } catch {
    /* Invalid or outdated preferences use defaults. */
  }
  return normalizeAppearance({ theme: legacyTheme });
}
export function appearanceAttributes(value: Appearance) {
  return {
    'data-theme': value.theme,
    'data-font': value.font,
    'data-heading-font': value.headingFont,
    'data-density': value.density,
    'data-corners': value.corners,
    'data-width': value.width,
    'data-reduced-motion': String(value.reducedMotion),
  };
}
export function accentForeground(hex: string) {
  const channels = [1, 3, 5].map((index) => {
    const value = parseInt(hex.slice(index, index + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#000000' : '#ffffff';
}
// Only normalized values enter CSS. A nonce permits this stylesheet under the production CSP.
export function appearanceCSS(input: Appearance) {
  const value = normalizeAppearance(input);
  const accent = isHexColor(value.accent)
    ? `--color-primary:${value.accent};--color-primary-content:${accentForeground(value.accent)};`
    : '';
  return `:root[data-theme]{font-size:${(value.fontSize / 16) * 100}%;--body-leading:${value.lineHeight.toFixed(2)};${accent}}`;
}
