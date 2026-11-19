import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache';

// The app never revalidates (no `revalidate`, no `unstable_cache`): pages are either
// prerendered at build time or rendered per request. Prerendered pages are served from
// the Workers static assets, so no R2 bucket or KV namespace is needed (NAB-127).
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
