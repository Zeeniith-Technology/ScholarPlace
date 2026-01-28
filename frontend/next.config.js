/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  transpilePackages: ['recharts'],
  webpack: (config, { isServer }) => {
    // Monaco Editor webpack configuration
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
}

module.exports = nextConfig















































