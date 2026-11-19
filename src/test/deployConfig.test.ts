// @vitest-environment node
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkDeployAllowed,
  findForbiddenNames,
  findNonPublicEnvKeys,
  scanBundle,
} from '../../scripts/guard-deploy.mjs';

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

  it('deploys only after the CI guard, the OpenNext build and the bundle scan, in that order', () => {
    expect(scripts.deploy).toBe(
      'node scripts/guard-deploy.mjs env && opennextjs-cloudflare build && node scripts/guard-deploy.mjs bundle && opennextjs-cloudflare deploy',
    );
    expect(scripts['cf-typegen']).toContain('wrangler types');
  });

  it('previews locally and never deploys', () => {
    expect(scripts.preview).toBe('opennextjs-cloudflare build && opennextjs-cloudflare preview');
    expect(scripts.preview).not.toMatch(/deploy|upload/);
  });

  it('keeps the plain Next.js scripts', () => {
    expect(scripts.dev).toBe('next dev');
    expect(scripts.build).toBe('next build');
  });
});

describe('CI concurrency (NAB-140)', () => {
  const ci = read('.github/workflows/ci.yml');
  const workflowLevel = ci.slice(0, ci.indexOf('\njobs:'));

  it('cancels superseded runs except on main, where a run may be deploying', () => {
    expect(workflowLevel).toContain('group: ci-${{ github.ref }}');
    expect(workflowLevel).toContain("cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}");
    expect(workflowLevel).not.toContain('cancel-in-progress: true');
  });

  it('keeps one production deploy at a time, never cancelled halfway', () => {
    const deploy = ci.slice(ci.indexOf('\n  deploy:'));
    expect(deploy).toMatch(/concurrency:\s+group: deploy-production\s+cancel-in-progress: false/);
  });
});

describe('CI deploy job', () => {
  const ci = read('.github/workflows/ci.yml');
  const deploy = ci.slice(ci.indexOf('\n  deploy:'));

  it('runs only for pushes to main, after the checks and UI tests', () => {
    expect(deploy).toContain("if: github.event_name == 'push' && github.ref == 'refs/heads/main'");
    // Paused until the Gulf launch: only runs when the DEPLOY_ENABLED repo variable is "true" (NAB-149).
    expect(deploy).toContain("&& vars.DEPLOY_ENABLED == 'true'");
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

describe('deploy guard: who may deploy', () => {
  it('refuses without CI and explains why', () => {
    const result = checkDeployAllowed({});
    expect(result.ok).toBe(false);
    expect(result.message).toContain('runs only in CI');
    expect(result.message).toContain('NABNI_ALLOW_LOCAL_DEPLOY=1');
  });

  it('refuses when CI is set to anything but true', () => {
    expect(checkDeployAllowed({ CI: 'false' }).ok).toBe(false);
    expect(checkDeployAllowed({ CI: '' }).ok).toBe(false);
    expect(checkDeployAllowed({ NABNI_ALLOW_LOCAL_DEPLOY: 'yes' }).ok).toBe(false);
  });

  it('allows CI=true', () => {
    expect(checkDeployAllowed({ CI: 'true' }).ok).toBe(true);
  });

  it('allows an explicit local override', () => {
    expect(checkDeployAllowed({ NABNI_ALLOW_LOCAL_DEPLOY: '1' })).toEqual({
      ok: true,
      message: expect.stringContaining('still checked for secrets'),
    });
  });
});

describe('deploy guard: bundle scan', () => {
  const fakeEnv = (vars: Record<string, string>) =>
    ['production', 'development', 'test'].map((mode) => `export const ${mode} = ${JSON.stringify(vars)};\n`).join('');

  let dir = '';
  const makeBundle = (nextEnv: string, worker = 'export default {};') => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'nabni-bundle-'));
    mkdirSync(path.join(dir, 'cloudflare'));
    writeFileSync(path.join(dir, 'cloudflare', 'next-env.mjs'), nextEnv);
    writeFileSync(path.join(dir, 'worker.js'), worker);
    return dir;
  };
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = '';
  });

  it('names secret-looking variables, never their values', () => {
    expect(
      findForbiddenNames('{"E2E_PARENT_PASSWORD":"hunter2","SUPABASE_SERVICE_ROLE_KEY":"x","JWT_SECRET":"y"}'),
    ).toEqual(['E2E_PARENT_PASSWORD', 'JWT_SECRET', 'SUPABASE_SERVICE_ROLE_KEY']);
    expect(findForbiddenNames('{"NEXT_PUBLIC_SUPABASE_URL":"https://x.supabase.co"}')).toEqual([]);
  });

  it('allows only NEXT_PUBLIC_* keys in next-env.mjs', () => {
    expect(findNonPublicEnvKeys(fakeEnv({ NEXT_PUBLIC_SUPABASE_URL: 'u', OTHER: 'v' }))).toEqual(['OTHER']);
    expect(findNonPublicEnvKeys(fakeEnv({ NEXT_PUBLIC_SUPABASE_URL: 'u' }))).toEqual([]);
    expect(() => findNonPublicEnvKeys('module.exports = {}')).toThrow(/unexpected format/);
  });

  it('flags a bundle that inlines E2E_PARENT_PASSWORD, without printing the value', () => {
    const problems = scanBundle(
      makeBundle(fakeEnv({ NEXT_PUBLIC_SUPABASE_URL: 'u', E2E_PARENT_PASSWORD: 'hunter2' })),
    );
    const report = problems.join(' ');
    expect(report).toContain('E2E_PARENT_PASSWORD');
    expect(report).not.toContain('hunter2');
  });

  it('flags a secret name anywhere in the worker output', () => {
    const problems = scanBundle(makeBundle(fakeEnv({}), 'process.env.SUPABASE_SERVICE_ROLE_KEY'));
    expect(problems).toEqual([expect.stringContaining('SUPABASE_SERVICE_ROLE_KEY')]);
  });

  it('passes a clean bundle (CI has no .env files)', () => {
    expect(scanBundle(makeBundle(fakeEnv({})))).toEqual([]);
  });

  it('passes a bundle that inlines only NEXT_PUBLIC_* variables', () => {
    expect(scanBundle(makeBundle(fakeEnv({ NEXT_PUBLIC_SUPABASE_URL: 'u', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'k' })))).toEqual([]);
  });

  it('fails closed when the bundle was not built', () => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'nabni-bundle-'));
    expect(scanBundle(dir)).toEqual([expect.stringContaining('not found')]);
  });
});
