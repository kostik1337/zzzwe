function lerp(a, b, t) {
    return a + (b - a) * t;
}

function randomBetween(min = 0, max = 1) {
    return Math.random() * (max - min) + min;
}

const randomAngle = () => randomBetween(0, 2 * Math.PI);

class Color {
    constructor(r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    toRgba() {
        return `rgba(${this.r * 255}, ${this.g * 255}, ${this.b * 255}, ${this.a})`;
    }

    withAlpha(a) {
        return new Color(this.r, this.g, this.b, a);
    }

    grayScale(t = 1.0) {
        let x = (this.r + this.g + this.b) / 3;
        return new Color(
            lerp(this.r, x, t),
            lerp(this.g, x, t),
            lerp(this.b, x, t),
            this.a);
    }

    static hex(hexcolor) {
        let matches =
            hexcolor.match(/#([0-9a-z]{2})([0-9a-z]{2})([0-9a-z]{2})/i);
        if (matches) {
            let [, r, g, b] = matches;
            return new Color(parseInt(r, 16) / 255.0,
                             parseInt(g, 16) / 255.0,
                             parseInt(b, 16) / 255.0,
                             1.0);
        } else {
            throw `Could not parse ${hexcolor} as color`;
        }
    }
}

class V2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(that) {
        return new V2(this.x + that.x, this.y + that.y);
    }

    sub(that) {
        return new V2(this.x - that.x, this.y - that.y);
    }

    scale(s) {
        return new V2(this.x * s, this.y * s);
    }

    len() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const n = this.len();
        return n === 0 ? new V2(0, 0) : new V2(this.x / n, this.y / n);
    }

    dist(that) {
        return this.sub(that).len();
    }

    static polar(mag, dir) {
        return new V2(Math.cos(dir) * mag, Math.sin(dir) * mag);
    }
}

const IDENTITY = new DOMMatrix();

class Camera {
    pos = new V2(0, 0);
    vel = new V2(0, 0);
    grayness = 0.0;
    unitsPerPixel = 1.0;

    constructor(context) {
        this.context = context;
    }

    update(dt) {
        this.pos = this.pos.add(this.vel.scale(dt));
    }

    width() {
        return this.context.canvas.width * this.unitsPerPixel;
    }

    height() {
        return this.context.canvas.height * this.unitsPerPixel;
    }

    getScreenWorldBounds() {
        let topLeft = this.screenToWorld(new V2(0, 0))
        let bottomRight = this.screenToWorld(new V2(this.context.canvas.width, this.context.canvas.height))
        return [topLeft, bottomRight]
    }

    screenToWorld(point) {
        const width = this.context.canvas.width;
        const height = this.context.canvas.height;
        return point
            .sub(new V2(width / 2, height / 2))
            .scale(this.unitsPerPixel)
            .add(this.pos);
    }

    worldToCamera(point) {
        const width = this.width();
        const height = this.height();
        return point.sub(this.pos).add(new V2(width / 2, height / 2));
    }

    clear() {
        const width = this.width();
        const height = this.height();
        this.context.clearRect(0, 0, width, height);
    }

    setTarget(target) {
        this.vel = target.sub(this.pos);
    }

    fillCircle(center, radius, color) {
        const screenCenter = this.worldToCamera(center);
        this.context.fillStyle = color.grayScale(this.grayness).toRgba();
        this.context.beginPath();
        this.context.arc(screenCenter.x, screenCenter.y, radius, 0, 2 * Math.PI, false);
        this.context.fill();
    }

    fillRect(x, y, w, h, color) {
        const screenPos = this.worldToCamera(new V2(x, y));
        this.context.fillStyle = color.grayScale(this.grayness).toRgba();
        this.context.fillRect(screenPos.x, screenPos.y, w, h);
    }

    fillMessage(text, color) {
        const width = this.width();
        const height = this.height();

        this.context.fillStyle = color.toRgba();
        this.context.font = "69px LexendMega";
        this.context.textAlign = "center";
        this.context.fillText(text, width / 2, height / 2 + 10);
    }

    drawLine(points, color) {
        this.context.beginPath();
        for (let i = 0; i < points.length; ++i) {
            let screenPoint = this.worldToCamera(points[i])
            if (i == 0) this.context.moveTo(screenPoint.x, screenPoint.y);
            else this.context.lineTo(screenPoint.x, screenPoint.y);
        }
        this.context.strokeStyle = color.toRgba();
        this.context.stroke();
    }

    setScale(scale) {
        this.unitsPerPixel = 1 / scale;

        this.context.setTransform(IDENTITY);
        this.context.scale(scale, scale);
    }
}

const PLAYER_COLOR = Color.hex("#f43841");
const PLAYER_SPEED = 1000;
const PLAYER_RADIUS = 69;
const PLAYER_MAX_HEALTH = 100;
const PLAYER_TRAIL_RATE = 3.0;
const TUTORIAL_POPUP_SPEED = 1.7;
const BULLET_RADIUS = 42;
const BULLET_SPEED = 2000;
const BULLET_LIFETIME = 5.0;
const ENEMY_SPEED = PLAYER_SPEED / 3;
const ENEMY_RADIUS = PLAYER_RADIUS;
const ENEMY_SPAWN_ANIMATION_SPEED = ENEMY_RADIUS * 8;
const ENEMY_COLOR = Color.hex("#9e95c7");
const ENEMY_SPAWN_COOLDOWN = 1.0;
const ENEMY_SPAWN_GROWTH = 1.01;
const ENEMY_SPAWN_DISTANCE = 1500.0;
const ENEMY_DESPAWN_DISTANCE = ENEMY_SPAWN_DISTANCE * 2;
const ENEMY_DAMAGE = PLAYER_MAX_HEALTH / 5;
const ENEMY_KILL_HEAL = PLAYER_MAX_HEALTH / 10;
const ENEMY_KILL_SCORE = 100;
const ENEMY_TRAIL_RATE = 2.0;
const PARTICLES_COUNT_RANGE = [0, 50];
const PARTICLE_RADIUS_RANGE = [10.0, 20.0];
const PARTICLE_MAG_RANGE = [0, BULLET_SPEED];
const PARTICLE_MAX_LIFETIME = 1.0;
const PARTICLE_LIFETIME_RANGE = [0, PARTICLE_MAX_LIFETIME];
const MESSAGE_COLOR = Color.hex("#ffffff");
const TRAIL_COOLDOWN = 1 / 60;
const BACKGROUND_CELL_RADIUS = 120;
const BACKGROUND_COLOR = Color.hex("#ffffff").withAlpha(0.5)

const directionMap = {
    'KeyS': new V2(0, 1.0),
    'KeyW': new V2(0, -1.0),
    'KeyA': new V2(-1.0, 0),
    'KeyD': new V2(1.0, 0)
};

class Particle {
    constructor(pos, vel, lifetime, radius, color) {
        this.pos = pos;
        this.vel = vel;
        this.lifetime = lifetime;
        this.radius = radius;
        this.color = color;
    }

    render(camera) {
        const a = this.lifetime / PARTICLE_MAX_LIFETIME;
        camera.fillCircle(this.pos, this.radius,
                          this.color.withAlpha(a));
    }

    update(dt) {
        this.pos = this.pos.add(this.vel.scale(dt));
        this.lifetime -= dt;
    }
}

// TODO(#2): burst particle in a particular direction;
function particleBurst(particles, center, color) {
    const N = randomBetween(...PARTICLES_COUNT_RANGE);
    for (let i = 0; i < N; ++i) {
        particles.push(new Particle(
            center,
            V2.polar(randomBetween(...PARTICLE_MAG_RANGE), randomAngle()),
            randomBetween(...PARTICLE_LIFETIME_RANGE),
            randomBetween(...PARTICLE_RADIUS_RANGE),
            color));
    }
}

class Enemy {
    trail = new Trail(ENEMY_RADIUS, ENEMY_COLOR, ENEMY_TRAIL_RATE);

    constructor(pos) {
        this.pos = pos;
        this.ded = false;
        this.radius = 0.0;
    }

    update(dt, followPos) {
        let vel = followPos
            .sub(this.pos)
            .normalize()
            .scale(ENEMY_SPEED * dt);
        this.trail.push(this.pos);
        this.pos = this.pos.add(vel);
        this.trail.update(dt);

        if (this.radius < ENEMY_RADIUS) {
            this.radius += ENEMY_SPAWN_ANIMATION_SPEED * dt;
        } else {
            this.radius = ENEMY_RADIUS;
        }
    }

    render(camera) {
        this.trail.render(camera);
        camera.fillCircle(this.pos, this.radius, ENEMY_COLOR);
    }
}

class Bullet {
    constructor(pos, vel) {
        this.pos = pos;
        this.vel = vel;
        this.lifetime = BULLET_LIFETIME;
    }

    update(dt) {
        this.pos = this.pos.add(this.vel.scale(dt));
        this.lifetime -= dt;
    }

    render(camera) {
        camera.fillCircle(this.pos, BULLET_RADIUS, PLAYER_COLOR);
    }
}

class TutorialPopup {
    constructor(text) {
        this.alpha = 0.0;
        this.dalpha = 0.0;
        this.text = text;
        this.onFadedOut = undefined;
        this.onFadedIn = undefined;
    }

    update(dt) {
        this.alpha += this.dalpha * dt;

        if (this.dalpha < 0.0 && this.alpha <= 0.0) {
            this.dalpha = 0.0;
            this.alpha = 0.0;

            this.onFadedOut?.();
        } else if (this.dalpha > 0.0 && this.alpha >= 1.0) {
            this.dalpha = 0.0;
            this.alpha = 1.0;

            this.onFadedIn?.();
        }
    }

    render(camera) {
        camera.fillMessage(this.text, MESSAGE_COLOR.withAlpha(this.alpha));
    }

    fadeIn() {
        this.dalpha = TUTORIAL_POPUP_SPEED;
    }

    fadeOut() {
        this.dalpha = -TUTORIAL_POPUP_SPEED;
    }
}

const TutorialState = Object.freeze({
    "LearningMovement": 0,
    "LearningShooting": 1,
    "Finished": 2,
});

const TutorialMessages = Object.freeze([
    "WASD to move",
    "Left Mouse Click to shoot",
    ""
]);

const LOCAL_STORAGE_TUTORIAL = "tutorial";

class Tutorial {
    constructor() {
        this.state = window.localStorage.getItem(LOCAL_STORAGE_TUTORIAL) ?? 0;
        this.popup = new TutorialPopup(TutorialMessages[this.state]);
        this.popup.fadeIn();
        this.popup.onFadedOut = () => {
            this.popup.text = TutorialMessages[this.state];
            this.popup.fadeIn();
        };
    }

    update(dt) {
        this.popup.update(dt);
    }

    render(camera) {
        this.popup.render(camera);
    }

    playerMoved() {
        if (this.state == TutorialState.LearningMovement) {
            this.popup.fadeOut();
            this.state += 1;
            window.localStorage.setItem(LOCAL_STORAGE_TUTORIAL, this.state);
        }
    }

    playerShot() {
        if (this.state == TutorialState.LearningShooting) {
            this.popup.fadeOut();
            this.state += 1;
            window.localStorage.setItem(LOCAL_STORAGE_TUTORIAL, this.state);
        }
    }
}

class Trail {
    trail = [];
    cooldown = 0;
    disabled = false;

    constructor(radius, color, rate) {
        this.radius = radius;
        this.color = color;
        this.rate = rate;
    }

    render(camera) {
        const n = this.trail.length;
        for (let i = 0; i < n; ++i) {
            camera.fillCircle(
                this.trail[i].pos,
                this.radius * this.trail[i].a,
                this.color.withAlpha(0.2 * this.trail[i].a));
        }
    }

    update(dt) {
        for (let dot of this.trail) {
            dot.a -= this.rate * dt;
        }

        while (this.trail.length > 0 && this.trail[0].a <= 0.0) {
            this.trail.shift();
        }

        this.cooldown -= dt;
    }

    push(pos) {
        if (!this.disabled && this.cooldown <= 0)  {
            this.trail.push({
                pos: pos,
                a: 1.0
            });
            this.cooldown = TRAIL_COOLDOWN;
        }
    }
}

class Player {
    health = PLAYER_MAX_HEALTH;
    trail = new Trail(PLAYER_RADIUS, PLAYER_COLOR, PLAYER_TRAIL_RATE);

    constructor(pos) {
        this.pos = pos;
    }

    render(camera) {
        this.trail.render(camera);

        if (this.health > 0.0) {
            camera.fillCircle(this.pos, PLAYER_RADIUS, PLAYER_COLOR);
        }
    }

    update(dt, vel) {
        this.trail.push(this.pos);
        this.pos = this.pos.add(vel.scale(dt));
        this.trail.update(dt);
    }

    shootAt(target) {
        const bulletDir = target
              .sub(this.pos)
              .normalize();
        const bulletVel = bulletDir.scale(BULLET_SPEED);
        const bulletPos = this
              .pos
              .add(bulletDir.scale(PLAYER_RADIUS + BULLET_RADIUS));

        return new Bullet(bulletPos, bulletVel);
    }

    damage(value) {
        this.health = Math.max(this.health - value, 0.0);
    }

    heal(value) {
        if (this.health > 0.0) {
            this.health = Math.min(this.health + value, PLAYER_MAX_HEALTH);
        }
    }
}

class Background {
    cellPoints = [];
    cellWidth = 1.5 * BACKGROUND_CELL_RADIUS;
    cellHeight = Math.sqrt(3) * BACKGROUND_CELL_RADIUS;

    constructor() {
        // We need only half hexagon segments since each hexagon is bounded with other hexagons and their segments overlap
        for (let i = 0; i < 4; ++i) {
            let angle = 2 * Math.PI * i / 6;
            this.cellPoints.push(new V2(Math.cos(angle), Math.sin(angle)).scale(BACKGROUND_CELL_RADIUS));
        }
    }

    render(camera) {
        let bounds = camera.getScreenWorldBounds()
        let gridBoundsXMin = Math.floor(bounds[0].x / this.cellWidth)
        let gridBoundsXMax = Math.floor(bounds[1].x / this.cellWidth)
        let gridBoundsYMin = Math.floor(bounds[0].y / this.cellHeight)
        let gridBoundsYMax = Math.floor(bounds[1].y / this.cellHeight)

        for (let cellX = gridBoundsXMin; cellX <= gridBoundsXMax + 1; ++cellX)
            for (let cellY = gridBoundsYMin; cellY <= gridBoundsYMax; ++cellY) {
                let offset = new V2(
                    cellX * this.cellWidth,
                    (cellY + (cellX % 2 == 0 ? 0.5 : 0)) * this.cellHeight
                );
                let points = this.cellPoints.map(p => p.add(offset))
                camera.drawLine(points, BACKGROUND_COLOR)
            }
    }
}

// TODO(#8): the game stops when you unfocus the browser
// TODO(#9): some sort of inertia during player movement
class Game {
    restart() {
        // TODO(#37): a player respawn animation similar to the enemy's one
        this.player = new Player(new V2(0, 0));
        this.score = 0;
        this.mousePos = new V2(0, 0);
        this.pressedKeys = new Set();
        this.tutorial = new Tutorial();
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.enemySpawnRate = ENEMY_SPAWN_COOLDOWN;
        this.enemySpawnCooldown = ENEMY_SPAWN_COOLDOWN;
        this.paused = false;
        this.camera.pos = new V2(0.0, 0.0);
        this.camera.vel = new V2(0.0, 0.0);
        this.background = new Background()
    }

    constructor(context) {
        this.camera = new Camera(context);
        this.restart();
    }

    update(dt) {
        if (this.paused) {
            this.camera.grayness = 1.0;
            return;
        } else {
            this.camera.grayness = 1.0 - this.player.health / PLAYER_MAX_HEALTH;
        }

        if (this.player.health <= 0.0) {
            dt /= 50;
        }

        this.camera.setTarget(this.player.pos);
        this.camera.update(dt);

        let vel = new V2(0, 0);
        let moved = false;
        for (let key of this.pressedKeys) {
            if (key in directionMap) {
                vel = vel.add(directionMap[key]);
                moved = true;
            }
        }
        vel = vel.normalize().scale(PLAYER_SPEED);
        if (moved) {
            this.tutorial.playerMoved();
        }

        this.player.update(dt, vel);

        this.tutorial.update(dt);

        for (let enemy of this.enemies) {
            if (!enemy.ded) {
                for (let bullet of this.bullets) {
                    if (enemy.pos.dist(bullet.pos) <= BULLET_RADIUS + ENEMY_RADIUS) {
                        this.score += ENEMY_KILL_SCORE;
                        this.player.heal(ENEMY_KILL_HEAL);
                        bullet.lifetime = 0.0;
                        enemy.ded = true;
                        particleBurst(this.particles, enemy.pos, ENEMY_COLOR);
                    }
                }
            }

            if (this.player.health > 0.0 && !enemy.ded) {
                if (enemy.pos.dist(this.player.pos) <= PLAYER_RADIUS + ENEMY_RADIUS) {
                    this.player.damage(ENEMY_DAMAGE);
                    if (this.player.health <= 0.0) {
                        this.player.trail.disabled = true;
                        for (let enemy of this.enemies) {
                            enemy.trail.disabled = true;
                        }
                    }
                    enemy.ded = true;
                    particleBurst(this.particles, enemy.pos, PLAYER_COLOR);
                }
            }
        }

        for (let bullet of this.bullets) {
            bullet.update(dt);
        }
        this.bullets = this.bullets.filter(bullet => bullet.lifetime > 0.0);

        for (let particle of this.particles) {
            particle.update(dt);
        }
        this.particles = this.particles.filter(particle => particle.lifetime > 0.0);

        for (let enemy of this.enemies) {
            enemy.update(dt, this.player.pos);
        }
        this.enemies = this.enemies.filter(enemy => {
            return !enemy.ded && enemy.pos.dist(this.player.pos) < ENEMY_DESPAWN_DISTANCE;
        });

        if (this.tutorial.state == TutorialState.Finished) {
            this.enemySpawnCooldown -= dt;
            if (this.enemySpawnCooldown <= 0.0) {
                this.spawnEnemy();
                this.enemySpawnCooldown = this.enemySpawnRate;
                this.enemySpawnRate /= ENEMY_SPAWN_GROWTH;
            }
        }
    }

    renderEntities(entities) {
        for (let entity of entities) {
            entity.render(this.camera);
        }
    }

    render() {
        this.camera.clear();
        this.background.render(this.camera);
        this.player.render(this.camera);

        this.renderEntities(this.bullets);
        this.renderEntities(this.particles);
        this.renderEntities(this.enemies);

        if (this.paused) {
            this.camera.fillMessage("PAUSED (SPACE to resume)", MESSAGE_COLOR);
        } else if(this.player.health <= 0.0) {
            this.camera.fillMessage(`YOUR SCORE: ${this.score} (SPACE to restart)`, MESSAGE_COLOR);
        } else {
            this.tutorial.render(this.camera);
        }
    }

    spawnEnemy() {
        let dir = randomAngle();
        this.enemies.push(new Enemy(this.player.pos.add(V2.polar(ENEMY_SPAWN_DISTANCE, dir))));
    }

    togglePause() {
        this.paused = !this.paused;
    }

    keyDown(event) {
        if (this.player.health <= 0.0 && event.code == 'Space') {
            this.restart();
            return;
        }

        if (event.code == 'Space') {
            this.togglePause();
        }

        this.pressedKeys.add(event.code);
    }

    keyUp(event) {
        this.pressedKeys.delete(event.code);
    }

    mouseMove(event) {
    }

    mouseDown(event) {
        if (this.paused) {
            return;
        }

        if (this.player.health <= 0.0) {
            return;
        }

        this.tutorial.playerShot();
        const mousePos = new V2(event.offsetX, event.offsetY);
        this.bullets.push(this.player.shootAt(this.camera.screenToWorld(mousePos)));
    }
}

// Resolution at which the game scale will be 1 unit per pixel
const DEFAULT_RESOLUTION = {w: 3840, h: 2160};

let game = null;

(() => {
    const canvas = document.getElementById("game-canvas");
    const context = canvas.getContext("2d");
    let windowWasResized = true;

    game = new Game(context);

    // https://drafts.csswg.org/mediaqueries-4/#mf-interaction
    // https://patrickhlauke.github.io/touch/pointer-hover-any-pointer-any-hover/
    if (window.matchMedia("(pointer: coarse)").matches) {
        game.tutorial.playerMoved();
    }

    let start;
    function step(timestamp) {
        if (start === undefined) {
            start = timestamp;
        }
        const dt = (timestamp - start) * 0.001;
        start = timestamp;

        if (windowWasResized) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const scale = Math.min(
                window.innerWidth / DEFAULT_RESOLUTION.w,
                window.innerHeight / DEFAULT_RESOLUTION.h,
            );
            game.camera.setScale(scale);
            windowWasResized = false;
        }

        game.update(dt);
        game.render();

        window.requestAnimationFrame(step);
    }

    window.requestAnimationFrame(step);

    // TODO(#30): game is not playable on mobile without external keyboard

    document.addEventListener('keydown', event => {
        game.keyDown(event);
    });

    document.addEventListener('keyup', event => {
        game.keyUp(event);
    });

    document.addEventListener('pointermove', event => {
        game.mouseMove(event);
    });

    document.addEventListener('pointerdown', event => {
        game.mouseDown(event);
    });

    window.addEventListener('resize', event => {
        windowWasResized = true;
    });
})();
