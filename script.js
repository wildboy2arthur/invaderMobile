// --- Canvas Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');
const fireButton = document.getElementById('fireButton');
const restartButton = document.getElementById('restartButton');

// --- Game Settings ---
canvas.width = 800;
canvas.height = 600;

let player;
let invaders = [];
let bullets = [];
let bombs = [];
let stars = [];
let score = 0;
let lives = 3;
let gameState = 'playing';
let keys = {};
let touchLeft = false;
let touchRight = false;
let currentLevel = 1;

// --- High Score Settings ---
// *** 新增：最高分相關設定 ***
const HIGH_SCORE_KEY = 'invaderHighScores_Arthur'; // localStorage 的鍵名
const MAX_HIGH_SCORES = 5; // 保留最高分的數量
let highScores = []; // 用於儲存讀取的分數

// --- Player Settings --- (內容不變)
const playerWidth = 50; const playerHeight = 30; const playerSpeed = 6;
// --- Bullet Settings --- (內容不變)
const bulletWidth = 5; const bulletHeight = 15; const bulletSpeed = 8;
// --- Invader Settings --- (內容不變)
const invaderWidth = 30; const invaderHeight = 20; const invaderSpacing = 15; const invaderRows = 5; const invaderCols = 10; let baseInvaderSpeedX = 2; let invaderSpeedX = baseInvaderSpeedX; const invaderDropDistance = 15; let baseInvaderFireRate = 0.001; let invaderFireRate = baseInvaderFireRate; const periodicDescentInterval = 15000; let timeSinceLastPeriodicDescent = 0;
// --- Bomb Settings --- (內容不變)
const bombWidth = 5; const bombHeight = 10; let baseBombSpeed = 2.5; let bombSpeed = baseBombSpeed;
// --- Starfield Settings --- (內容不變)
const numStars = 150; const starSpeed = 0.5;

// --- Sound Effects & Music Setup --- (內容不變)
const shootSound = new Audio('sounds/shoot.wav'); const explosionSound = new Audio('sounds/explosion.wav'); const gameOverSound = new Audio('sounds/game_over.wav'); const backgroundMusic = new Audio('sounds/background_music.mp3'); backgroundMusic.loop = true; backgroundMusic.volume = 0.3;
function playSound(sound) { if (sound && typeof sound.play === 'function') { sound.currentTime = 0; sound.play().catch(error => { console.warn("Sound playback failed:", error); }); } }
let gameOverSoundPlayed = false; let musicStarted = false;
function startMusic() { if (!musicStarted && backgroundMusic && typeof backgroundMusic.play === 'function') { backgroundMusic.play().then(() => { musicStarted = true; console.log("BG music started."); }).catch(error => { console.warn("BG music autoplay failed.", error); }); } else if (musicStarted && backgroundMusic.paused) { backgroundMusic.play().catch(error => { console.warn("Restarting music failed:", error); }); } }

// --- Image Assets --- (內容不變)
const invaderImage = new Image(); invaderImage.src = 'images/enemy.svg'; let invaderImageLoaded = false; invaderImage.onload = () => { invaderImageLoaded = true; console.log("Invader image loaded."); }; invaderImage.onerror = () => { console.error("Failed to load invader image!"); }; const playerImage = new Image(); playerImage.src = 'images/player.svg'; let playerImageLoaded = false; playerImage.onload = () => { playerImageLoaded = true; console.log("Player image loaded."); }; playerImage.onerror = () => { console.error("Failed to load player image!"); };

// --- High Score Functions ---
// *** 新增：讀取最高分 ***
function loadHighScores() {
    const scoresJSON = localStorage.getItem(HIGH_SCORE_KEY);
    try {
        highScores = scoresJSON ? JSON.parse(scoresJSON) : [];
        // 確保是數字陣列且已排序
        highScores = highScores.filter(score => typeof score === 'number').sort((a, b) => b - a);
    } catch (e) {
        console.error("Failed to parse high scores from localStorage:", e);
        highScores = [];
    }
    // 只保留前 MAX_HIGH_SCORES 個
     highScores = highScores.slice(0, MAX_HIGH_SCORES);
}

// *** 新增：儲存最高分 ***
function saveHighScore(newScore) {
    if (typeof newScore !== 'number' || newScore <= 0) return; // 不儲存 0 分或無效分數

    loadHighScores(); // 先載入最新的
    highScores.push(newScore); // 加入新分數
    highScores.sort((a, b) => b - a); // 降序排序
    highScores = highScores.slice(0, MAX_HIGH_SCORES); // 只保留前幾個

    try {
        localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(highScores));
        console.log("High scores saved:", highScores);
    } catch (e) {
        console.error("Failed to save high scores to localStorage:", e);
    }
}

// --- Game Object Creation --- (內容不變)
function createPlayer() { return { x: canvas.width / 2 - playerWidth / 2, y: canvas.height - playerHeight - 20, width: playerWidth, height: playerHeight, speed: playerSpeed }; }
function createInvaders() { invaders = []; const sX = 50, sY = 50; for (let r = 0; r < invaderRows; r++) { for (let c = 0; c < invaderCols; c++) { invaders.push({ x: sX + c * (invaderWidth + invaderSpacing), y: sY + r * (invaderHeight + invaderSpacing), width: invaderWidth, height: invaderHeight, alive: true }); } } }
function createStars() { stars = []; for (let i = 0; i < numStars; i++) { stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 2 + 0.5 }); } }

// --- Drawing Functions ---
function drawRect(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
function drawPlayer() { if (!player) return; if (playerImageLoaded && playerImage.complete) { ctx.drawImage(playerImage, player.x, player.y, player.width, player.height); } else { drawRect(player.x, player.y, player.width, player.height, 'blue'); } }
function drawInvaders() { invaders.forEach(inv => { if (inv.alive) { if (invaderImageLoaded && invaderImage.complete) { ctx.drawImage(invaderImage, inv.x, inv.y, inv.width, inv.height); } else { drawRect(inv.x, inv.y, inv.width, invaderHeight, 'red'); } } }); }
function drawBullets() { bullets.forEach(b => drawRect(b.x, b.y, b.width, b.height, b.color || 'yellow')); }
function drawBombs() { bombs.forEach(b => drawRect(b.x, b.y, b.width, b.height, b.color || 'red')); }
function drawStars() { ctx.fillStyle = 'white'; stars.forEach(star => { ctx.beginPath(); ctx.arc(star.x, star.y, star.size / 2, 0, Math.PI * 2); ctx.fill(); }); }
function drawUI() { ctx.fillStyle = 'white'; ctx.font = '20px Arial'; ctx.fillText(`分數: ${score}`, 10, 30); ctx.fillText(`關卡: ${currentLevel}`, canvas.width / 2 - 50, 30); ctx.fillText(`生命: ${lives}`, canvas.width - 100, 30); }

// *** 修改 drawGameOver 加入最高分和署名動畫 ***
let lastTimestampForAnimation = 0; // 用於動畫計算
function drawGameOver(timestamp) { // 從 gameLoop 獲取時間戳
    // 繪製半透明背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 繪製 "GAME OVER"
    ctx.fillStyle = 'red';
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 100); // 稍微上移

    // 繪製最終分數
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.fillText(`最終分數: ${score}`, canvas.width / 2, canvas.height / 2 - 40);

    // --- 繪製最高分 ---
    ctx.font = '24px Arial';
    ctx.fillStyle = '#FFD700'; // 金色
    ctx.fillText('最高分紀錄:', canvas.width / 2, canvas.height / 2 + 10);
    loadHighScores(); // 每次繪製時都讀取最新的（雖然可能不需要這麼頻繁）
    highScores.forEach((hs, index) => {
        ctx.fillText(`${index + 1}. ${hs}`, canvas.width / 2, canvas.height / 2 + 10 + (index + 1) * 30);
    });
    // --- 最高分結束 ---

    // --- 繪製署名動畫 ---
    const animationTime = timestamp || performance.now(); // 使用傳入的時間戳或當前時間
    const pulseSpeed = 1500; // 脈動週期 (毫秒)
    const minSize = 18; // 最小字體大小
    const maxSize = 22; // 最大字體大小
    // 使用 sin 函數創建 0 到 1 的脈動值
    const pulseFactor = (Math.sin(animationTime / pulseSpeed * Math.PI * 2) + 1) / 2;
    const currentSize = minSize + (maxSize - minSize) * pulseFactor;

    ctx.font = `italic bold ${currentSize.toFixed(1)}px Arial, sans-serif`;
    ctx.fillStyle = `rgba(0, 255, 255, ${0.7 + pulseFactor * 0.3})`; // 青色，透明度也輕微脈動
    ctx.textAlign = 'center';
    ctx.fillText('by Arthur Chen', canvas.width / 2, canvas.height - 30); // 放在底部中間
    // --- 署名動畫結束 ---


    ctx.textAlign = 'left'; // 重置對齊
    if (restartButton) restartButton.style.display = 'block'; // 顯示按鈕
}

// --- Update Logic ---
function updatePlayer(deltaTime) { /* (內容不變) */ if (!player) return; if ((keys['ArrowLeft'] || touchLeft) && player.x > 0) { player.x -= player.speed; } if ((keys['ArrowRight'] || touchRight) && player.x < canvas.width - player.width) { player.x += player.speed; } }
function updateBullets(deltaTime) { /* (內容不變) */ for (let i = bullets.length - 1; i >= 0; i--) { bullets[i].y -= bulletSpeed; if (bullets[i].y < 0) bullets.splice(i, 1); } }
function updateInvaders(deltaTime) { /* (內容不變，但在 gameOver 觸發前保存分數) */
    let anyAlive = invaders.some(inv => inv.alive); if (!anyAlive && gameState === 'playing') { startNextLevel(); return; }
    let moveDown = false, hitEdge = false; timeSinceLastPeriodicDescent += (deltaTime || 0); if (timeSinceLastPeriodicDescent >= periodicDescentInterval) { moveDown = true; timeSinceLastPeriodicDescent = 0; } let minX = canvas.width, maxX = 0; invaders.forEach(inv => { if (inv.alive) { inv.x += invaderSpeedX; minX = Math.min(minX, inv.x); maxX = Math.max(maxX, inv.x + inv.width); } }); if (minX <= 0 || maxX >= canvas.width) hitEdge = true; if (hitEdge) { invaderSpeedX *= -1; moveDown = true; invaders.forEach(inv => { if (inv.alive) inv.x += invaderSpeedX * 1.5; }); } if (moveDown) { invaders.forEach(inv => { if (inv.alive) { inv.y += invaderDropDistance; if (player && inv.y + inv.height >= player.y) { if (gameState === 'playing') { lives = 0; saveHighScore(score); // *** 在這裡保存分數 *** gameState = 'gameOver'; if (!gameOverSoundPlayed) { playSound(gameOverSound); gameOverSoundPlayed = true; } } } } }); } invaders.forEach(inv => { if (inv.alive && Math.random() < invaderFireRate) { bombs.push({ x: inv.x + inv.width / 2 - bombWidth / 2, y: inv.y + inv.height, width: bombWidth, height: bombHeight, speed: bombSpeed, color: 'red' }); } });
 }
function updateBombs(deltaTime) { /* (內容不變) */ for (let i = bombs.length - 1; i >= 0; i--) { bombs[i].y += bombSpeed; if (bombs[i].y > canvas.height) bombs.splice(i, 1); } }
function updateStars(deltaTime) { /* (內容不變) */ stars.forEach(star => { star.y += starSpeed; if (star.y > canvas.height + star.size) { star.y = 0 - star.size; star.x = Math.random() * canvas.width; } }); }

// --- Collision Detection ---
function checkCollision(rect1, rect2) { /* (內容不變) */ if (!rect1 || !rect2) return false; return rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y; }
function handleCollisions() { /* (在 gameOver 觸發前保存分數) */
    if (!player || gameState !== 'playing') return;
    // Bullets vs Invaders (內容不變)
    for (let i = bullets.length - 1; i >= 0; i--) { if (!bullets[i]) continue; for (let j = invaders.length - 1; j >= 0; j--) { if (invaders[j].alive && checkCollision(bullets[i], invaders[j])) { invaders[j].alive = false; playSound(explosionSound); bullets.splice(i, 1); score += 10; break; } } }
    // Bombs vs Player
    for (let i = bombs.length - 1; i >= 0; i--) { if (!bombs[i]) continue; if (checkCollision(bombs[i], player)) { bombs.splice(i, 1); lives--; playSound(explosionSound); if (lives <= 0) { lives = 0; saveHighScore(score); // *** 在這裡保存分數 *** gameState = 'gameOver'; if (!gameOverSoundPlayed) { playSound(gameOverSound); gameOverSoundPlayed = true; } } } }
    // Invaders vs Player
    invaders.forEach(inv => { if (inv.alive && checkCollision(inv, player)) { lives = 0; saveHighScore(score); // *** 在這裡保存分數 *** gameState = 'gameOver'; playSound(explosionSound); if (!gameOverSoundPlayed) { playSound(gameOverSound); gameOverSoundPlayed = true; } } });
}


// --- Game Loop ---
let lastTime = 0;
function gameLoop(timestamp) { // *** 將 timestamp 傳入 ***
    if (!ctx) return;
    if (typeof timestamp !== 'number') timestamp = lastTime; // 處理初始調用
    const deltaTime = timestamp - lastTime;
    const effectiveDeltaTime = Math.min(deltaTime, 100);
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateStars(effectiveDeltaTime); // Update stars always

    if (gameState === 'playing') {
        updatePlayer(effectiveDeltaTime); updateBullets(effectiveDeltaTime);
        updateInvaders(effectiveDeltaTime); updateBombs(effectiveDeltaTime);
        handleCollisions();
    }

    drawStars(); // Draw background first

    if (gameState === 'playing') {
        drawPlayer(); drawInvaders(); drawBullets(); drawBombs(); drawUI();
    } else if (gameState === 'gameOver') {
        // *** 傳遞 timestamp 給 drawGameOver ***
        drawPlayer(); drawInvaders(); drawBullets(); drawBombs(); drawUI();
        drawGameOver(timestamp); // Pass timestamp for animation
    }

    requestAnimationFrame(gameLoop);
}

// --- Level Progression --- (內容不變)
function startNextLevel() { currentLevel++; console.log(`Starting Level ${currentLevel}`); bullets = []; bombs = []; invaderSpeedX = Math.min(baseInvaderSpeedX + 0.3 * (currentLevel - 1), 8); invaderFireRate = Math.min(baseInvaderFireRate + 0.00015 * (currentLevel - 1), 0.005); bombSpeed = Math.min(baseBombSpeed + 0.15 * (currentLevel - 1), 5); console.log(`Level ${currentLevel} Stats: InvSpeedX=${invaderSpeedX.toFixed(2)}, FireRate=${invaderFireRate.toFixed(5)}, BombSpeed=${bombSpeed.toFixed(2)}`); createInvaders(); invaderSpeedX = Math.abs(invaderSpeedX); timeSinceLastPeriodicDescent = 0; }

// --- Initialization and Event Listeners ---
function resetGame() {
    score = 0; lives = 3; currentLevel = 1; player = createPlayer(); bullets = []; bombs = []; keys = {}; touchLeft = false; touchRight = false;
    invaderSpeedX = baseInvaderSpeedX; invaderFireRate = baseInvaderFireRate; bombSpeed = baseBombSpeed; createInvaders(); createStars(); invaderSpeedX = Math.abs(invaderSpeedX); timeSinceLastPeriodicDescent = 0; gameState = 'playing'; gameOverSoundPlayed = false;
    lastTime = performance.now(); console.log("Game Reset to Level 1");
    startMusic();
    if(restartButton) restartButton.style.display = 'none'; // Hide button
    // *** 在重置時讀取一次最高分，雖然主要是在顯示時讀取 ***
    loadHighScores();
}

function fireBullet() { /* (內容不變) */ if (gameState === 'playing' && player && bullets.length < 5) { bullets.push({ x: player.x + player.width / 2 - bulletWidth / 2, y: player.y, width: bulletWidth, height: bulletHeight, speed: bulletSpeed, color: 'yellow' }); playSound(shootSound); } }

function init() {
    if (!canvas || !ctx) { console.error("Canvas init failed!"); document.body.innerHTML = "<h1>錯誤：Canvas 初始化失敗！</h1>"; return; }
    createStars();
    loadHighScores(); // *** 初始載入一次最高分 ***

    // --- Keyboard (內容不變) ---
    document.addEventListener('keydown', (e) => { if (!musicStarted && gameState === 'playing') { startMusic(); } keys[e.code] = true; if (gameState === 'playing' && e.code === 'Space') { e.preventDefault(); fireBullet(); } if (gameState === 'gameOver' && e.code === 'Enter') { resetGame(); } });
    document.addEventListener('keyup', (e) => { keys[e.code] = false; });

    // --- Touch (內容不變，使用 helpers) ---
    function handleTouchStart(e, action) { e.preventDefault(); if (!musicStarted) startMusic(); action(); }
    function handleTouchEnd(e, action) { e.preventDefault(); action(); }
    leftButton.addEventListener('touchstart', (e) => handleTouchStart(e, () => { touchLeft = true; })); leftButton.addEventListener('touchend', (e) => handleTouchEnd(e, () => { touchLeft = false; })); leftButton.addEventListener('touchmove', (e) => { e.preventDefault(); }); leftButton.addEventListener('mousedown', (e) => { if (!musicStarted) startMusic(); touchLeft = true; }); leftButton.addEventListener('mouseup', (e) => { touchLeft = false; }); leftButton.addEventListener('mouseleave', (e) => { touchLeft = false; });
    rightButton.addEventListener('touchstart', (e) => handleTouchStart(e, () => { touchRight = true; })); rightButton.addEventListener('touchend', (e) => handleTouchEnd(e, () => { touchRight = false; })); rightButton.addEventListener('touchmove', (e) => { e.preventDefault(); }); rightButton.addEventListener('mousedown', (e) => { if (!musicStarted) startMusic(); touchRight = true; }); rightButton.addEventListener('mouseup', (e) => { touchRight = false; }); rightButton.addEventListener('mouseleave', (e) => { touchRight = false; });
    fireButton.addEventListener('touchstart', (e) => handleTouchStart(e, fireBullet)); fireButton.addEventListener('mousedown', (e) => { if (!musicStarted) startMusic(); fireBullet(); });
    restartButton.addEventListener('touchstart', (e) => { e.preventDefault(); if (gameState === 'gameOver') { resetGame(); } }); restartButton.addEventListener('click', (e) => { if (gameState === 'gameOver') { resetGame(); } });

    resetGame();
    requestAnimationFrame(gameLoop);
}

// --- Start the Game ---
window.addEventListener('DOMContentLoaded', (event) => { init(); });
