/** Pazar kedisi: basit ama çizilmiş bir kedi, yürürken bacaklar ve kuyruk oynar (bkz. market.css). */
export const CAT_SVG = `
<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
  <g class="cat-tail-pivot">
    <path class="cat-tail" d="M22 52 C 4 50, 2 30, 16 20" fill="none" stroke="#d97a3b" stroke-width="9" stroke-linecap="round" />
  </g>
  <g class="cat-leg cat-leg-br"><rect x="66" y="56" width="10" height="22" rx="5" fill="#c96a2e" /></g>
  <g class="cat-leg cat-leg-fl"><rect x="34" y="56" width="10" height="22" rx="5" fill="#c96a2e" /></g>
  <ellipse cx="58" cy="54" rx="38" ry="20" fill="#e8853f" />
  <path d="M24 46 Q 58 62 92 46 L 92 54 Q 58 68 24 54 Z" fill="#fff3e2" opacity="0.85" />
  <g class="cat-leg cat-leg-bl"><rect x="78" y="56" width="10" height="22" rx="5" fill="#e8853f" /></g>
  <g class="cat-leg cat-leg-fr"><rect x="46" y="56" width="10" height="22" rx="5" fill="#e8853f" /></g>
  <g transform="translate(88,30)">
    <path d="M-6 -20 L4 -2 L-14 -4 Z" fill="#e8853f" />
    <path d="M18 -20 L26 -6 L8 -6 Z" fill="#e8853f" />
    <circle r="18" fill="#e8853f" />
    <path d="M-14 4 Q0 14 14 4" fill="#fff3e2" opacity="0.9" />
    <circle class="cat-eye" cx="-6" cy="-3" r="3.4" fill="#22160c" />
    <circle class="cat-eye" cx="8" cy="-3" r="3.4" fill="#22160c" />
    <path d="M0 3 l-3 3 h6 Z" fill="#c96a2e" />
    <g stroke="#fff3e2" stroke-width="1.4" opacity="0.9">
      <path d="M-8 5 L-24 2" /><path d="M-8 8 L-24 9" />
      <path d="M8 5 L24 2" /><path d="M8 8 L24 9" />
    </g>
  </g>
</svg>`;
