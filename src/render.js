export function setupCanvas(canvas, width, height) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return ctx;
}

export function renderScene(ctx, prevShip, currentShip, alpha, arena) {
  const x = prevShip.x + (currentShip.x - prevShip.x) * alpha;
  const y = prevShip.y + (currentShip.y - prevShip.y) * alpha;
  const angle = prevShip.angle + (currentShip.angle - prevShip.angle) * alpha;

  ctx.clearRect(0, 0, arena.width, arena.height);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-12, -10);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-12, 10);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}