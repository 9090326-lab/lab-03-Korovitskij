import { createLoop } from './src/loop.js';
import { World, Ship, Asteroid, Pickup, Vector2, HomingBehavior } from './entities.js';

const canvas = document.getElementById('gameCanvas') || document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const world = new World();
const ship = new Ship(new Vector2(canvas.width / 2, canvas.height / 2));
world.spawn(ship);

// Спавн астероїдів
for (let i = 0; i < 4; i++) {
  const x = Math.random() < 0.5 ? 50 : canvas.width - 50;
  const y = Math.random() * canvas.height;
  const vx = (Math.random() - 0.5) * 60;
  const vy = (Math.random() - 0.5) * 60;
  world.spawn(new Asteroid(new Vector2(x, y), new Vector2(vx, vy), 25));
}

// Спавн бонусу (pickup)
world.spawn(new Pickup(new Vector2(canvas.width / 2 + 100, canvas.height / 2)));

// Змінна для зберігання метрик FPS/Steps
let currentMetrics = { stepsPerSec: 0, fps: 0, frameTime: 0 };

// Керування клавіатурою
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;

  if (e.code === 'Space') {
    ship.fire(world);
  }

  if (e.code === 'KeyF' && ship.hp > 0) {
    ship.fire(world);
    const bullets = Array.from(world.ofKind('bullet'));
    const lastBullet = bullets[bullets.length - 1];
    if (lastBullet) {
      lastBullet.homing = new HomingBehavior('asteroid', 6);
    }
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

function update(dt) {
  if (ship.hp > 0) {
    if (keys['KeyA'] || keys['ArrowLeft']) ship.angle -= ship.rotationSpeed * dt;
    if (keys['KeyD'] || keys['ArrowRight']) ship.angle += ship.rotationSpeed * dt;
    if (keys['KeyW'] || keys['ArrowUp']) {
      const thrustVector = new Vector2(Math.cos(ship.angle), Math.sin(ship.angle)).mult(ship.thrust * dt);
      ship.vel = ship.vel.add(thrustVector);
    }
  }

  world.step(dt);

  // Перехід крізь межі екрана
  for (const entity of world.entities.values()) {
    if (entity.pos.x < 0) entity.pos.x = canvas.width;
    if (entity.pos.x > canvas.width) entity.pos.x = 0;
    if (entity.pos.y < 0) entity.pos.y = canvas.height;
    if (entity.pos.y > canvas.height) entity.pos.y = 0;
  }
}

function render() {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const entity of world.entities.values()) {
    if (entity.isDead) continue;

    ctx.save();
    ctx.translate(entity.pos.x, entity.pos.y);

    if (entity.kind === 'ship') {
      if (ship.respawnTimer <= 0) {
        ctx.rotate(ship.angle);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-12, -10);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-12, 10);
        ctx.closePath();
        ctx.stroke();
      }
    } else if (entity.kind === 'bullet') {
      ctx.fillStyle = entity.homing ? '#f43f5e' : '#facc15';
      ctx.beginPath();
      ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (entity.kind === 'asteroid') {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (entity.kind === 'pickup') {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(-8, -8, 16, 16);
    }

    ctx.restore();
  }

  // HUD: рахунок, HP та статус
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px monospace';
  ctx.fillText(`Рахунок: ${world.score}`, 20, 30);
  ctx.fillText(`HP: ${ship.hp}`, 20, 55);

  // Дублювання метрик прямо на Canvas
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px monospace';
  ctx.fillText(
    `Steps/s: ${currentMetrics.stepsPerSec} | FPS: ${currentMetrics.fps} | Frame: ${Number(currentMetrics.frameTime).toFixed(1)}ms`,
    20,
    80
  );

  if (ship.respawnTimer > 0) {
    ctx.fillStyle = '#ef4444';
    ctx.font = '24px monospace';
    ctx.fillText(`Респаун через: ${ship.respawnTimer.toFixed(1)}c`, canvas.width / 2 - 120, canvas.height / 2);
  }
}

// Запуск ігрового циклу з оновленням плашки та Canvas
createLoop({
  update,
  render,
  onFpsUpdate: (data) => {
    if (!data) return;
    currentMetrics = data;

    // Оновлення HTML-плашки над канвасом
    const el =
      document.getElementById('fps') ||
      document.querySelector('.fps') ||
      document.querySelector('[id*="fps"]') ||
      document.querySelector('header, .stats, .metrics, .counter') ||
      document.querySelector('body > div:first-child');

    if (el) {
      el.textContent = `Steps/s: ${data.stepsPerSec ?? 0} | FPS: ${data.fps ?? 0} | Frame: ${(data.frameTime ?? 0).toFixed(1)}ms`;
    }
  }
});