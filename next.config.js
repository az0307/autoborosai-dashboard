/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel optimized configuration
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },

  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      'lucide-react',
      'lodash',
      'date-fns',
      'recharts',
      'framer-motion'
    ]
  },

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.autoborosai.com.au',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'wss://api.autoborosai.com.au',
    NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || 'production',
    NEXT_PUBLIC_DOMAIN: 'autoborosai.com.au',
    NEXT_PUBLIC_OWNER_NAME: 'BAKER, AARON JAMES REGINALD',
    NEXT_PUBLIC_ABN: '15870917390',
  },

  transpilePackages: [],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      }
    }
    return config
  },

  poweredByHeader: false,
  reactStrictMode: true,
}

module.exports = nextConfig