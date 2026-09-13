export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  /** Aygıt pikseli cinsinden tuval ölçüleri. */
  w: number;
  h: number;
  dpr: number;
  size: number;
  cell: number;
  /** Tezgâh boyundan bağımsız tepsi ölçüsü (9'luk tahtadaki hücre). */
  unit: number;
  board: Rect;
  tray: Rect;
  holds: Rect[];
  slots: Rect[];
  preview: Rect[];
}

export function computeLayout(w: number, h: number, dpr: number, size: number, holdCount: number): Layout {
  const pad = Math.round(8 * dpr);
  const gap = Math.round(12 * dpr);
  const inner = w - pad * 2;
  const unit = inner / 9;

  // Tepsi en altta (başparmağa yakın); tahta üstteki alanda ortalanır.
  const trayTarget = unit * 3.4;
  const boardPx = Math.max(size * 8, Math.min(inner, h - pad * 2 - gap - trayTarget));
  const cell = Math.floor(boardPx / size);
  const boardSize = cell * size;
  const trayH = Math.min(trayTarget, Math.max(unit * 1.6, h - pad * 2 - gap - boardSize));
  const tray: Rect = { x: pad, y: h - pad - trayH, w: inner, h: trayH };
  const free = tray.y - gap - pad - boardSize;
  const board: Rect = { x: Math.round((w - boardSize) / 2), y: pad + Math.max(0, free * 0.5), w: boardSize, h: boardSize };

  const ig = Math.round(6 * dpr);
  const holdW = Math.round(tray.w * 0.165);
  const prevW = Math.round(tray.w * 0.155);
  const slotW = Math.floor((tray.w - holdW - prevW - gap * 2 - ig * 2) / 3);
  const slotsX = tray.x + holdW + gap;

  const holdH = Math.floor((tray.h - ig * (holdCount - 1)) / holdCount);
  const holds: Rect[] = Array.from({ length: holdCount }, (_, i) => ({
    x: tray.x,
    y: tray.y + i * (holdH + ig),
    w: holdW,
    h: holdH,
  }));
  const slots: Rect[] = [0, 1, 2].map((i) => ({ x: slotsX + i * (slotW + ig), y: tray.y, w: slotW, h: tray.h }));
  const prevH = Math.floor((tray.h - ig) / 2);
  const preview: Rect[] = [0, 1].map((i) => ({ x: tray.x + tray.w - prevW, y: tray.y + i * (prevH + ig), w: prevW, h: prevH }));

  return { w, h, dpr, size, cell, unit, board, tray, holds, slots, preview };
}

/** Bir parçanın kutuya sığacak hücre boyu. */
export function fitCell(box: Rect, pw: number, ph: number, max: number): number {
  return Math.min(max, (box.w * 0.82) / pw, (box.h * 0.82) / ph);
}

export function boardCell(layout: Layout, px: number, py: number): { x: number; y: number } | null {
  const x = Math.floor((px - layout.board.x) / layout.cell);
  const y = Math.floor((py - layout.board.y) / layout.cell);
  if (x < 0 || y < 0 || x >= layout.size || y >= layout.size) return null;
  return { x, y };
}

export function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h;
}
