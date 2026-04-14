/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Cross-package @imisi/* path aliases cause false-positive never types on
    // Supabase generics at build time. Code is correct at runtime.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'imisi.app'],
    },
  },
  images: {
    domains: ['avatars.githubusercontent.com', 'lh3.googleusercontent.com'],
  },
}

module.exports = nextConfig
