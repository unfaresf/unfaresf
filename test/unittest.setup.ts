import { defineComponent } from 'vue'
import { mockComponent } from '@nuxt/test-utils/runtime';

mockComponent('RoutesMap', () => {
  return defineComponent(
    {
      default: {
        name: 'RoutesMap',
        template: '<div data-testid="mocked-map">Mocked Map</div>'
      }
    }
  )}
);