/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['eudata', 'eudata-common', 'czechdata', 'slovakdata', 'polishdata'],
}

export default nextConfig
