/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  devIndicators: {
    buildActivity: false,
  },
  async redirects() {
    return [
      { source: '/apply', destination: '/upload', permanent: false },
      { source: '/menu', destination: '/', permanent: false },
    ]
  },
}

export default nextConfig
