import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import {
  readAppearance,
  appearanceCookie,
  appearanceAttributes,
  appearanceCSS,
} from '../theme/config';
import '../theme/daisyui.css';
import '../theme/tokens.css';
import '../theme/appearance.css';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { AuthProvider } from '../auth';
import App from '../App';
import '../components/ui/components.css';
import '../styles.css';
export const metadata: Metadata = {
  title: 'Gather · Bring people together',
  description: 'Gather — discover local events, meet your community, and bring people together.',
};
export const viewport: Viewport = { themeColor: '#244f41' };
export default async function RootLayout({ children }: { children: ReactNode }) {
  // Render per request so CSP nonces match the hydration scripts.
  await connection();
  const preferences = await cookies();
  const appearance = readAppearance(
    preferences.get(appearanceCookie)?.value,
    preferences.get('gather-theme')?.value,
  );
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="en" {...appearanceAttributes(appearance)}>
      <head>
        <style id="gather-appearance" nonce={nonce}>
          {appearanceCSS(appearance)}
        </style>
      </head>
      <body>
        <AuthProvider>
          <App initialAppearance={appearance}>
            <Suspense fallback={<p role="status">Loading…</p>}>{children}</Suspense>
          </App>
        </AuthProvider>
      </body>
    </html>
  );
}
