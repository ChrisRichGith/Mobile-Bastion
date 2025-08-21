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

// Szene, Kamera und Renderer initialisieren
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x333333); // Dunkelgrauer Hintergrund

// Spielfeld visualisieren
const gridHelper = new THREE.GridHelper(FIELD_WIDTH, FIELD_HEIGHT);
gridHelper.rotation.x = Math.PI / 2;
scene.add(gridHelper);

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
const playerSpeed = 0.1;

// Spiel- und Spieler-Statistiken
const playerStats = {
    maxHealth: 1,
    bonusPoints: 0,
    autoShoot: {
        enabled: false,
        fireRate: 1, // Schüsse pro Sekunde
        range: 10,
    }
};
let currentHealth, score, startTime, isGameOver, enemySpawnTimeoutId;
let enemySpeed = 0.05;
const enemies = [];
const bullets = [];
const particles = [];
const bulletSpeed = 0.2;
let lastShotTime = 0;

function spawnEnemy() {
    const enemyGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const enemyMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);

    const side = Math.floor(Math.random() * 4);
    const halfW = FIELD_WIDTH / 2;
    const halfH = FIELD_HEIGHT / 2;
    const spawnBuffer = 1; // Wie weit außerhalb der Grenzen sie erscheinen

    let x, y;

    switch (side) {
        case 0: // Oben
            x = Math.random() * FIELD_WIDTH - halfW;
            y = halfH + spawnBuffer;
            break;
        case 1: // Unten
            x = Math.random() * FIELD_WIDTH - halfW;
            y = -halfH - spawnBuffer;
            break;
        case 2: // Links
            x = -halfW - spawnBuffer;
            y = Math.random() * FIELD_HEIGHT - halfH;
            break;
        case 3: // Rechts
            x = halfW + spawnBuffer;
            y = Math.random() * FIELD_HEIGHT - halfH;
            break;
    }

    enemy.position.set(x, y, 0);
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

function scheduleNextEnemySpawn() {
    if (isGameOver) return;
    const baseSpawnRate = 2000;
    const minSpawnRate = 500;
    const spawnRate = Math.max(minSpawnRate, baseSpawnRate - score * 5);
    enemySpawnTimeoutId = setTimeout(() => {
        spawnEnemy();
        scheduleNextEnemySpawn();
    }, spawnRate);
}

function updateHealthDisplay() {
    healthEl.textContent = `Health: ${currentHealth}/${playerStats.maxHealth}`;
}

function init() {
    isGameOver = false;
    score = 0;
    startTime = Date.now();
    currentHealth = playerStats.maxHealth;
    enemySpeed = 0.05;
    tower.position.set(0, 0, 0);
    tower.visible = true; // Mache den Turm wieder sichtbar
    enemies.forEach(enemy => scene.remove(enemy));
    enemies.length = 0;
    // Entferne auch alle verbleibenden Partikel
    particles.forEach(particle => scene.remove(particle));
    particles.length = 0;
    gameOverContainerEl.style.display = 'none';
    clearTimeout(enemySpawnTimeoutId);
    scheduleNextEnemySpawn();
    updateHealthDisplay();
    animate();
}

function showGameOverScreen() {
    const earnedBonus = Math.floor(score / 10);
    playerStats.bonusPoints += earnedBonus;
    finalScoreEl.textContent = score;
    bonusPointsEl.textContent = playerStats.bonusPoints;
    gameOverContainerEl.style.display = 'flex';
}

function gameOver() {
    if (isGameOver) return; // Verhindere mehrfaches Auslösen

    isGameOver = true;
    clearTimeout(enemySpawnTimeoutId);

    // Verzögere das Anzeigen des Game-Over-Bildschirms
    setTimeout(showGameOverScreen, 2000); // 2 Sekunden Verzögerung
}

function animate() {
    requestAnimationFrame(animate);

    if (!isGameOver) {
        score = Math.floor((Date.now() - startTime) / 100);
    scoreEl.textContent = `Score: ${score}`;
    enemySpeed = 0.05 + score * 0.0001;
    if (keys['ArrowUp']) tower.position.y += playerSpeed;
    if (keys['ArrowDown']) tower.position.y -= playerSpeed;
    if (keys['ArrowLeft']) tower.position.x -= playerSpeed;
    if (keys['ArrowRight']) tower.position.x += playerSpeed;

    // Spielerbewegung auf das Spielfeld beschränken
    const halfWidth = FIELD_WIDTH / 2;
    const halfHeight = FIELD_HEIGHT / 2;
    tower.position.x = Math.max(-halfWidth, Math.min(halfWidth, tower.position.x));
    tower.position.y = Math.max(-halfHeight, Math.min(halfHeight, tower.position.y));

    // Autoschuss-Logik
    if (playerStats.autoShoot.enabled) {
        const { fireRate, range } = playerStats.autoShoot;
        if (Date.now() - lastShotTime > 1000 / fireRate) {
            let nearestEnemy = null;
            let minDistance = Infinity;

            enemies.forEach(enemy => {
                const distance = tower.position.distanceTo(enemy.position);
                if (distance < minDistance && distance < range) {
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
        bullet.position.add(bullet.userData.direction.clone().multiplyScalar(bulletSpeed));

        if (bullet.position.length() > 20) {
            scene.remove(bullet);
            bullets.splice(i, 1);
            continue;
        }

        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (bullet.position.distanceTo(enemy.position) < 0.3) {
                scene.remove(bullet);
                bullets.splice(i, 1);
                scene.remove(enemy);
                enemies.splice(j, 1);
                score += 10;
                scoreEl.textContent = `Score: ${score}`;
                break;
            }
        }
    }


    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const direction = new THREE.Vector3().subVectors(tower.position, enemy.position).normalize();
        enemy.userData.direction = direction;
        enemy.position.add(enemy.userData.direction.clone().multiplyScalar(enemySpeed));
        const distance = tower.position.distanceTo(enemy.position);
        if (distance < 0.75) {
            currentHealth--;
            updateHealthDisplay();
            scene.remove(enemy);
            enemies.splice(i, 1);
            if (currentHealth <= 0) {
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

upgradeHealthButtonEl.addEventListener('click', () => {
    const cost = 100;
    if (playerStats.bonusPoints >= cost) {
        playerStats.bonusPoints -= cost;
        playerStats.maxHealth++;
        bonusPointsEl.textContent = playerStats.bonusPoints;
        alert('Health-Upgrade erfolgreich! Du hast jetzt mehr Leben.');
    } else {
        alert('Nicht genügend Bonus-Punkte!');
    }
});

upgradeAutoshootButtonEl.addEventListener('click', () => {
    const cost = 250;
    if (playerStats.autoShoot.enabled) {
        // Hier könnte man weitere Upgrades für Feuerrate, Reichweite etc. einbauen
        alert('Auto-Shoot ist bereits aktiviert!');
        return;
    }

    if (playerStats.bonusPoints >= cost) {
        playerStats.bonusPoints -= cost;
        playerStats.autoShoot.enabled = true;
        bonusPointsEl.textContent = playerStats.bonusPoints;
        upgradeAutoshootButtonEl.disabled = true;
        upgradeAutoshootButtonEl.textContent = 'Auto-Shoot Aktiviert';
        alert('Auto-Shoot aktiviert!');
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
init();
