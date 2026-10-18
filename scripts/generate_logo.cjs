const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 560" width="500" height="560" fill="none">
  <defs>
    <!-- Crest Gradients -->
    <linearGradient id="crestDarkRim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#024D26" />
      <stop offset="60%" stop-color="#006A35" />
      <stop offset="100%" stop-color="#008A42" />
    </linearGradient>

    <linearGradient id="crestMain" x1="15%" y1="10%" x2="85%" y2="90%">
      <stop offset="0%" stop-color="#008E44" />
      <stop offset="45%" stop-color="#00A850" />
      <stop offset="100%" stop-color="#007537" />
    </linearGradient>

    <linearGradient id="crestHighlight" x1="0%" y1="0%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#22C55E" />
      <stop offset="100%" stop-color="#15803D" />
    </linearGradient>

    <linearGradient id="lowerHillGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#008840" />
      <stop offset="50%" stop-color="#16A34A" />
      <stop offset="100%" stop-color="#22C55E" />
    </linearGradient>

    <filter id="logoShadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#023A20" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- CREST EMBLEM GROUP -->
  <g id="crest-emblem" filter="url(#logoShadow)">
    <!-- Outer Shield / Pick Silhouette -->
    <path
      d="M 250 365
         C 215 320, 105 210, 105 135
         C 105 60, 160 30, 250 30
         C 340 30, 395 60, 395 135
         C 395 210, 285 320, 250 365
         Z"
      fill="url(#crestDarkRim)"
    />

    <!-- Inner Shield Body with layered 3D depth -->
    <path
      d="M 250 355
         C 218 312, 115 208, 115 136
         C 115 68, 166 40, 250 40
         C 334 40, 385 68, 385 136
         C 385 208, 282 312, 250 355
         Z"
      fill="url(#crestMain)"
    />

    <!-- Top-Left Inner Arc Shadow / Depth Layer -->
    <path
      d="M 125 125
         C 125 75, 170 48, 245 44
         C 195 55, 160 90, 150 145
         C 140 200, 185 255, 250 355
         C 220 315, 125 210, 125 125
         Z"
      fill="#01522A"
      opacity="0.85"
    />

    <!-- Right Side Bright Crest Layer -->
    <path
      d="M 250 40
         C 325 40, 385 70, 385 136
         C 385 205, 290 305, 250 355
         C 275 305, 360 215, 360 140
         C 360 85, 315 50, 250 40
         Z"
      fill="url(#crestHighlight)"
      opacity="0.9"
    />

    <!-- Lower Dynamic Curved Grass Hill -->
    <path
      d="M 160 290
         C 200 240, 270 210, 380 200
         C 375 225, 360 255, 340 280
         C 300 325, 260 350, 250 355
         C 235 335, 195 310, 160 290
         Z"
      fill="url(#lowerHillGrad)"
    />

    <!-- White Curved Turf Track Lines / Swooshes -->
    <!-- Primary lower white arc -->
    <path
      d="M 220 338
         C 245 305, 285 270, 362 238"
      stroke="#FFFFFF"
      stroke-width="9"
      stroke-linecap="round"
      fill="none"
    />
    <!-- Secondary upper white arc -->
    <path
      d="M 250 300
         C 275 268, 318 238, 380 220"
      stroke="#FFFFFF"
      stroke-width="5.5"
      stroke-linecap="round"
      fill="none"
      opacity="0.95"
    />

    <!-- Stylized Central White Letter T -->
    <!-- Horizontal Crossbar with smooth rounded pill caps -->
    <path
      d="M 175 142
         C 175 125, 190 120, 215 120
         L 320 120
         C 342 120, 355 126, 355 140
         C 355 154, 342 160, 320 160
         L 282 160
         C 278 160, 275 163, 275 168
         L 272 260
         C 271 278, 258 290, 240 289
         C 222 288, 212 274, 213 258
         L 216 168
         C 216 163, 213 160, 208 160
         L 195 160
         C 182 160, 175 155, 175 142
         Z"
      fill="#FFFFFF"
    />
  </g>

  <!-- SOCCER BALL (Football) at Top-Right Cusp -->
  <g id="soccer-ball" transform="translate(325, 75)">
    <!-- White outer rim / glow -->
    <circle cx="0" cy="0" r="39" fill="#FFFFFF" stroke="#005A2B" stroke-width="3.5" />

    <!-- Center Black Pentagon -->
    <polygon points="0,-16 15,-5 9,13 -9,13 -15,-5" fill="#111827" />

    <!-- Five connecting seam lines from center pentagon -->
    <line x1="0" y1="-16" x2="0" y2="-37" stroke="#111827" stroke-width="3" stroke-linecap="round" />
    <line x1="15" y1="-5" x2="35" y2="-12" stroke="#111827" stroke-width="3" stroke-linecap="round" />
    <line x1="9" y1="13" x2="22" y2="31" stroke="#111827" stroke-width="3" stroke-linecap="round" />
    <line x1="-9" y1="13" x2="-22" y2="31" stroke="#111827" stroke-width="3" stroke-linecap="round" />
    <line x1="-15" y1="-5" x2="-35" y2="-12" stroke="#111827" stroke-width="3" stroke-linecap="round" />

    <!-- Outer perimeter black pentagon patches -->
    <path d="M -16 -34 L 0 -37 L 16 -34 L 12 -25 L -12 -25 Z" fill="#111827" />
    <path d="M 35 -12 L 38 6 L 27 15 L 22 2 L 28 -7 Z" fill="#111827" />
    <path d="M 22 31 L 4 38 L -4 38 L 4 25 L 17 22 Z" fill="#111827" />
    <path d="M -22 31 L -17 22 L -4 25 L -4 38 Z" fill="#111827" />
    <path d="M -35 -12 L -28 -7 L -22 2 L -27 15 L -38 6 Z" fill="#111827" />
  </g>

  <!-- WORDMARK: TurfBD -->
  <g id="wordmark" transform="translate(250, 455)" text-anchor="middle">
    <text font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="78" letter-spacing="-1.5">
      <tspan fill="#043D22">Turf</tspan><tspan fill="#00B050">BD</tspan>
    </text>
  </g>

  <!-- TAGLINE: PLAY MORE. LIVE BETTER. -->
  <g id="tagline" transform="translate(250, 505)" text-anchor="middle">
    <text font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-weight="800" font-size="16.5" fill="#1E293B" letter-spacing="5.5">PLAY MORE. LIVE BETTER.</text>
  </g>
</svg>
`;

async function main() {
  const publicDir = path.resolve(__dirname, '../public');
  const distDir = path.resolve(__dirname, '../dist');

  fs.writeFileSync(path.join(publicDir, 'turflogo.svg'), svg);
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), svg);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svg);

  const svgBuf = Buffer.from(svg);

  // Render high-resolution raster files
  await sharp(svgBuf).resize(1000, 1120).png().toFile(path.join(publicDir, 'turflogo.png'));
  await sharp(svgBuf).resize(1000, 1120).png().toFile(path.join(publicDir, 'logo.png'));
  await sharp(svgBuf).resize(1000, 1120).png().toFile(path.join(publicDir, 'logo-dark.png'));
  await sharp(svgBuf).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(svgBuf).resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(publicDir, 'favicon-32x32.png'));

  // Also sync to dist if dist exists
  if (fs.existsSync(distDir)) {
    await sharp(svgBuf).resize(1000, 1120).png().toFile(path.join(distDir, 'turflogo.png'));
    await sharp(svgBuf).resize(1000, 1120).png().toFile(path.join(distDir, 'logo.png'));
    await sharp(svgBuf).resize(1000, 1120).png().toFile(path.join(distDir, 'logo-dark.png'));
    fs.writeFileSync(path.join(distDir, 'turflogo.svg'), svg);
  }

  console.log('Logo generated successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
