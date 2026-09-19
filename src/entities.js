// 1. Vector2 з чистими методами (не мутують поточний об'єкт)
export class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  add(v) { return new Vector2(this.x + v.x, this.y + v.y); }
  sub(v) { return new Vector2(this.x - v.x, this.y - v.y); }
  mult(n) { return new Vector2(this.x * n, this.y * n); }
  mag() { return Math.hypot(this.x, this.y); }
  normalize() {
    const m = this.mag();
    return m === 0 ? new Vector2() : new Vector2(this.x / m, this.y / m);
  }
}

// 2. Базовий клас Entity з приватним лічильником #id
export class Entity {
  static #nextId = 1;
  #id;

  constructor(pos, vel, radius, kind) {
    this.#id = Entity.#nextId++;
    this.pos = pos;
    this.vel = vel;
    this.radius = radius;
    this.kind = kind;      // 'ship', 'bullet', 'asteroid', 'pickup'
    this.isDead = false;
  }

  get id() {
    return this.#id;
  }

  update(dt) {
    this.pos = this.pos.add(this.vel.mult(dt));
  }
}

// 3. Корабель з лаби 1 (один рівень extends, приватне #hp)
export class Ship extends Entity {
  #hp = 100;

  constructor(pos) {
    super(pos, new Vector2(0, 0), 18, 'ship');
    this.angle = 0;
    this.rotationSpeed = 3.5;
    this.thrust = 220;
    this.respawnTimer = 0;

    // Фікс втрати контексту this (варіант 1)
    this.fire = this.fire.bind(this);
  }

  get hp() {
    return this.#hp;
  }

  takeDamage(amount) {
    this.#hp = Math.max(0, this.#hp - amount);
    if (this.#hp === 0) {
      this.respawnTimer = 2.0; // затримка респауну 2 с
    }
  }

  respawn(pos) {
    this.#hp = 100;
    this.pos = pos;
    this.vel = new Vector2(0, 0);
    this.respawnTimer = 0;
  }

  // Постріл з носа корабля
  fire(world) {
    if (this.#hp <= 0) return;
    const dir = new Vector2(Math.cos(this.angle), Math.sin(this.angle));
    const nosePos = this.pos.add(dir.mult(this.radius + 4));
    const bulletVel = this.vel.add(dir.mult(400));
    world.spawn(new Bullet(nosePos, bulletVel));
  }

  update(dt) {
    if (this.respawnTimer > 0) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.respawn(new Vector2(400, 300));
      }
      return;
    }
    super.update(dt);
    // Демпфування швидкості (інерція космічного корабля)
    this.vel = this.vel.mult(0.99);
  }
}

// 4. Куля з TTL (Time To Live)
export class Bullet extends Entity {
  constructor(pos, vel, ttl = 1.8) {
    super(pos, vel, 3, 'bullet');
    this.ttl = ttl;
    this.homing = null; // слот для композиції
  }

  update(dt, world) {
    if (this.homing) {
      this.homing.update(this, dt, world);
    }
    super.update(dt);
    this.ttl -= dt;
    if (this.ttl <= 0) this.isDead = true;
  }
}

// 5. Астероїд / перешкода
export class Asteroid extends Entity {
  constructor(pos, vel, radius = 25) {
    super(pos, vel, radius, 'asteroid');
  }
}

// 6. Фіча 1 через композицію: Самонаведення (Homing)
export class HomingBehavior {
  constructor(targetKind = 'asteroid', turnRate = 5) {
    this.targetKind = targetKind;
    this.turnRate = turnRate;
  }

  update(entity, dt, world) {
    let nearest = null;
    let minDist = Infinity;

    for (const target of world.ofKind(this.targetKind)) {
      const d = target.pos.sub(entity.pos).mag();
      if (d < minDist) {
        minDist = d;
        nearest = target;
      }
    }

    if (nearest) {
      const currentSpeed = entity.vel.mag() || 300;
      const desiredDir = nearest.pos.sub(entity.pos).normalize();
      const currentDir = entity.vel.normalize();
      const newDir = currentDir.add(desiredDir.sub(currentDir).mult(this.turnRate * dt)).normalize();
      entity.vel = newDir.mult(currentSpeed);
    }
  }
}

// 7. Фіча 2 через композицію: Pickup (бонус, що стоїть і підбирається)
export class Pickup extends Entity {
  constructor(pos, effectType = 'heal') {
    super(pos, new Vector2(0, 0), 12, 'pickup');
    this.effectType = effectType;
  }

  apply(ship) {
    if (this.effectType === 'heal') {
      // при підборі відновити стан корабля
    }
    this.isDead = true;
  }
}

// 8. World поверх Map<id, Entity>
export class World {
  constructor() {
    this.entities = new Map();
    this.score = 0;
  }

  spawn(entity) {
    this.entities.set(entity.id, entity);
    return entity;
  }

  despawn(id) {
    const e = this.entities.get(id);
    if (e) e.isDead = true;
  }

  // Генератор ofKind
  *ofKind(kind) {
    for (const entity of this.entities.values()) {
      if (entity.kind === kind && !entity.isDead) {
        yield entity;
      }
    }
  }

  step(dt) {
    // 1. Оновлення всіх сутностей
    for (const entity of this.entities.values()) {
      entity.update(dt, this);
    }

    // 2. Коло-коло колізії (O(n^2))
    this.#resolveCollisions();

    // 3. Sweep (очищення мертвих у кінці кроку)
    for (const [id, entity] of this.entities) {
      if (entity.isDead) {
        this.entities.delete(id);
      }
    }
  }

  #resolveCollisions() {
    const all = Array.from(this.entities.values());
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];
        if (a.isDead || b.isDead) continue;

        const dist = a.pos.sub(b.pos).mag();
        if (dist < a.radius + b.radius) {
          this.#handleHit(a, b);
        }
      }
    }
  }

  #handleHit(a, b) {
    // Куля і астероїд
    if ((a.kind === 'bullet' && b.kind === 'asteroid') || (a.kind === 'asteroid' && b.kind === 'bullet')) {
      a.isDead = true;
      b.isDead = true;
      this.score += 100;
    }

    // Корабель і астероїд
    if (a.kind === 'ship' && b.kind === 'asteroid') {
      a.takeDamage(50);
      b.isDead = true;
    } else if (b.kind === 'ship' && a.kind === 'asteroid') {
      b.takeDamage(50);
      a.isDead = true;
    }

    // Корабель і pickup
    if (a.kind === 'ship' && b.kind === 'pickup') {
      b.apply(a);
    } else if (b.kind === 'ship' && a.kind === 'pickup') {
      a.apply(b);
    }
  }
}