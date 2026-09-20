// lobby.js
export class Lobby extends EventTarget {
  constructor(container) {
    super();
    this.container = container;
    this.intervalId = null;
    this.currentAbortController = null;
  }

  // Відображення інтерфейсу лобі
  render() {
    this.container.innerHTML = `
      <div id="lobby-menu" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.85); color: #fff; padding: 24px; border-radius: 8px; font-family: sans-serif; min-width: 320px; z-index: 10;">
        <h2 style="margin-top: 0;">Вибір кімнати</h2>
        <div style="margin-bottom: 12px;">
          <label>Ваше ім'я:</label><br/>
          <input type="text" id="player-name" value="Гравець" style="width: 100%; padding: 8px; margin-top: 4px; box-sizing: border-box;" />
        </div>
        <div style="margin-bottom: 16px;">
          <label>Доступні кімнати:</label>
          <select id="rooms-select" style="width: 100%; padding: 8px; margin-top: 4px; box-sizing: border-box;"></select>
        </div>
        <button id="join-btn" style="width: 100%; padding: 10px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Приєднатися</button>
      </div>
    `;

    document.getElementById('join-btn').addEventListener('click', () => {
      const playerName = document.getElementById('player-name').value;
      const select = document.getElementById('rooms-select');
      const roomId = select.value;

      // Зупиняємо опитування перед стартом гри
      this.destroy();

      // Сповіщаємо main.js про старт
      this.dispatchEvent(new CustomEvent('joined', {
        detail: { playerName, roomId }
      }));
    });

    this.startPolling();
  }

  // Опитування списку кімнат
  startPolling() {
    this.fetchRooms();
    this.intervalId = setInterval(() => {
      this.fetchRooms();
    }, 3000);
  }

  async fetchRooms() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    this.currentAbortController = new AbortController();

    try {
      // Використовуємо AbortSignal.timeout
      const timeoutSignal = AbortSignal.timeout(2500);
      const combinedSignal = AbortSignal.any([this.currentAbortController.signal, timeoutSignal]);

      const res = await fetch('/api/rooms.json', { signal: combinedSignal });
      if (!res.ok) throw new Error('Помилка завантаження списку кімнат');
      const rooms = await res.json();
      this.updateRoomsUI(rooms);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Не вдалося оновити кімнати:', err.message);
      }
    }
  }

  updateRoomsUI(rooms) {
    const select = document.getElementById('rooms-select');
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = rooms.map(r => `
      <option value="${r.id}">${r.name} (${r.players}/${r.maxPlayers})</option>
    `).join('');

    if (currentVal) select.value = currentVal;
  }

  // Очищення та зупинка запитів
  destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    const menu = document.getElementById('lobby-menu');
    if (menu) menu.remove();
  }
}