/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    // Older links (home page hero) point here; the form lives under the parent dashboard.
    return [{ source: '/requests/new', destination: '/parent/requests/new', permanent: false }];
  },
};

export default nextConfig;
