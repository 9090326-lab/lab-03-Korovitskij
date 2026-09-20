import { loadAll } from './assetLoader.js';

// Отримуємо Canvas і контекст 2D
const canvas = document.getElementById('gameCanvas') || document.querySelector('canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Ініціалізація аудіо
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const audioCtx = AudioContextClass ? new AudioContextClass() : null;

let animationFrameId = null;
let isGameRunning = false;
let lobbyContainer = null;

// Створення динамічного меню вибору кімнати в DOM
function createLobbyUI(onJoin) {
  let el = document.getElementById('custom-lobby-modal');
  if (el) return el;

  el = document.createElement('div');
  el.id = 'custom-lobby-modal';
  el.style.position = 'fixed';
  el.style.top = '50%';
  el.style.left = '50%';
  el.style.transform = 'translate(-50%, -50%)';
  el.style.backgroundColor = '#05070f';
  el.style.border = '1px solid #1e293b';
  el.style.borderRadius = '12px';
  el.style.padding = '32px';
  el.style.width = '340px';
  el.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.7)';
  el.style.zIndex = '1000';
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  el.style.gap = '16px';
  el.style.fontFamily = 'monospace, sans-serif';
  el.style.color = '#f8fafc';

  el.innerHTML = `
    <h2 style="margin: 0; font-size: 24px; font-weight: bold; text-align: left;">Вибір кімнати</h2>
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <label style="font-size: 14px; color: #cbd5e1;">Ваше ім'я:</label>
      <input type="text" id="player-name-input" value="Гравець" style="background: #ffffff; color: #000000; border: none; border-radius: 4px; padding: 10px; font-size: 15px; outline: none;" />
    </div>
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <label style="font-size: 14px; color: #cbd5e1;">Доступні кімнати:</label>
      <select id="room-select-input" style="background: #ffffff; color: #000000; border: none; border-radius: 4px; padding: 10px; font-size: 15px; outline: none; cursor: pointer;">
        <option value="arena-1">Арена: Початківець (2/4)</option>
        <option value="arena-2">Арена: Ветеран (1/4)</option>
        <option value="arena-3">Арена: Космос (3/4)</option>
      </select>
    </div>
    <button id="custom-join-btn" style="background: #16a34a; color: #ffffff; border: none; border-radius: 6px; padding: 12px; font-size: 16px; font-weight: bold; cursor: pointer; transition: background 0.2s ease; margin-top: 8px;">
      Приєднатися
    </button>
  `;

  document.body.appendChild(el);

  const btn = el.querySelector('#custom-join-btn');
  btn.onmouseover = () => btn.style.background = '#22c55e';
  btn.onmouseout = () => btn.style.background = '#16a34a';

  btn.onclick = (e) => {
    e.preventDefault();
    el.style.display = 'none';
    onJoin();
  };

  return el;
}

// Екран завантаження ресурсів
function renderLoadingScreen(progress, errorMessage = null) {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '20px monospace';
  ctx.textAlign = 'center';

  if (errorMessage) {
    ctx.fillStyle = '#ef4444';
    ctx.fillText('Помилка завантаження: ' + errorMessage, canvas.width / 2, canvas.height / 2 - 20);
    return;
  }

  ctx.fillText(`Завантаження ресурсів: ${Math.round(progress * 100)}%`, canvas.width / 2, canvas.height / 2 - 30);

  const barWidth = 300;
  const barHeight = 24;
  const startX = (canvas.width - barWidth) / 2;
  const startY = canvas.height / 2;

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.strokeRect(startX, startY, barWidth, barHeight);

  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(startX + 2, startY + 2, (barWidth - 4) * progress, barHeight - 4);
}

// Повернення до меню (Escape)
function returnToLobby() {
  isGameRunning = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (lobbyContainer) {
    lobbyContainer.style.display = 'flex';
  }

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Запуск гри
function startGame(assets) {
  if (isGameRunning) return;
  isGameRunning = true;

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  if (lobbyContainer) {
    lobbyContainer.style.display = 'none';
  }

  let score = 0;
  let lives = 3;
  let isGameOver = false;

  const ship = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: 18,
    invulnerableTime: 2
  };

  const bullets = [];
  const asteroids = [];
  const particles = [];

  function spawnAsteroid(x, y, radius = 35) {
    if (x === undefined || y === undefined) {
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) { x = Math.random() * canvas.width; y = -40; }
      else if (edge === 1) { x = canvas.width + 40; y = Math.random() * canvas.height; }
      else if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height + 40; }
      else { x = -40; y = Math.random() * canvas.height; }
    }

    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 60;
    asteroids.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius
    });
  }

  for (let i = 0; i < 5; i++) {
    spawnAsteroid();
  }

  function createExplosion(x, y, count = 14, color = '#38bdf8') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 120;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        color
      });
    }
  }

  const keys = {};
  const onKeyDown = (e) => {
    if (e.code === 'Escape') {
      cleanupEvents();
      returnToLobby();
      return;
    }

    if (e.code === 'Space' && !keys['Space'] && !isGameOver) {
      const bSpeed = 500;
      bullets.push({
        x: ship.x + Math.cos(ship.angle) * 22,
        y: ship.y + Math.sin(ship.angle) * 22,
        vx: Math.cos(ship.angle) * bSpeed,
        vy: Math.sin(ship.angle) * bSpeed,
        life: 1.3
      });
    }

    keys[e.code] = true;
  };

  const onKeyUp = (e) => {
    keys[e.code] = false;
  };

  function cleanupEvents() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  let lastTime = performance.now();
  let spawnTimer = 0;

  function gameLoop(currentTime) {
    if (!isGameRunning) return;

    const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    if (!isGameOver) {
      if (keys['KeyA'] || keys['ArrowLeft']) ship.angle -= 3.5 * dt;
      if (keys['KeyD'] || keys['ArrowRight']) ship.angle += 3.5 * dt;
      if (keys['KeyW'] || keys['ArrowUp']) {
        ship.vx += Math.cos(ship.angle) * 240 * dt;
        ship.vy += Math.sin(ship.angle) * 240 * dt;

        particles.push({
          x: ship.x - Math.cos(ship.angle) * 16,
          y: ship.y - Math.sin(ship.angle) * 16,
          vx: -Math.cos(ship.angle) * 60 + (Math.random() - 0.5) * 30,
          vy: -Math.sin(ship.angle) * 60 + (Math.random() - 0.5) * 30,
          life: 0.25,
          maxLife: 0.25,
          color: '#f59e0b'
        });
      }

      ship.x += ship.vx * dt;
      ship.y += ship.vy * dt;
      ship.vx *= 0.985;
      ship.vy *= 0.985;

      if (ship.x < 0) ship.x = canvas.width;
      if (ship.x > canvas.width) ship.x = 0;
      if (ship.y < 0) ship.y = canvas.height;
      if (ship.y > canvas.height) ship.y = 0;

      if (ship.invulnerableTime > 0) {
        ship.invulnerableTime -= dt;
      }

      spawnTimer += dt;
      if (spawnTimer > 3.0 && asteroids.length < 8) {
        spawnAsteroid();
        spawnTimer = 0;
      }
    }

    // Кулі
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) {
        bullets.splice(i, 1);
      }
    }

    // Астероїди
    for (const ast of asteroids) {
      ast.x += ast.vx * dt;
      ast.y += ast.vy * dt;
      if (ast.x < -50) ast.x = canvas.width + 50;
      if (ast.x > canvas.width + 50) ast.x = -50;
      if (ast.y < -50) ast.y = canvas.height + 50;
      if (ast.y > canvas.height + 50) ast.y = -50;
    }

    // Частки
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Знищення астероїдів кулями
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const ast = asteroids[i];
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        const dist = Math.hypot(b.x - ast.x, b.y - ast.y);

        if (dist < ast.radius) {
          createExplosion(ast.x, ast.y, 14, '#38bdf8');
          bullets.splice(j, 1);
          score += ast.radius > 25 ? 50 : 100;

          if (ast.radius > 20) {
            spawnAsteroid(ast.x, ast.y, ast.radius / 1.7);
            spawnAsteroid(ast.x, ast.y, ast.radius / 1.7);
          }

          asteroids.splice(i, 1);
          break;
        }
      }
    }

    // Зіткнення корабля з астероїдом
    if (!isGameOver && ship.invulnerableTime <= 0) {
      for (let i = 0; i < asteroids.length; i++) {
        const ast = asteroids[i];
        const dist = Math.hypot(ship.x - ast.x, ship.y - ast.y);

        if (dist < ship.radius + ast.radius) {
          createExplosion(ship.x, ship.y, 25, '#ef4444');
          lives--;
          ship.x = canvas.width / 2;
          ship.y = canvas.height / 2;
          ship.vx = 0;
          ship.vy = 0;
          ship.invulnerableTime = 2.5;

          if (lives <= 0) {
            isGameOver = true;
          }
          break;
        }
      }
    }

    // Рендер сцени
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = '#38bdf8';
    for (const b of bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    for (const ast of asteroids) {
      ctx.beginPath();
      ctx.arc(ast.x, ast.y, ast.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (!isGameOver) {
      if (ship.invulnerableTime <= 0 || Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.angle);

        if (assets.images?.spritesheet) {
          ctx.drawImage(assets.images.spritesheet, -24, -24, 48, 48);
        } else {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(20, 0);
          ctx.lineTo(-14, -12);
          ctx.lineTo(-8, 0);
          ctx.lineTo(-14, 12);
          ctx.closePath();
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`РАХУНОК: ${score}`, 24, 36);

    ctx.textAlign = 'right';
    ctx.fillText(`ЖИТТЯ: ${'❤️ '.repeat(Math.max(0, lives))}`, canvas.width - 24, 36);

    if (isGameOver) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px monospace';
      ctx.fillText('ГРУ ЗАКІНЧЕНО', canvas.width / 2, canvas.height / 2 - 20);
      ctx.font = '16px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Натисніть ESC для повернення в меню', canvas.width / 2, canvas.height / 2 + 25);
    }

    animationFrameId = requestAnimationFrame(gameLoop);
  }

  animationFrameId = requestAnimationFrame(gameLoop);
}

// Завантаження ресурсів
loadAll('/manifest.json', audioCtx, (progress) => {
  renderLoadingScreen(progress);
})
  .then((assets) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Створюємо та показуємо вікно меню лобі
    lobbyContainer = createLobbyUI(() => {
      startGame(assets);
    });
  })
  .catch((err) => {
    console.error('Помилка завантаження:', err);
    renderLoadingScreen(0, err.message);
  });