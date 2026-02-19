/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "frame-ancestors 'none'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "style-src 'self' 'unsafe-inline'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.vercel.app",
              "object-src 'none'",
              "form-action 'self'",
              'upgrade-insecure-requests'
            ].join('; ')
          }
        ]
      }
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tse2.mm.bing.net',
      },
      {
        protocol: 'https',
        hostname: 'tse1.mm.bing.net',
      },
      {
        protocol: 'https',
        hostname: 'tse3.mm.bing.net',
      },
      {
        protocol: 'https',
        hostname: 'tse4.mm.bing.net',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'salasensorial.com.br',
      },
      {
        protocol: 'https',
        hostname: 'lamenteesmaravillosa.com',
      }
    ],
  },
  // ESLint is now configured via .eslintrc.json
  // TypeScript checking is enabled by default in Next.js 16+
  typescript: {
    // ✅ TypeScript strict habilitado - erros bloquearão o build
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig 
