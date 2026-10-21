import { defineConfig } from '@vite-pwa/assets-generator/config';

// Generates the home screen icons for iOS and Android, plus favicon.ico, from
// public/unfaresf-icon.svg. Run `npm run generate-icons` after editing the SVG.
const blue = '#255a91';

export default defineConfig({
  preset: {
    // The default palette quantization leaves only a handful of colors and
    // makes the handshake's edges jagged.
    png: { compressionLevel: 9, palette: false },
    // Plain manifest icons. The SVG is already a full-bleed blue square.
    transparent: {
      sizes: [64, 192, 512],
      padding: 0,
      favicons: [[48, 'favicon.ico']],
    },
    // Android adaptive icon: shrink the handshake into the 80% safe-zone circle.
    maskable: {
      sizes: [512],
      padding: 0.2,
      resizeOptions: { background: blue },
    },
    apple: {
      sizes: [180],
      padding: 0,
      resizeOptions: { background: blue },
    },
  },
  images: ['public/unfaresf-icon.svg'],
});
