import { describe, it, expect } from 'vitest';
import { mapIntegrationOptionSchema } from '../../db/schema';

describe('mapIntegrationOptionSchema.sourceMode', () => {
  it('is undefined when omitted (component falls back to tiles at runtime)', () => {
    const parsed = mapIntegrationOptionSchema.parse({ type: 'map' });
    expect(parsed.sourceMode).toBeUndefined();
  });

  it('accepts geojson', () => {
    const parsed = mapIntegrationOptionSchema.parse({ type: 'map', sourceMode: 'geojson' });
    expect(parsed.sourceMode).toBe('geojson');
  });

  it('rejects unknown values', () => {
    expect(() => mapIntegrationOptionSchema.parse({ type: 'map', sourceMode: 'nope' })).toThrow();
  });
});
