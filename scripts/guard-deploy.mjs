#!/usr/bin/env node
/**
 * Deploy guards for `npm run deploy` (NAB-127). See DEPLOYMENT.md.
 *
 * OpenNext copies the values of the project's .env files (.env, .env.local, .env.<mode>*) into the
 * worker bundle (.open-next/cloudflare/next-env.mjs). On a developer machine .env.local holds the
 * e2e account passwords, so a local deploy would upload them to Cloudflare. Two checks stop that:
 *
 *   node scripts/guard-deploy.mjs env      before the build: only CI may deploy, unless
 *                                          NABNI_ALLOW_LOCAL_DEPLOY=1 is set on purpose.
 *   node scripts/guard-deploy.mjs bundle   after the build: the bundle may inline only NEXT_PUBLIC_*
 *                                          variables and must not name any secret variable.
 *
 * Messages name variables and files, never their values.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const OVERRIDE_ENV = 'NABNI_ALLOW_LOCAL_DEPLOY';

/** Variable names that must never reach the worker bundle. */
const FORBIDDEN_NAME = /\b(?:E2E_[A-Z0-9_]+|[A-Z0-9_]*SERVICE_ROLE[A-Z0-9_]*|[A-Z0-9_]*_SECRET[A-Z0-9_]*)\b/g;

/** Text files in the build output worth scanning. */
const SCANNED_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.json', '.html', '.txt']);

/**
 * Whether this environment may deploy.
 * @param {Record<string, string | undefined>} env
 * @returns {{ ok: boolean, message: string }}
 */
export function checkDeployAllowed(env) {
  if (env.CI === 'true') return { ok: true, message: 'Deploying from CI.' };
  if (env[OVERRIDE_ENV] === '1') {
    return {
      ok: true,
      message: `${OVERRIDE_ENV}=1: deploying from this machine. The bundle is still checked for secrets.`,
    };
  }
  return {
    ok: false,
    message: [
      'Refusing to deploy: `npm run deploy` runs only in CI (CI=true).',
      'Locally OpenNext would copy .env.local (with the e2e passwords) into the worker bundle.',
      'Push to main and let CI deploy (see DEPLOYMENT.md).',
      `If you really must deploy from this machine, move .env.local aside and set ${OVERRIDE_ENV}=1.`,
    ].join('\n'),
  };
}

/**
 * Secret-looking variable names (E2E_*, *SERVICE_ROLE*, *_SECRET*) found in a piece of text.
 * @param {string} text
 * @returns {string[]}
 */
export function findForbiddenNames(text) {
  return [...new Set(text.match(FORBIDDEN_NAME) ?? [])].sort();
}

/**
 * Keys in OpenNext's next-env.mjs that are not NEXT_PUBLIC_*. The file is a list of
 * `export const <mode> = <JSON>;` lines. Anything unparseable fails closed.
 * @param {string} source
 * @returns {string[]}
 */
export function findNonPublicEnvKeys(source) {
  const keys = new Set();
  for (const line of source.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const match = /^export const \w+ = (.*);$/.exec(line.trim());
    if (!match) throw new Error('next-env.mjs has an unexpected format; refusing to deploy.');
    const vars = JSON.parse(match[1]);
    for (const key of Object.keys(vars)) {
      if (!key.startsWith('NEXT_PUBLIC_')) keys.add(key);
    }
  }
  return [...keys].sort();
}

/** @param {string} dir @returns {string[]} */
function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

/**
 * Problems in a built OpenNext output directory (empty when it is safe to deploy).
 * @param {string} outputDir the .open-next directory
 * @returns {string[]}
 */
export function scanBundle(outputDir) {
  const nextEnv = path.join(outputDir, 'cloudflare', 'next-env.mjs');
  if (!existsSync(nextEnv)) {
    return [`${path.relative(process.cwd(), nextEnv)} not found: build with OpenNext before deploying.`];
  }

  const problems = [];
  try {
    const keys = findNonPublicEnvKeys(readFileSync(nextEnv, 'utf8'));
    if (keys.length) {
      problems.push(`next-env.mjs inlines non-public variables: ${keys.join(', ')} (only NEXT_PUBLIC_* are allowed).`);
    }
  } catch (error) {
    problems.push(error instanceof Error ? error.message : String(error));
  }

  for (const file of listFiles(outputDir)) {
    if (!SCANNED_EXTENSIONS.has(path.extname(file))) continue;
    const names = findForbiddenNames(readFileSync(file, 'utf8'));
    if (names.length) problems.push(`${path.relative(outputDir, file)} names ${names.join(', ')}.`);
  }
  return problems;
}

/** @param {string[]} argv */
function main(argv) {
  const [step, dir = '.open-next'] = argv;
  if (step === 'env') {
    const { ok, message } = checkDeployAllowed(process.env);
    (ok ? console.log : console.error)(message);
    return ok ? 0 : 1;
  }
  if (step === 'bundle') {
    const problems = scanBundle(path.resolve(dir));
    if (!problems.length) {
      console.log('Bundle check passed: no secret variables in the worker bundle.');
      return 0;
    }
    console.error(['Refusing to deploy: the worker bundle contains secrets.', ...problems.map((p) => `  - ${p}`)].join('\n'));
    console.error('Build from a checkout without .env.local (as CI does) and try again.');
    return 1;
  }
  console.error('Usage: node scripts/guard-deploy.mjs <env|bundle> [outputDir]');
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
