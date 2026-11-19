// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// Guards the Cloudflare Workers setup (NAB-127): see DEPLOYMENT.md.
vi.mock('@opennextjs/cloudflare', () => ({ initOpenNextCloudflareForDev: vi.fn() }));

const root = path.resolve(__dirname, '../..');
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');

// wrangler.jsonc only uses whole-line // comments.
const wrangler = JSON.parse(
  read('wrangler.jsonc')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n'),
);

describe('wrangler.jsonc', () => {
  it('names the worker nabni and enables Node.js compatibility', () => {
    expect(wrangler.name).toBe('nabni');
    expect(wrangler.compatibility_flags).toContain('nodejs_compat');
    expect(wrangler.compatibility_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('runs the OpenNext worker and serves its static assets', () => {
    expect(wrangler.main).toBe('.open-next/worker.js');
    expect(wrangler.assets).toEqual({ directory: '.open-next/assets', binding: 'ASSETS' });
  });

  it('points the self-reference binding at this worker', () => {
    expect(wrangler.services).toContainEqual({ binding: 'WORKER_SELF_REFERENCE', service: 'nabni' });
  });
});

describe('next.config.mjs', () => {
  it('serves images unoptimized, since Workers has no Next image optimizer', async () => {
    const { default: config } = await import('../../next.config.mjs');
    expect(config.images?.unoptimized).toBe(true);
  });

  it('keeps the /requests/new redirect', async () => {
    const { default: config } = await import('../../next.config.mjs');
    expect(await config.redirects?.()).toContainEqual({
      source: '/requests/new',
      destination: '/parent/requests/new',
      permanent: false,
    });
  });
});

describe('package.json scripts', () => {
  const { scripts } = JSON.parse(read('package.json')) as { scripts: Record<string, string> };

  it('builds with OpenNext before previewing or deploying', () => {
    expect(scripts.preview).toBe('opennextjs-cloudflare build && opennextjs-cloudflare preview');
    expect(scripts.deploy).toBe('opennextjs-cloudflare build && opennextjs-cloudflare deploy');
    expect(scripts['cf-typegen']).toContain('wrangler types');
  });

  it('keeps the plain Next.js scripts', () => {
    expect(scripts.dev).toBe('next dev');
    expect(scripts.build).toBe('next build');
  });
});

describe('CI deploy job', () => {
  const ci = read('.github/workflows/ci.yml');
  const deploy = ci.slice(ci.indexOf('\n  deploy:'));

  it('runs only for pushes to main, after the checks and UI tests', () => {
    expect(deploy).toContain("if: github.event_name == 'push' && github.ref == 'refs/heads/main'");
    expect(deploy).toContain('needs: [check, e2e]');
  });

  it('uses the Cloudflare and Supabase secrets and skips with a warning without them', () => {
    for (const name of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']) {
      expect(deploy).toContain(`${name}: \${{ secrets.${name} }}`);
    }
    expect(deploy).toContain('::warning::Deploy skipped');
    expect(deploy).toContain("if: steps.secrets.outputs.ready == 'true'");
    expect(deploy).toContain('run: npm run deploy');
  });
});

describe('.gitignore', () => {
  it('keeps the OpenNext and Wrangler output and local secrets out of git', () => {
    const ignore = read('.gitignore').split(/\r?\n/);
    expect(ignore).toEqual(expect.arrayContaining(['/.open-next/', '/.wrangler/', '.dev.vars*']));
  });
});
