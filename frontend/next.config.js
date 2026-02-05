/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required: assignDefaults only merges userConfig keys; must return a string (Next.js 14)
  generateBuildId: async () => process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString(),
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
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















































