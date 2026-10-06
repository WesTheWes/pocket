// Renders public/favicon.svg (the borderless tab icon) to public/favicon.ico. Runs after the
// PWA assets generator, which would otherwise write an .ico of the bordered app icon.
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import ico from 'sharp-ico'

const svg = await readFile(new URL('../public/favicon.svg', import.meta.url))
const sizes = [16, 32, 48]
await ico.sharpsToIco(
  sizes.map((size) => sharp(svg).resize(size, size)),
  new URL('../public/favicon.ico', import.meta.url).pathname,
  { sizes, resizeOptions: { fit: 'contain' } },
)
console.log(`favicon.ico written (${sizes.join(', ')} px)`)
