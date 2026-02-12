/** @type {import('next').NextConfig} */
const nextConfig = {
  // GitHub Pages static export
  output: 'export',

  images: {
    unoptimized: true, // Required for static export
  },

  basePath: '',
  assetPrefix: '',
  trailingSlash: true,

  experimental: {
    optimizeCss: true,
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