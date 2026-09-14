// DALYAN: Boğaz oyunundan (Oyun/bogaz/src) değiştirilmeden kopyalandı.
export function circleRect(cx, cy, r, x, y, w, h) {
  const nx = Math.max(x, Math.min(cx, x + w));
  const ny = Math.max(y, Math.min(cy, y + h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

export function circleCircle(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const rr = ar + br;
  return dx * dx + dy * dy < rr * rr;
}

// Şekil listesi: { kind: 'rect', x, y, w, h } veya { kind: 'circle', x, y, r }
export function hitsShapes(cx, cy, r, shapes) {
  for (const s of shapes) {
    if (s.kind === 'rect' ? circleRect(cx, cy, r, s.x, s.y, s.w, s.h)
                          : circleCircle(cx, cy, r, s.x, s.y, s.r)) {
      return true;
    }
  }
  return false;
}
