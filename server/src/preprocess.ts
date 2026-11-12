import sharp from "sharp";

/**
 * Cleans up a phone photo so Tesseract reads it better. Tesseract wants
 * upright, high-contrast, dark-on-light text with letters ~20-40px tall,
 * on an evenly lit background (it binarizes with one global threshold).
 *
 * 1. rotate()     apply the phone's EXIF orientation, so sideways photos are upright
 * 2. resize       long side ~2000px: big enough for small print, small enough to stay fast
 * 3. grayscale    color only adds noise for OCR
 * 4. negate       if the image is mostly dark (light text on a dark flyer), invert it
 * 5. flatten      divide by a heavily blurred copy (the "lighting"), removing shadows,
 *                 glare and gradients but keeping the text
 * 6. normalize    stretch to full black-to-white range
 * 7. sharpen      crisp up letter edges blurred by the camera (skipped for tiny photos)
 */
const TARGET_LONG_SIDE = 2000;

export async function preprocessForOcr(input: Buffer): Promise<Buffer> {
  // Step 1 first, so width/height below are measured after rotation
  const upright = await sharp(input).rotate().toBuffer({ resolveWithObject: true });
  // Shrink big photos to the target; enlarge small ones at most 2.5x, since past
  // that there is no extra detail to recover and letters just get mushy
  const scale = Math.min(2.5, TARGET_LONG_SIDE / Math.max(upright.info.width, upright.info.height));
  const width = Math.round(upright.info.width * scale);
  const height = Math.round(upright.info.height * scale);

  // Enlarging a small photo also enlarges its JPEG compression blocks, and the
  // steps below would amplify them. Smooth them out first, and skip sharpening.
  const upscaled = scale > 1.5;
  let resized = sharp(upright.data).resize(width, height, { kernel: "lanczos3" }).grayscale();
  if (upscaled) resized = resized.median(5).blur(1);
  let gray = await resized.toBuffer();

  // Mean brightness 0-255. Below the midpoint means the background is dark.
  const { channels } = await sharp(gray).stats();
  if (channels[0].mean < 110) {
    gray = await sharp(gray).negate({ alpha: false }).toBuffer();
  }

  const flat = await flattenBackground(gray, width, height);
  const out = sharp(flat).normalize();
  return (upscaled ? out : out.sharpen({ sigma: 1 })).png().toBuffer();
}

/**
 * image / background, where background = the image blurred so much that the
 * text disappears and only the lighting is left. Shadowed areas get divided by
 * a small number (brightened), well-lit areas by a large one, so the background
 * ends up evenly white while dark text stays dark.
 *
 * sharp has no "divide" blend, but colour-dodge computes base / (1 - top), so
 * using the INVERTED background as the top layer gives base / background.
 */
async function flattenBackground(gray: Buffer, width: number, height: number): Promise<Buffer> {
  // Blur at 1/8 size and scale back up: same result as a huge blur, much faster
  const small = Math.max(1, Math.round(width / 8));
  const background = await sharp(gray)
    .resize(small)
    .blur(6)
    .resize(width, height)
    .negate({ alpha: false })
    .toBuffer();

  return sharp(gray)
    .composite([{ input: background, blend: "colour-dodge" }])
    .grayscale()
    .toBuffer();
}
