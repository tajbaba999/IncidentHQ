/** @type {import('next').NextConfig} */
const nextConfig = {
    // Self-contained server bundle for the Docker self-host image;
    // ignored by Vercel, which uses its own output format.
    output: 'standalone',
}

export default nextConfig
