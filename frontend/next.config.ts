import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
  async rewrites() {
    const backend = `http://${process.env.GATHER_API_HOST || '127.0.0.1'}:8080`;
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
};
export default config;
