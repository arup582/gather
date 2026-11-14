import type { Metadata, Viewport } from 'next';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { AuthProvider } from '../auth';
import App from '../App';
import '../styles.css';
export const metadata: Metadata = {
  title: 'Gather · Bring people together',
  description: 'Gather — discover local events, meet your community, and bring people together.',
};
export const viewport: Viewport = { themeColor: '#244f41' };
export default async function RootLayout({ children }: { children: ReactNode }) {
  // Render per request so CSP nonces match the hydration scripts.
  await connection();
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <App>
            <Suspense fallback={<p role="status">Loading…</p>}>{children}</Suspense>
          </App>
        </AuthProvider>
      </body>
    </html>
  );
}
