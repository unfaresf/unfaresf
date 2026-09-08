import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, relative, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const serverDir = resolve(here, '../../server');
const apiDir = resolve(serverDir, 'api');
const appDir = resolve(here, '../../app');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = resolve(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const RAW_AUTHORIZE = /\bauthorize\s*\(\s*event\b/;
const USES_AUTHORIZE_REQUEST = /authorizeRequest\s*\(\s*event\b/;

// Handlers that are intentionally unauthenticated (the webauthn sign-in flows
// themselves — they cannot require a session to establish one).
const NO_AUTH_HANDLERS = new Set([
  'webauthn/authenticate.post.ts',
  'webauthn/register.post.ts',
]);

describe('no raw authorize(event, ...) left anywhere under server/', () => {
  const serverFiles = walk(serverDir).filter((f) => f.endsWith('.ts'));

  it('scans a non-trivial number of server files', () => {
    expect(serverFiles.length).toBeGreaterThan(20);
  });

  it('has zero raw authorize(event, ...) matches', () => {
    const offenders = serverFiles.filter((f) => RAW_AUTHORIZE.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});

describe('every server/api handler calls authorizeRequest (or is allow-listed)', () => {
  const apiFiles = walk(apiDir).filter((f) => f.endsWith('.ts'));

  it('scans a non-trivial number of handler files', () => {
    expect(apiFiles.length).toBeGreaterThan(20);
  });

  for (const file of apiFiles) {
    const rel = relative(apiDir, file);
    it(`${rel} ${NO_AUTH_HANDLERS.has(rel) ? 'is intentionally unauthenticated' : 'uses authorizeRequest'}`, () => {
      const src = readFileSync(file, 'utf8');
      expect(RAW_AUTHORIZE.test(src)).toBe(false);
      if (!NO_AUTH_HANDLERS.has(rel)) {
        expect(USES_AUTHORIZE_REQUEST.test(src)).toBe(true);
      }
    });
  }
});

describe('client files that override onResponseError forward 401s', () => {
  // A page's per-call `onResponseError` REPLACES the global $fetch guard (ofetch
  // merges options as {...defaults, ...input}), so any file that overrides it
  // must route 401s through `reportNonAuthError` — otherwise the forced-logout
  // fix silently regresses on that call site.
  const GUARD_PLUGIN = relative(appDir, resolve(here, '../../app/plugins/api-auth-guard.client.ts'));

  const appFiles = walk(appDir).filter((f) => /\.(ts|vue)$/.test(f));
  const overriding = appFiles.filter((f) => {
    const rel = relative(appDir, f);
    return rel !== GUARD_PLUGIN && /onResponseError\s*\(/.test(readFileSync(f, 'utf8'));
  });

  for (const file of overriding) {
    it(`${relative(appDir, file)} forwards 401s via reportNonAuthError`, () => {
      expect(readFileSync(file, 'utf8')).toMatch(/reportNonAuthError/);
    });
  }
});