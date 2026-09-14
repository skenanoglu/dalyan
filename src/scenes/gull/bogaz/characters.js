// DALYAN: Boğaz oyunundan (Oyun/bogaz/src) değiştirilmeden kopyalandı.
// Karakter çizimleri. Hepsi (0,0) merkezli ve sağa bakacak şekilde çizilir.

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

// o: { inWater, flap (0..1, son dokunuşun etkisi), t }
export function drawFish(ctx, o) {
  const spread = o.inWater || o.dive ? 0.25 : 1;
  const beat = Math.sin(o.t * 32) * 0.25 * o.flap;

  // arka yüzgeç (uzak kanat)
  ctx.fillStyle = 'rgba(120,170,230,0.75)';
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.quadraticCurveTo(-8, -18 * (spread + beat), -20, -(16 * (spread + beat)) - 3);
  ctx.quadraticCurveTo(-10, -5, -3, 0);
  ctx.fill();

  // kuyruk
  const wag = Math.sin(o.t * (o.inWater ? 14 : 6)) * 3;
  ctx.fillStyle = '#2b5fa8';
  ctx.beginPath();
  ctx.moveTo(-11, 0);
  ctx.lineTo(-23, -10 + wag);
  ctx.lineTo(-18, wag * 0.3);
  ctx.lineTo(-23, 10 + wag);
  ctx.closePath();
  ctx.fill();

  // gövde
  const g = ctx.createLinearGradient(0, -8, 0, 8);
  g.addColorStop(0, '#2f6fc4');
  g.addColorStop(0.55, '#7fb6ee');
  g.addColorStop(1, '#e6f3ff');
  ctx.fillStyle = g;
  ellipse(ctx, 0, 0, 15, 8);

  // yan çizgi
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-9, 1);
  ctx.quadraticCurveTo(0, 3, 10, 1);
  ctx.stroke();

  // ön yüzgeç (yakın kanat)
  ctx.fillStyle = 'rgba(200,230,255,0.9)';
  ctx.beginPath();
  ctx.moveTo(3, 1);
  ctx.quadraticCurveTo(-6, -14 * (spread - beat), -17, -(12 * (spread - beat)) - 1);
  ctx.quadraticCurveTo(-8, 1, 0, 3);
  ctx.fill();

  // göz
  ctx.fillStyle = '#fff';
  ellipse(ctx, 9, -2, 3.2, 3.2);
  ctx.fillStyle = '#10213d';
  ellipse(ctx, 9.8, -2, 1.7, 1.7);
}

// o: { inWater, flap, t, rival }
export function drawGull(ctx, o) {
  const body = o.rival ? '#d9dde2' : '#ffffff';
  const wing = o.rival ? '#57616c' : '#9aa6b2';

  let up;
  if (o.inWater || o.dive) up = -0.15;
  else if (o.flap > 0) up = 0.1 + 0.9 * (0.5 + 0.5 * Math.sin(o.t * 38));
  else up = 0.35 + 0.12 * Math.sin(o.t * 4);

  const drawWing = (shade, lift) => {
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.moveTo(4, -3);
    ctx.quadraticCurveTo(-6, -4 - 18 * lift, -20, -4 - 20 * lift);
    ctx.lineTo(-14, -1 - 6 * lift);
    ctx.quadraticCurveTo(-6, 0, -2, 1);
    ctx.fill();
    // siyah kanat ucu
    ctx.fillStyle = '#1b1f24';
    ctx.beginPath();
    ctx.moveTo(-20, -4 - 20 * lift);
    ctx.lineTo(-14, -1 - 6 * lift);
    ctx.lineTo(-15.5, -4 - 13 * lift);
    ctx.fill();
  };

  drawWing(o.rival ? '#3e4750' : '#7f8b97', up * 0.8);

  // kuyruk
  ctx.fillStyle = wing;
  ctx.beginPath();
  ctx.moveTo(-10, -1);
  ctx.lineTo(-21, -4);
  ctx.lineTo(-20, 3);
  ctx.closePath();
  ctx.fill();

  // gövde ve baş
  ctx.fillStyle = body;
  ellipse(ctx, 0, 0, 13, 8);
  ellipse(ctx, 10, -5, 6, 5.5);

  // gaga
  ctx.fillStyle = '#f5c518';
  ctx.beginPath();
  ctx.moveTo(15, -6);
  ctx.lineTo(23, -4);
  ctx.lineTo(15, -2.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d6333a';
  ellipse(ctx, 20, -3.6, 1, 0.9);

  // göz
  ctx.fillStyle = '#111';
  ellipse(ctx, 12, -6.5, 1.3, 1.3);

  drawWing(wing, up);
}

export function drawCharacter(ctx, id, x, y, angle, o, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (scale !== 1) ctx.scale(scale, scale);
  if (o.invuln > 0) {
    ctx.shadowColor = '#ffd34d';
    ctx.shadowBlur = 14;
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(o.t * 30);
  }
  if (id === 'balik') drawFish(ctx, o);
  else drawGull(ctx, o);
  ctx.restore();
}
