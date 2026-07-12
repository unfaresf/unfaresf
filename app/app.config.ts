export default defineAppConfig({
  ui: {
    colors: {
      primary: 'lime',
      neutral: 'neutral',
    },
    // Nuxt UI v3 form inputs are inline-flex (not full-width) by default.
    // Set width once globally instead of adding w-full to every input.
    input: { slots: { root: 'w-full' } },
    inputMenu: { slots: { root: 'w-full' } },
    textarea: { slots: { root: 'w-full' } },
    select: { slots: { base: 'w-full' } },
    selectMenu: { slots: { base: 'w-full' } },
  },
})
