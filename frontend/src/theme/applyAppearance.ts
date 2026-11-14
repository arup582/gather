import {
  appearanceAttributes,
  appearanceCookie,
  appearanceCSS,
  normalizeAppearance,
  type Appearance,
} from './config';
export function applyAppearance(input: Appearance) {
  const value = normalizeAppearance(input);
  for (const [attribute, setting] of Object.entries(appearanceAttributes(value))) {
    document.documentElement.setAttribute(attribute, setting);
  }
  const stylesheet = document.querySelector('#gather-appearance');
  if (stylesheet) stylesheet.textContent = appearanceCSS(value);
  document.cookie = `${appearanceCookie}=${encodeURIComponent(JSON.stringify(value))}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
}
