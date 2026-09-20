// audio.js
import { gameBus } from './bus.js';

class AudioManager {
  constructor() {
    this.ctx = null;
    this.sounds = {};
    this.isUnlocked = false;

    // Підписуємося на події гри без прямого імпорту рушія
    gameBus.addEventListener('fired', () => this.play('shoot'));
    gameBus.addEventListener('hit', () => this.play('hit'));
    gameBus.addEventListener('exploded', () => this.play('exploded'));
  }

  getContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    return this.ctx;
  }

  // Розблокування аудіоконтексту після жесту гравця
  async unlock() {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    this.isUnlocked = true;
  }

  setSounds(soundBuffers) {
    this.sounds = soundBuffers;
  }

  play(name) {
    if (!this.ctx || !this.sounds[name]) return;

    try {
      const source = this.ctx.createBufferSource();
      source.buffer = this.sounds[name];
      source.connect(this.ctx.destination);
      source.start(0);
    } catch (err) {
      console.warn(`Не вдалося відтворити звук ${name}:`, err);
    }
  }
}

export const audioManager = new AudioManager();