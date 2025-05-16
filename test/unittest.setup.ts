import { vi } from 'vitest'

vi.mock('./components/routes-map.client.vue', () => ({
  default: {
    name: 'MockedMap',
    template: '<div data-testid="mocked-map">Mocked Map</div>'
  }
})) 