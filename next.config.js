/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Proxy /api to backend so same-origin requests work (use when NEXT_PUBLIC_API_BASE_URL is unset)
  async rewrites() {
    const backend = process.env.BACKEND_URL || "http://127.0.0.1:8000"
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }]
  },
}

module.exports = nextConfig
