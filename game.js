// Annahme: Three.js ist über ein CDN in index.html eingebunden.
// <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

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
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Kamera-Position
camera.position.z = 5;

// Spieler-Turm erstellen
const towerGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
const towerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const tower = new THREE.Mesh(towerGeometry, towerMaterial);
scene.add(tower);

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
const bulletSpeed = 0.2;
let lastShotTime = 0;

function spawnEnemy() {
    const enemyGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const enemyMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
    const side = Math.floor(Math.random() * 4);
    const spawnDistance = 10;
    const position = new THREE.Vector3();
    switch (side) {
        case 0: position.set((Math.random() - 0.5) * 20, spawnDistance, 0); break;
        case 1: position.set((Math.random() - 0.5) * 20, -spawnDistance, 0); break;
        case 2: position.set(-spawnDistance, (Math.random() - 0.5) * 20, 0); break;
        case 3: position.set(spawnDistance, (Math.random() - 0.5) * 20, 0); break;
    }
    enemy.position.copy(position);
    const direction = new THREE.Vector3().subVectors(tower.position, enemy.position).normalize();
    enemy.userData.direction = direction;
    enemies.push(enemy);
    scene.add(enemy);
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
    enemies.forEach(enemy => scene.remove(enemy));
    enemies.length = 0;
    gameOverContainerEl.style.display = 'none';
    clearTimeout(enemySpawnTimeoutId);
    scheduleNextEnemySpawn();
    updateHealthDisplay();
    animate();
}

function gameOver() {
    isGameOver = true;
    clearTimeout(enemySpawnTimeoutId);
    const earnedBonus = Math.floor(score / 10);
    playerStats.bonusPoints += earnedBonus;
    finalScoreEl.textContent = score;
    bonusPointsEl.textContent = playerStats.bonusPoints;
    gameOverContainerEl.style.display = 'flex';
}

function animate() {
    if (isGameOver) return;
    requestAnimationFrame(animate);
    score = Math.floor((Date.now() - startTime) / 100);
    scoreEl.textContent = `Score: ${score}`;
    enemySpeed = 0.05 + score * 0.0001;
    if (keys['ArrowUp']) tower.position.y += playerSpeed;
    if (keys['ArrowDown']) tower.position.y -= playerSpeed;
    if (keys['ArrowLeft']) tower.position.x -= playerSpeed;
    if (keys['ArrowRight']) tower.position.x += playerSpeed;

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
                gameOver();
            }
            continue;
        }
        if (enemy.position.length() > 20) {
            scene.remove(enemy);
            enemies.splice(i, 1);
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
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

restartButtonEl.addEventListener('click', init);
init();
