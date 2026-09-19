export function integrate(ship, input, dt, arena = { width: 800, height: 600 }) {
  const ROTATION_SPEED = 3.5;
  const THRUST = 350;
  const DRAG = 0.98;

  let angle = ship.angle;
  if (input.left) angle -= ROTATION_SPEED * dt;
  if (input.right) angle += ROTATION_SPEED * dt;

  let vx = ship.vx;
  let vy = ship.vy;

  if (input.forward) {
    vx += Math.cos(angle) * THRUST * dt;
    vy += Math.sin(angle) * THRUST * dt;
  }

  vx *= Math.pow(DRAG, dt * 60);
  vy *= Math.pow(DRAG, dt * 60);

  let x = ship.x + vx * dt;
  let y = ship.y + vy * dt;

  if (x < 0) x += arena.width;
  if (x > arena.width) x -= arena.width;
  if (y < 0) y += arena.height;
  if (y > arena.height) y -= arena.height;

  return { x, y, vx, vy, angle };
}