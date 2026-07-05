import { describe, it, expect } from 'vitest';
import { mapIntegrationOptionSchema } from '../../db/schema';

describe('mapIntegrationOptionSchema.sourceMode', () => {
  it('defaults to tiles when omitted', () => {
    const parsed = mapIntegrationOptionSchema.parse({ type: 'map' });
    expect(parsed.sourceMode).toBe('tiles');
  });

  it('accepts geojson', () => {
    const parsed = mapIntegrationOptionSchema.parse({ type: 'map', sourceMode: 'geojson' });
    expect(parsed.sourceMode).toBe('geojson');
  });

  it('rejects unknown values', () => {
    expect(() => mapIntegrationOptionSchema.parse({ type: 'map', sourceMode: 'nope' })).toThrow();
  });
});
