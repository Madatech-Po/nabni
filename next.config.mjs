import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Workers has no Next.js image optimizer (NAB-127); the few images are local
  // files in public/, so serve them as they are rather than pay for Cloudflare Images.
  images: { unoptimized: true },
  async redirects() {
    // Older links (home page hero) point here; the form lives under the parent dashboard.
    return [{ source: '/requests/new', destination: '/parent/requests/new', permanent: false }];
  },
};

export default nextConfig;

// Lets `next dev` use the Cloudflare bindings from wrangler.jsonc (OpenNext setup).
initOpenNextCloudflareForDev();
