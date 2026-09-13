/** Karaköy'den bakınca tarihi yarımada ve Galata; ortada DALYAN teknesi. Tamamen kodla çizilir. */
export const SKYLINE_SVG = `
<svg viewBox="0 0 360 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0c2b52"/>
      <stop offset="1" stop-color="#071a33"/>
    </linearGradient>
  </defs>
  <path d="M0 76 Q40 62 80 70 T160 68 T240 64 T360 70 V96 H0Z" fill="#132a55"/>
  <g fill="#0b1733">
    <rect x="38" y="42" width="4" height="44"/><path d="M38 42 L40 30 L42 42Z"/>
    <rect x="98" y="42" width="4" height="44"/><path d="M98 42 L100 30 L102 42Z"/>
    <path d="M50 86 V64 Q70 38 90 64 V86Z"/>
    <path d="M44 86 V72 Q52 62 60 72 V86Z"/>
    <path d="M80 86 V72 Q88 62 96 72 V86Z"/>
    <rect x="68" y="44" width="4" height="6"/>
  </g>
  <path d="M108 86 V76 H122 V70 H138 V78 H152 V72 H172 V86Z M186 86 V74 H202 V68 H218 V76 H236 V86Z M280 86 V72 H296 V78 H312 V68 H334 V86Z" fill="#0e1d40"/>
  <g fill="#0b1733">
    <rect x="252" y="44" width="16" height="42"/>
    <path d="M249 46 L260 20 L271 46Z"/>
    <rect x="250" y="44" width="20" height="3"/>
  </g>
  <g fill="#ffd27a" opacity="0.85">
    <rect x="256" y="54" width="2" height="3"/><rect x="262" y="54" width="2" height="3"/>
    <rect x="256" y="64" width="2" height="3"/><rect x="126" y="76" width="2" height="2"/>
    <rect x="206" y="74" width="2" height="2"/><rect x="300" y="76" width="2" height="2"/>
  </g>
  <rect x="0" y="86" width="360" height="34" fill="url(#sea)"/>
  <path class="wave" d="M0 94 Q20 91 40 94 T80 94 T120 94 T160 94 T200 94 T240 94 T280 94 T320 94 T360 94 T400 94" stroke="#1f4f82" stroke-width="1.2" fill="none"/>
  <g class="boat">
    <g transform="translate(146 74)">
      <rect x="29" y="-14" width="2" height="16" fill="#d9c9a3"/>
      <path d="M31 -13 L44 -4 L31 -4Z" fill="#ffc857"/>
      <path d="M0 10 H64 L55 23 H9Z" fill="#e8553a"/>
      <path d="M0 10 H64 L62 13 H2Z" fill="#ffffff" opacity="0.35"/>
      <rect x="18" y="0" width="24" height="10" rx="2" fill="#f1e6c8"/>
      <rect x="22" y="3" width="6" height="4" fill="#7fb6e0"/>
      <rect x="32" y="3" width="6" height="4" fill="#7fb6e0"/>
      <text x="32" y="20" font-size="6.2" text-anchor="middle" fill="#fff" font-weight="800" letter-spacing="0.6">DALYAN</text>
    </g>
  </g>
</svg>`;
