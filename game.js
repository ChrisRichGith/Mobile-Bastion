import * as THREE from 'three';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

// Spiel-Konstanten
const FIELD_WIDTH = 18;
const FIELD_HEIGHT = 18;

// UI-Elemente
const scoreEl = document.getElementById('score');
const healthEl = document.getElementById('health');
const finalScoreEl = document.getElementById('final-score');
const bonusPointsEl = document.getElementById('bonus-points');
const gameOverContainerEl = document.getElementById('game-over-container');
const restartButtonEl = document.getElementById('restart-button');
const upgradeHealthButtonEl = document.getElementById('upgrade-health-button');
const upgradeAutoshootButtonEl = document.getElementById('upgrade-autoshoot-button');
const upgradePlayerSpeedButtonEl = document.getElementById('upgrade-player-speed-button');
const upgradeBulletSpeedButtonEl = document.getElementById('upgrade-bullet-speed-button');
const upgradeBulletDamageButtonEl = document.getElementById('upgrade-bullet-damage-button');
const upgradeFirerateButtonEl = document.getElementById('upgrade-firerate-button');
const upgradeRangeButtonEl = document.getElementById('upgrade-range-button');
const downgradeEnemySpeedButtonEl = document.getElementById('downgrade-enemy-speed-button');
const downgradeSpawnRateButtonEl = document.getElementById('downgrade-spawn-rate-button');
const eventContainerEl = document.getElementById('event-container');
const eventTextEl = document.getElementById('event-text');

// Stat Display Spans
const healthStatEl = document.getElementById('health-stat');
const playerSpeedStatEl = document.getElementById('player-speed-stat');
const bulletSpeedStatEl = document.getElementById('bullet-speed-stat');
const bulletDamageStatEl = document.getElementById('bullet-damage-stat');
const firerateStatEl = document.getElementById('firerate-stat');
const rangeStatEl = document.getElementById('range-stat');
const enemySpeedStatEl = document.getElementById('enemy-speed-stat');
const spawnRateStatEl = document.getElementById('spawn-rate-stat');

// Cost Display Spans
const healthCostEl = document.getElementById('health-cost');
const playerSpeedCostEl = document.getElementById('player-speed-cost');
const bulletSpeedCostEl = document.getElementById('bullet-speed-cost');
const bulletDamageCostEl = document.getElementById('bullet-damage-cost');
const autoshootEnableCostEl = document.getElementById('autoshoot-enable-cost');
const firerateCostEl = document.getElementById('firerate-cost');
const rangeCostEl = document.getElementById('range-cost');
const enemySpeedCostEl = document.getElementById('enemy-speed-cost');
const spawnRateCostEl = document.getElementById('spawn-rate-cost');

// Container
const autoshootEnableContainerEl = document.getElementById('autoshoot-enable-container');
const autoshootUpgradesContainerEl = document.getElementById('autoshoot-upgrades-container');

// Szene, Kamera und Renderer initialisieren
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x333333); // Dunkelgrauer Hintergrund

// Spielfeld visualisieren
// const gridHelper = new THREE.GridHelper(FIELD_WIDTH, FIELD_HEIGHT);
// gridHelper.rotation.x = Math.PI / 2;
// scene.add(gridHelper);

function createPlayfieldBorder() {
    const borderGroup = new THREE.Group();
    const borderWidth = 0.2;
    const borderMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc });

    const topGeo = new THREE.BoxGeometry(FIELD_WIDTH + borderWidth, borderWidth, 1);
    const topMesh = new THREE.Mesh(topGeo, borderMaterial);
    topMesh.position.y = FIELD_HEIGHT / 2;

    const bottomGeo = new THREE.BoxGeometry(FIELD_WIDTH + borderWidth, borderWidth, 1);
    const bottomMesh = new THREE.Mesh(bottomGeo, borderMaterial);
    bottomMesh.position.y = -FIELD_HEIGHT / 2;

    const leftGeo = new THREE.BoxGeometry(borderWidth, FIELD_HEIGHT + borderWidth, 1);
    const leftMesh = new THREE.Mesh(leftGeo, borderMaterial);
    leftMesh.position.x = -FIELD_WIDTH / 2;

    const rightGeo = new THREE.BoxGeometry(borderWidth, FIELD_HEIGHT + borderWidth, 1);
    const rightMesh = new THREE.Mesh(rightGeo, borderMaterial);
    rightMesh.position.x = FIELD_WIDTH / 2;

    borderGroup.add(topMesh, bottomMesh, leftMesh, rightMesh);
    return borderGroup;
}
scene.add(createPlayfieldBorder());


// Lichtquellen hinzufügen
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Weiches weißes Licht
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Stärkeres Licht aus einer Richtung
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

const frustumSize = 20;
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(frustumSize * aspect / -2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / -2, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Kamera-Position
camera.position.z = 10;
camera.lookAt(scene.position);

// Spieler-Turm erstellen
// Wird später durch den texturierten Turm ersetzt
let tower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 1, 32),
    new THREE.MeshBasicMaterial({ color: 0x888888 }) // Platzhalter-Farbe
);
let towerVelocity = new THREE.Vector2(0, 0);
scene.add(tower);

// Lade die Textur und wende sie auf den Turm an
const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin('anonymous'); // Wichtig für das Laden von Bildern von anderen Domains

const textureUrl = 'https://raw.githubusercontent.com/ChrisRichGith/Mobile-Bastion/main/Obj/Tower_01/castle%20wall%20norm.png';

textureLoader.load(
    textureUrl,
    (texture) => {
        // Erstelle ein neues Material mit der geladenen Textur
        const material = new THREE.MeshPhongMaterial({ map: texture });
        // Wende das neue Material auf den Turm an
        tower.material = material;
        tower.material.needsUpdate = true;
    },
    undefined, // onProgress callback
    (error) => {
        console.error('Ein Fehler ist beim Laden der Turm-Textur aufgetreten.', error);
    }
);

// Spieler-Steuerung
const keys = {};
document.addEventListener('keydown', (event) => { keys[event.code] = true; });
document.addEventListener('keyup', (event) => { keys[event.code] = false; });

// Spiel- und Spieler-Statistiken
const playerStats = {
    bonusPoints: 0,
    health: {
        current: 1,
        max: 1,
        cost: 100,
        upgradeAmount: 1
    },
    playerSpeed: {
        current: 10,
        cost: 80,
        upgradeAmount: 2
    },
    bullet: {
        speed: {
            current: 0.2,
            cost: 120,
            upgradeAmount: 0.02
        },
        damage: {
            current: 1,
            cost: 200,
            upgradeAmount: 1
        }
    },
    autoShoot: {
        enabled: false,
        enableCost: 250,
        fireRate: {
            current: 0.5, // Schüsse pro Sekunde (1 Schuss alle 2 Sekunden)
            cost: 150,
            upgradeAmount: 0.2
        },
        range: {
            current: 10,
            cost: 150,
            upgradeAmount: 1
        }
    },
    enemyDebuffs: {
        speed: {
            modifier: 1.0, // 100%
            cost: 200,
            upgradeAmount: 0.05 // 5% reduction
        },
        spawnRate: {
            modifier: 1.0, // 100%
            cost: 300,
            upgradeAmount: 0.05 // 5% reduction
        }
    }
};

let score, startTime, isGameOver, enemySpawnTimeoutId;
let baseEnemySpeed = 0.05;
const enemies = [];
const bullets = [];
const particles = [];
const powerUps = [];
let lastShotTime = 0;
let powerUpSpawnTimeoutId;
let isSpawnWarningActive = false;
let windEventTimeoutId;
let isWindActive = false;
let windVector = new THREE.Vector3(0, 0, 0);
let rainEventTimeoutId;
let isRainActive = false;

// --- Visual Objects ---
let windParticles;
let rainParticles;

function createRainParticles() {
    const particleCount = 1000;
    const vertices = [];
    for (let i = 0; i < particleCount; i++) {
        const x = (Math.random() - 0.5) * FIELD_WIDTH;
        const y = Math.random() * FIELD_HEIGHT * 2; // Start higher up
        const z = (Math.random() - 0.5) * 2;
        vertices.push(x, y, z);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const material = new THREE.PointsMaterial({
        color: 0xaaaaee,
        size: 0.15,
        transparent: true,
        opacity: 0.6
    });

    rainParticles = new THREE.Points(geometry, material);
    rainParticles.visible = false;
    scene.add(rainParticles);
}

function createWindParticles() {
    const particleCount = 500;
    const vertices = [];
    for (let i = 0; i < particleCount; i++) {
        const x = (Math.random() - 0.5) * FIELD_WIDTH * 2;
        const y = (Math.random() - 0.5) * FIELD_HEIGHT * 2;
        const z = (Math.random() - 0.5) * 2;
        vertices.push(x, y, z);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1,
        transparent: true,
        opacity: 0.7
    });

    windParticles = new THREE.Points(geometry, material);
    windParticles.visible = false;
    scene.add(windParticles);
}

const spawnWarningMarker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 0.1, 32),
    new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 })
);
spawnWarningMarker.visible = false;
scene.add(spawnWarningMarker);


function spawnEnemy(position) {
    let enemy;
    const isTank = score > 150 && Math.random() < 0.2; // 20% chance to spawn a tank after score 150

    if (isTank) {
        const enemyGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8); // Bigger
        const enemyMaterial = new THREE.MeshBasicMaterial({ color: 0x800080 }); // Purple
        enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
        enemy.userData = {
            type: 'tank',
            health: 5,
            speedModifier: 0.6, // Slower
            points: 50
        };
    } else {
        const enemyGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const enemyMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red
        enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
        enemy.userData = {
            type: 'normal',
            health: 1,
            speedModifier: 1.0, // Normal speed
            points: 10
        };
    }

    enemy.position.copy(position);
    const direction = new THREE.Vector3().subVectors(tower.position, enemy.position).normalize();
    enemy.userData.direction = direction;
    enemies.push(enemy);
    scene.add(enemy);
}

function createExplosion(position) {
    const particleCount = 30;
    const particleGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const particleMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });

    for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.copy(position);

        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
        );

        particle.userData.lifetime = 100 + Math.random() * 100; // Lifetime in frames

        particles.push(particle);
        scene.add(particle);
    }
}

function spawnPowerUp() {
    if (powerUps.length > 0 || isGameOver) return; // Only one power-up at a time

    const powerUpGeometry = new THREE.TorusKnotGeometry(0.3, 0.1, 100, 16);
    const powerUpMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.5 });
    const powerUp = new THREE.Mesh(powerUpGeometry, powerUpMaterial);

    const halfW = FIELD_WIDTH / 2 - 1;
    const halfH = FIELD_HEIGHT / 2 - 1;

    powerUp.position.set(
        (Math.random() * 2 - 1) * halfW,
        (Math.random() * 2 - 1) * halfH,
        0.5
    );

    powerUp.userData.type = 'spawn_warning';
    powerUps.push(powerUp);
    scene.add(powerUp);
}

function scheduleNextPowerUpSpawn() {
    if (isGameOver) return;
    const spawnRate = 20000 + Math.random() * 10000; // 20-30 seconds
    powerUpSpawnTimeoutId = setTimeout(() => {
        spawnPowerUp();
        scheduleNextPowerUpSpawn();
    }, spawnRate);
}

function triggerWindEvent() {
    if (isGameOver) return;

    const directions = [
        { name: 'Norden', vec: new THREE.Vector3(0, 0.01, 0) },
        { name: 'Osten', vec: new THREE.Vector3(0.01, 0, 0) },
        { name: 'Süden', vec: new THREE.Vector3(0, -0.01, 0) },
        { name: 'Westen', vec: new THREE.Vector3(-0.01, 0, 0) }
    ];
    const direction = directions[Math.floor(Math.random() * directions.length)];

    eventTextEl.textContent = `WARNUNG: Starker Wind aus ${direction.name}!`;
    eventContainerEl.style.display = 'block';

    // Warnung für 3 Sekunden anzeigen, dann Wind starten
    setTimeout(() => {
        eventContainerEl.style.display = 'none';
        isWindActive = true;
        windVector.copy(direction.vec);
        windParticles.visible = true;

        // Wind für 10 Sekunden aktiv lassen
        setTimeout(() => {
            isWindActive = false;
            windVector.set(0, 0, 0);
            windParticles.visible = false;
        }, 10000);

    }, 3000);
}

function scheduleNextWindEvent() {
    if (isGameOver) return;
    const spawnRate = 30000 + Math.random() * 15000; // 30-45 seconds
    windEventTimeoutId = setTimeout(() => {
        triggerWindEvent();
        scheduleNextWindEvent();
    }, spawnRate);
}

function triggerRainEvent() {
    if (isGameOver) return;

    eventTextEl.textContent = 'WARNUNG: Regen setzt ein!';
    eventContainerEl.style.display = 'block';

    setTimeout(() => {
        eventContainerEl.style.display = 'none';
        isRainActive = true;
        rainParticles.visible = true;

        setTimeout(() => {
            isRainActive = false;
            rainParticles.visible = false;
        }, 15000); // Rain for 15 seconds

    }, 3000); // 3 second warning
}

function scheduleNextRainEvent() {
    if (isGameOver) return;
    const spawnRate = 35000 + Math.random() * 20000; // 35-55 seconds
    rainEventTimeoutId = setTimeout(() => {
        triggerRainEvent();
        scheduleNextRainEvent();
    }, spawnRate);
}

function scheduleNextEnemySpawn() {
    if (isGameOver) return;

    // 1. Calculate spawn position ahead of time
    const side = Math.floor(Math.random() * 4);
    const halfW = FIELD_WIDTH / 2;
    const halfH = FIELD_HEIGHT / 2;
    const spawnBuffer = 1;
    let x, y;
    switch (side) {
        case 0: x = Math.random() * FIELD_WIDTH - halfW; y = halfH + spawnBuffer; break;
        case 1: x = Math.random() * FIELD_WIDTH - halfW; y = -halfH - spawnBuffer; break;
        case 2: x = -halfW - spawnBuffer; y = Math.random() * FIELD_HEIGHT - halfH; break;
        case 3: x = halfW + spawnBuffer; y = Math.random() * FIELD_HEIGHT - halfH; break;
    }
    const spawnPosition = new THREE.Vector3(x, y, 0);

    // 2. Show warning if power-up is active
    if (isSpawnWarningActive) {
        spawnWarningMarker.position.set(x, y, 0.05);
        spawnWarningMarker.visible = true;
    }

    // 3. Schedule the spawn
    const baseSpawnRate = 2000;
    const minSpawnRate = 500;
    const spawnRateDecrease = score * 5;
    const finalSpawnRate = Math.max(minSpawnRate, (baseSpawnRate - spawnRateDecrease) * playerStats.enemyDebuffs.spawnRate.modifier);

    enemySpawnTimeoutId = setTimeout(() => {
        spawnWarningMarker.visible = false; // Hide marker
        spawnEnemy(spawnPosition);
        scheduleNextEnemySpawn();
    }, finalSpawnRate);
}

function updateHealthDisplay() {
    healthEl.textContent = `Health: ${playerStats.health.current}/${playerStats.health.max}`;
}

function init() {
    isGameOver = false;
    score = 0;
    startTime = Date.now();
    playerStats.health.current = playerStats.health.max;
    tower.position.set(0, 0, 0);
    towerVelocity.set(0, 0);
    tower.visible = true; // Mache den Turm wieder sichtbar
    enemies.forEach(enemy => scene.remove(enemy));
    enemies.length = 0;
    // Entferne auch alle verbleibenden Partikel
    particles.forEach(particle => scene.remove(particle));
    particles.length = 0;
    powerUps.forEach(p => scene.remove(p));
    powerUps.length = 0;

    // Reset weather/event states
    isRainActive = false;
    isWindActive = false;
    windVector.set(0, 0, 0);
    if (rainParticles) rainParticles.visible = false;
    if (windParticles) windParticles.visible = false;
    eventContainerEl.style.display = 'none';

    gameOverContainerEl.style.display = 'none';
    clearTimeout(enemySpawnTimeoutId);
    clearTimeout(powerUpSpawnTimeoutId);
    clearTimeout(windEventTimeoutId);
    clearTimeout(rainEventTimeoutId);
    scheduleNextEnemySpawn();
    scheduleNextPowerUpSpawn();
    scheduleNextWindEvent();
    scheduleNextRainEvent();
    updateHealthDisplay();
    animate();
}

function showGameOverScreen() {
    // This function is being overwritten to ensure the 1:1 point conversion.
    const earnedBonus = score;
    playerStats.bonusPoints += earnedBonus;
    finalScoreEl.textContent = score;
    updateShopUI();
    gameOverContainerEl.style.display = 'flex';
}

function gameOver() {
    if (isGameOver) return; // Verhindere mehrfaches Auslösen

    isGameOver = true;
    clearTimeout(enemySpawnTimeoutId);
    clearTimeout(powerUpSpawnTimeoutId);
    clearTimeout(windEventTimeoutId);
    clearTimeout(rainEventTimeoutId);

    // Verzögere das Anzeigen des Game-Over-Bildschirms
    setTimeout(showGameOverScreen, 2000); // 2 Sekunden Verzögerung
}

function animate() {
    requestAnimationFrame(animate);

    if (!isGameOver) {
        score = Math.floor((Date.now() - startTime) / 100);
        scoreEl.textContent = `Score: ${score} (+${playerStats.bonusPoints})`;
    const gameSpeed = (baseEnemySpeed + score * 0.0001) * playerStats.enemyDebuffs.speed.modifier;

    // --- Turm-Bewegung (neue Physik) ---
    const moveForce = 0.002; // Base force
    const totalMoveForce = moveForce * playerStats.playerSpeed.current; // Apply speed upgrade
    if (keys['ArrowUp']) towerVelocity.y += totalMoveForce;
    if (keys['ArrowDown']) towerVelocity.y -= totalMoveForce;
    if (keys['ArrowLeft']) towerVelocity.x -= totalMoveForce;
    if (keys['ArrowRight']) towerVelocity.x += totalMoveForce;

    // Geschwindigkeit anwenden
    tower.position.x += towerVelocity.x;
    tower.position.y += towerVelocity.y;

    // Dämpfung (Reibung)
    const damping = isRainActive ? 0.97 : 0.90; // Weniger Reibung bei Regen
    towerVelocity.multiplyScalar(damping);


    // Windeinfluss
    if (isWindActive) {
        tower.position.add(windVector);
    }

    // Spielerbewegung auf das Spielfeld beschränken
    const towerRadius = 0.5;
    const halfWidth = FIELD_WIDTH / 2 - towerRadius;
    const halfHeight = FIELD_HEIGHT / 2 - towerRadius;
    tower.position.x = Math.max(-halfWidth, Math.min(halfWidth, tower.position.x));
    tower.position.y = Math.max(-halfHeight, Math.min(halfHeight, tower.position.y));

    // Autoschuss-Logik
    if (playerStats.autoShoot.enabled) {
        if (Date.now() - lastShotTime > 1000 / playerStats.autoShoot.fireRate.current) {
            let nearestEnemy = null;
            let minDistance = Infinity;

            enemies.forEach(enemy => {
                const distance = tower.position.distanceTo(enemy.position);
                if (distance < minDistance && distance < playerStats.autoShoot.range.current) {
                    minDistance = distance;
                    nearestEnemy = enemy;
                }
            });

            if (nearestEnemy) {
                const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
                const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
                const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
                bullet.position.copy(tower.position);
                const direction = new THREE.Vector3().subVectors(nearestEnemy.position, tower.position).normalize();
                bullet.userData.direction = direction;
                bullets.push(bullet);
                scene.add(bullet);
                lastShotTime = Date.now();
            }
        }
    }

    // Kugel-Bewegung und Kollision
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.position.add(bullet.userData.direction.clone().multiplyScalar(playerStats.bullet.speed.current));

        if (bullet.position.length() > 20) {
            scene.remove(bullet);
            bullets.splice(i, 1);
            continue;
        }

        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (bullet.position.distanceTo(enemy.position) < 0.5) { // Increased hit box slightly
                scene.remove(bullet);
                bullets.splice(i, 1);

                enemy.userData.health -= playerStats.bullet.damage.current;

                if (enemy.userData.health <= 0) {
                    scene.remove(enemy);
                    enemies.splice(j, 1);
                    score += enemy.userData.points;
                }
                // scoreEl is updated in the main loop, no need to set it here twice
                break;
            }
        }
    }


    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const direction = new THREE.Vector3().subVectors(tower.position, enemy.position).normalize();
        enemy.userData.direction = direction;
        const enemySpeed = gameSpeed * enemy.userData.speedModifier;
        enemy.position.add(enemy.userData.direction.clone().multiplyScalar(enemySpeed));
        if (isWindActive) {
            enemy.position.add(windVector);
        }
        const distance = tower.position.distanceTo(enemy.position);
        if (distance < 0.75) {
            playerStats.health.current--;
            updateHealthDisplay();
            scene.remove(enemy);
            enemies.splice(i, 1);
            if (playerStats.health.current <= 0) {
                createExplosion(tower.position);
                tower.visible = false;
                gameOver();
            }
            continue;
        }
        if (enemy.position.length() > 20) {
            scene.remove(enemy);
            enemies.splice(i, 1);
        }
    }
    }

    // Power-up Animation und Kollision
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        powerUp.rotation.y += 0.02;
        powerUp.rotation.x += 0.01;

        if (tower.position.distanceTo(powerUp.position) < 0.8) {
            // Power-up eingesammelt
            if (powerUp.userData.type === 'spawn_warning') {
                isSpawnWarningActive = true;
                setTimeout(() => {
                    isSpawnWarningActive = false;
                }, 10000); // Effekt hält 10 Sekunden
            }
            scene.remove(powerUp);
            powerUps.splice(i, 1);
        }
    }

    // Wind-Partikel-Animation
    if (windParticles.visible) {
        const positions = windParticles.geometry.attributes.position.array;
        const particleSpeed = 5; // Multiplier for visual speed
        const halfW = FIELD_WIDTH; // Wrap around a larger area
        const halfH = FIELD_HEIGHT;

        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += windVector.x * particleSpeed;
            positions[i+1] += windVector.y * particleSpeed;

            // Wrap around logic
            if (positions[i] > halfW) positions[i] = -halfW;
            if (positions[i] < -halfW) positions[i] = halfW;
            if (positions[i+1] > halfH) positions[i+1] = -halfH;
            if (positions[i+1] < -halfH) positions[i+1] = halfH;
        }
        windParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Regen-Partikel-Animation
    if (rainParticles.visible) {
        const positions = rainParticles.geometry.attributes.position.array;
        const rainSpeed = 0.2;
        const topY = FIELD_HEIGHT;
        const bottomY = -FIELD_HEIGHT / 2;

        for (let i = 0; i < positions.length; i += 3) {
            positions[i+1] -= rainSpeed;
            if (positions[i+1] < bottomY) {
                positions[i+1] = topY;
            }
        }
        rainParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Partikel-Animation
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.position.add(particle.userData.velocity);
        particle.userData.velocity.y -= 0.0005; // Schwerkraft
        particle.userData.lifetime -= 1;
        if (particle.userData.lifetime <= 0) {
            scene.remove(particle);
            particles.splice(i, 1);
        }
    }

    renderer.render(scene, camera);
}

function updateShopUI() {
    // Update all text contents
    bonusPointsEl.textContent = playerStats.bonusPoints;

    healthStatEl.textContent = playerStats.health.max;
    healthCostEl.textContent = playerStats.health.cost;

    playerSpeedStatEl.textContent = playerStats.playerSpeed.current.toFixed(2);
    playerSpeedCostEl.textContent = playerStats.playerSpeed.cost;

    bulletSpeedStatEl.textContent = playerStats.bullet.speed.current.toFixed(2);
    bulletSpeedCostEl.textContent = playerStats.bullet.speed.cost;
    bulletDamageStatEl.textContent = playerStats.bullet.damage.current;
    bulletDamageCostEl.textContent = playerStats.bullet.damage.cost;

    if (playerStats.autoShoot.enabled) {
        autoshootEnableContainerEl.style.display = 'none';
        autoshootUpgradesContainerEl.style.display = 'block';

        firerateStatEl.textContent = playerStats.autoShoot.fireRate.current.toFixed(1);
        firerateCostEl.textContent = playerStats.autoShoot.fireRate.cost;

        rangeStatEl.textContent = playerStats.autoShoot.range.current;
        rangeCostEl.textContent = playerStats.autoShoot.range.cost;
    } else {
        autoshootEnableContainerEl.style.display = 'block';
        autoshootUpgradesContainerEl.style.display = 'none';
        autoshootEnableCostEl.textContent = playerStats.autoShoot.enableCost;
    }

    enemySpeedStatEl.textContent = `${(playerStats.enemyDebuffs.speed.modifier * 100).toFixed(0)}%`;
    enemySpeedCostEl.textContent = playerStats.enemyDebuffs.speed.cost;

    spawnRateStatEl.textContent = `${(playerStats.enemyDebuffs.spawnRate.modifier * 100).toFixed(0)}%`;
    spawnRateCostEl.textContent = playerStats.enemyDebuffs.spawnRate.cost;
}

// --- Event Listeners for Upgrades ---

upgradeHealthButtonEl.addEventListener('click', () => {
    const stat = playerStats.health;
    if (playerStats.bonusPoints >= stat.cost) {
        playerStats.bonusPoints -= stat.cost;
        stat.max += stat.upgradeAmount;
        stat.cost = Math.floor(stat.cost * 1.2); // Increase cost by 20%
        updateShopUI();
    } else {
        alert('Nicht genügend Bonus-Punkte!');
    }
});

upgradePlayerSpeedButtonEl.addEventListener('click', () => {
    const stat = playerStats.playerSpeed;
    if (playerStats.bonusPoints >= stat.cost) {
        playerStats.bonusPoints -= stat.cost;
        stat.current += stat.upgradeAmount;
        stat.cost = Math.floor(stat.cost * 1.3);
        updateShopUI();
    } else {
        alert('Nicht genügend Bonus-Punkte!');
    }
});

upgradeBulletSpeedButtonEl.addEventListener('click', () => {
    const stat = playerStats.bullet.speed;
    if (playerStats.bonusPoints >= stat.cost) {
        playerStats.bonusPoints -= stat.cost;
        stat.current += stat.upgradeAmount;
        stat.cost = Math.floor(stat.cost * 1.3);
        updateShopUI();
    } else {
        alert('Nicht genügend Bonus-Punkte!');
    }
});

upgradeBulletDamageButtonEl.addEventListener('click', () => {
    const stat = playerStats.bullet.damage;
    if (playerStats.bonusPoints >= stat.cost) {
        playerStats.bonusPoints -= stat.cost;
        stat.current += stat.upgradeAmount;
        stat.cost = Math.floor(stat.cost * 1.8); // Damage is powerful, so higher cost increase
        updateShopUI();
    } else {
        alert('Nicht genügend Bonus-Punkte!');
    }
});

upgradeAutoshootButtonEl.addEventListener('click', () => {
    const stat = playerStats.autoShoot;
    if (playerStats.bonusPoints >= stat.enableCost) {
        playerStats.bonusPoints -= stat.enableCost;
        stat.enabled = true;
        updateShopUI();
    } else {
        alert('Nicht genügend Bonus-Punkte!');
    }
});

upgradeFirerateButtonEl.addEventListener('click', () => {
    const stat = playerStats.autoShoot.fireRate;
    if (playerStats.bonusPoints >= stat.cost) {
        playerStats.bonusPoints -= stat.cost;
        stat.current += stat.upgradeAmount;
        stat.cost = Math.floor(stat.cost * 1.4);
        updateShopUI();
    } else {
        alert('Nicht genügend Bonus-Punkte!');
    }
});

upgradeRangeButtonEl.addEventListener('click', () => {
    const stat = playerStats.autoShoot.range;
    if (playerStats.bonusPoints >= stat.cost) {
        playerStats.bonusPoints -= stat.cost;
        stat.current += stat.upgradeAmount;
        stat.cost = Math.floor(stat.cost * 1.2);
        updateShopUI();
    } else {
        alert('Nicht genügend Bonus-Punkte!');
    }
});

downgradeEnemySpeedButtonEl.addEventListener('click', () => {
    const stat = playerStats.enemyDebuffs.speed;
    if (playerStats.bonusPoints >= stat.cost) {
        playerStats.bonusPoints -= stat.cost;
        stat.modifier -= stat.upgradeAmount;
        stat.cost = Math.floor(stat.cost * 1.5);
        updateShopUI();
    } else {
        alert('Nicht genügend Bonus-Punkte!');
    }
});

downgradeSpawnRateButtonEl.addEventListener('click', () => {
    const stat = playerStats.enemyDebuffs.spawnRate;
    if (playerStats.bonusPoints >= stat.cost) {
        playerStats.bonusPoints -= stat.cost;
        stat.modifier -= stat.upgradeAmount;
        stat.cost = Math.floor(stat.cost * 1.5);
        updateShopUI();
    } else {
        alert('Nicht genügend Bonus-Punkte!');
    }
});


window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

restartButtonEl.addEventListener('click', init);
createWindParticles();
createRainParticles();
init();
