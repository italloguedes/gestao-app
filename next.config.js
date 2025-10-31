/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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