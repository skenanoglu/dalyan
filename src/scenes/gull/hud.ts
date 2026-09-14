import { catchCount } from '../../app/catch';
import { W, type GullGame } from './game';

type Ctx = CanvasRenderingContext2D;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx: Ctx, s: string, x: number, y: number, size: number, color = '#fff', align: CanvasTextAlign = 'center', weight = 800): void {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(3, size / 7);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(8,18,38,0.55)';
  ctx.strokeText(s, x, y);
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

/** Martı sahnesinin tuval üstü bilgileri (Boğaz'ın drawHUD'undan sadeleştirildi). */
export function drawHud(ctx: Ctx, g: GullGame): void {
  const p = g.player;

  text(ctx, String(g.score), W / 2, 56, 40, '#fff', 'center', 900);

  // kova ve can simidi
  const bucket = catchCount(g.school.catch, true);
  rr(ctx, 10, 12, 74, 30, 15);
  ctx.fillStyle = 'rgba(5,25,50,0.5)';
  ctx.fill();
  text(ctx, `🪣 ${bucket}`, 47, 28, 15);
  if (g.o.simit > 0) {
    rr(ctx, W - 84, 12, 74, 30, 15);
    ctx.fillStyle = 'rgba(5,25,50,0.5)';
    ctx.fill();
    text(ctx, `🛟 ${g.simits}`, W - 47, 28, 15);
  }

  // nefes barı
  if (g.state === 'play' && (p.outside || p.breath < 1)) {
    const w = 38;
    const x = p.x - w / 2;
    const y = p.y - 30;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    rr(ctx, x - 1, y - 1, w + 2, 7, 3);
    ctx.fill();
    const b = Math.max(0, p.breath);
    ctx.fillStyle = b > 0.5 ? '#4ade80' : b > 0.25 ? '#facc15' : '#ef4444';
    rr(ctx, x, y, Math.max(2, w * b), 5, 2.5);
    ctx.fill();
  }

  if (g.state === 'ready') {
    const s = 1 + 0.06 * Math.sin(g.time * 5);
    text(ctx, 'Dokun!', W / 2, 190, 30 * s, '#fff', 'center', 900);
    text(ctx, 'Dokun: yukarı · Basılı tut: dal', W / 2, 224, 14, '#fff', 'center', 700);
    text(ctx, 'Suya dal, balığı gagala!', W / 2, 246, 13, '#bbf7d0', 'center', 700);
    text(ctx, 'Su altında fazla kalırsan boğulursun.', W / 2, 268, 12, '#fde68a', 'center', 600);
  }

  const wind = g.env.wind;
  if (wind?.state === 'warn') {
    text(ctx, `💨 Poyraz! ${(wind.dir ?? 0) > 0 ? '⬇' : '⬆'}`, W / 2, 98, 19, '#e0f2fe');
  }

  g.toasts.forEach((t, i) => {
    const a = Math.min(1, t.t * 5, (t.dur - t.t) * 3);
    ctx.globalAlpha = Math.max(0, a);
    text(ctx, t.msg, W / 2, 136 + i * 28, 17, t.color);
    ctx.globalAlpha = 1;
  });
}
