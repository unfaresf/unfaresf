import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../server/api');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = resolve(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const RAW_AUTHORIZE = /\bauthorize\s*\(\s*event\b/;

describe('no raw authorize(event, ...) left in server/api', () => {
  const files = walk(apiDir).filter((f) => f.endsWith('.ts'));

  it('scans a non-trivial number of handler files', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  for (const file of files) {
    it(`${file.split('/server/api/')[1]} uses authorizeRequest`, () => {
      const src = readFileSync(file, 'utf8');
      expect(RAW_AUTHORIZE.test(src)).toBe(false);
    });
  }
});
