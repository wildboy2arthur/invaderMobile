// --- Canvas Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');
const fireButton = document.getElementById('fireButton');
const restartButton = document.getElementById('restartButton');

// Basic check for essential elements
if (!canvas || !ctx || !leftButton || !rightButton || !fireButton || !restartButton) {
    console.error("Initialization failed: Could not find all required HTML elements.");
    document.body.innerHTML = "<h1>初始化錯誤：缺少必要的遊戲元件！</h1>";
    // Optionally throw an error to halt execution completely if preferred
    // throw new Error("Missing critical game elements.");
}

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
const HIGH_SCORE_KEY = 'invaderHighScores_Arthur';
const MAX_HIGH_SCORES = 5;
let highScores = [];

// --- Player Settings ---
const playerWidth = 50; const playerHeight = 30; const playerSpeed = 6;
// --- Bullet Settings ---
const bulletWidth = 5; const bulletHeight = 15; const bulletSpeed = 8;
// --- Invader Settings ---
const invaderWidth = 30; const invaderHeight = 20; const invaderSpacing = 15; const invaderRows = 5; const invaderCols = 10; let baseInvaderSpeedX = 2; let invaderSpeedX = baseInvaderSpeedX; const invaderDropDistance = 15; let baseInvaderFireRate = 0.001; let invaderFireRate = baseInvaderFireRate; const periodicDescentInterval = 15000; let timeSinceLastPeriodicDescent = 0;
// --- Bomb Settings ---
const bombWidth = 5; const bombHeight = 10; let baseBombSpeed = 2.5; let bombSpeed = baseBombSpeed;
// --- Starfield Settings ---
const numStars = 150; const starSpeed = 0.5;

// --- Sound Effects & Music Setup ---
let shootSound, explosionSound, gameOverSound, backgroundMusic;
try {
    shootSound = new Audio('sounds/shoot.wav');
    explosionSound = new Audio('sounds/explosion.wav');
    gameOverSound = new Audio('sounds/game_over.wav');
    backgroundMusic = new Audio('sounds/background_music.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.3;
} catch (e) { console.error("Error creating Audio objects:", e); }

function playSound(sound) { if (sound && typeof sound.play === 'function') { sound.currentTime = 0; sound.play().catch(error => { console.warn("Sound playback failed:", error); }); } else { console.warn("Attempted to play an invalid sound object."); } }
let gameOverSoundPlayed = false; let musicStarted = false;
function startMusic() { if (!musicStarted && backgroundMusic && typeof backgroundMusic.play === 'function') { backgroundMusic.play().then(() => { musicStarted = true; console.log("BG music started."); }).catch(error => { console.warn("BG music autoplay failed.", error); }); } else if (musicStarted && backgroundMusic && backgroundMusic.paused) { backgroundMusic.play().catch(error => { console.warn("Restarting music failed:", error); }); } }

// --- Image Assets ---
let invaderImage, playerImage;
let invaderImageLoaded = false, playerImageLoaded = false;
try {
    invaderImage = new Image(); invaderImage.src = 'images/enemy.svg';
    invaderImage.onload = () => { invaderImageLoaded = true; console.log("Invader image loaded."); }; invaderImage.onerror = () => { console.error("Failed to load invader image!"); };
    playerImage = new Image(); playerImage.src = 'images/player.svg';
    playerImage.onload = () => { playerImageLoaded = true; console.log("Player image loaded."); }; playerImage.onerror = () => { console.error("Failed to load player image!"); };
} catch (e) { console.error("Error creating Image objects:", e); }

// --- High Score Functions ---
function loadHighScores() { try { const scoresJSON = localStorage.getItem(HIGH_SCORE_KEY); highScores = scoresJSON ? JSON.parse(scoresJSON) : []; if (!Array.isArray(highScores)) highScores = []; highScores = highScores.map(Number).filter(Number.isFinite).sort((a, b) => b - a); highScores = highScores.slice(0, MAX_HIGH_SCORES); } catch (e) { console.error("Failed to load/parse high scores:", e); highScores = []; } }
function saveHighScore(newScore) { if (typeof newScore !== 'number' || !Number.isFinite(newScore) || newScore < 0) return; loadHighScores(); highScores.push(newScore); highScores.sort((a, b) => b - a); highScores = highScores.slice(0, MAX_HIGH_SCORES); try { localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(highScores)); console.log("High scores saved:", highScores); } catch (e) { console.error("Failed to save high scores:", e); } }

// --- Game Object Creation ---
function createPlayer() { return { x: canvas.width / 2 - playerWidth / 2, y: canvas.height - playerHeight - 20, width: playerWidth, height: playerHeight, speed: playerSpeed }; }
function createInvaders() { invaders = []; const sX = 50, sY = 50; for (let r = 0; r < invaderRows; r++) { for (let c = 0; c < invaderCols; c++) { invaders.push({ x: sX + c * (invaderWidth + invaderSpacing), y: sY + r * (invaderHeight + invaderSpacing), width: invaderWidth, height: invaderHeight, alive: true }); } } }
function createStars() { stars = []; for (let i = 0; i < numStars; i++) { stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 2 + 0.5 }); } }

// --- Drawing Functions ---
function drawRect(x, y, w, h, color) { try { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); } catch(e){ console.error("drawRect error:", e); }}
function drawPlayer() { try { if (!player) return; if (playerImageLoaded && playerImage && playerImage.complete) { ctx.drawImage(playerImage, player.x, player.y, player.width, player.height); } else { drawRect(player.x, player.y, player.width, player.height, 'blue'); } } catch(e){ console.error("drawPlayer error:", e); }}
function drawInvaders() { try { invaders.forEach(inv => { if (inv.alive) { if (invaderImageLoaded && invaderImage && invaderImage.complete) { ctx.drawImage(invaderImage, inv.x, inv.y, inv.width, invaderHeight); } else { drawRect(inv.x, inv.y, inv.width, invaderHeight, 'red'); } } }); } catch(e){ console.error("drawInvaders error:", e); }}
function drawBullets() { try { bullets.forEach(b => drawRect(b.x, b.y, b.width, b.height, b.color || 'yellow')); } catch(e){ console.error("drawBullets error:", e); }}
function drawBombs() { try { bombs.forEach(b => drawRect(b.x, b.y, b.width, b.height, b.color || 'red')); } catch(e){ console.error("drawBombs error:", e); }}
function drawStars() { try { ctx.fillStyle = 'white'; stars.forEach(star => { ctx.beginPath(); ctx.arc(star.x, star.y, star.size / 2, 0, Math.PI * 2); ctx.fill(); }); } catch(e){ console.error("drawStars error:", e); }}
function drawUI() { try { ctx.fillStyle = 'white'; ctx.font = '20px Arial'; ctx.fillText(`分數: ${score}`, 10, 30); ctx.fillText(`關卡: ${currentLevel}`, canvas.width / 2 - 50, 30); ctx.fillText(`生命: ${lives}`, canvas.width - 100, 30); } catch(e){ console.error("drawUI error:", e); }}
function drawGameOver(timestamp) { try { ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = 'red'; ctx.font = '60px Arial'; ctx.textAlign = 'center'; ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 100); ctx.fillStyle = 'white'; ctx.font = '30px Arial'; ctx.fillText(`最終分數: ${score}`, canvas.width / 2, canvas.height / 2 - 40); ctx.font = '24px Arial'; ctx.fillStyle = '#FFD700'; ctx.fillText('最高分紀錄:', canvas.width / 2, canvas.height / 2 + 10); loadHighScores(); if (highScores && highScores.length > 0) { highScores.forEach((hs, index) => { if (typeof hs === 'number') { ctx.fillText(`${index + 1}. ${hs}`, canvas.width / 2, canvas.height / 2 + 10 + (index + 1) * 30); } }); } else { ctx.font = '18px Arial'; ctx.fillStyle = '#aaa'; ctx.fillText('尚無紀錄', canvas.width / 2, canvas.height / 2 + 40); } const animationTime = (typeof timestamp === 'number' && timestamp > 0) ? timestamp : performance.now(); const pulseSpeed = 1500; const minSize = 18; const maxSize = 22; const pulseFactor = (Math.sin(animationTime / pulseSpeed * Math.PI * 2) + 1) / 2; const currentSize = minSize + (maxSize - minSize) * pulseFactor; const currentAlpha = 0.7 + pulseFactor * 0.3; if (Number.isFinite(currentSize) && Number.isFinite(currentAlpha)) { ctx.font = `italic bold ${currentSize.toFixed(1)}px Arial, sans-serif`; ctx.fillStyle = `rgba(0, 255, 255, ${currentAlpha.toFixed(2)})`; ctx.textAlign = 'center'; ctx.fillText('by Arthur Chen', canvas.width / 2, canvas.height - 30); } else { console.warn("Invalid animation values", {currentSize, currentAlpha}); ctx.font = `italic bold 20px Arial, sans-serif`; ctx.fillStyle = `rgba(0, 255, 255, 0.85)`; ctx.textAlign = 'center'; ctx.fillText('by Arthur Chen', canvas.width / 2, canvas.height - 30); } ctx.textAlign = 'left'; if (restartButton) restartButton.style.display = 'block'; } catch (e) { console.error("Error in drawGameOver:", e); try { ctx.fillStyle = 'red'; ctx.font = '20px Arial'; ctx.textAlign = 'center'; ctx.fillText('繪圖錯誤，請檢查主控台', canvas.width / 2, canvas.height / 2); if (restartButton) restartButton.style.display = 'block'; } catch (finalError) { console.error("Failed even to draw error message:", finalError); } } }


// --- Update Logic ---
function updatePlayer(deltaTime) { try { if (!player) return; if ((keys['ArrowLeft'] || touchLeft) && player.x > 0) { player.x -= player.speed; } if ((keys['ArrowRight'] || touchRight) && player.x < canvas.width - player.width) { player.x += player.speed; } } catch(e) {console.error("updatePlayer Error:", e);} }
function updateBullets(deltaTime) { try { for (let i = bullets.length - 1; i >= 0; i--) { if(!bullets[i]) continue; bullets[i].y -= bulletSpeed; if (bullets[i].y < 0) bullets.splice(i, 1); } } catch(e) {console.error("updateBullets Error:", e);} } // Added check for bullet existence
function updateInvaders(deltaTime) { try { let anyAlive = invaders.some(inv => inv.alive); if (!anyAlive && gameState === 'playing') { startNextLevel(); return; } let moveDown = false, hitEdge = false; timeSinceLastPeriodicDescent += (deltaTime || 0); if (timeSinceLastPeriodicDescent >= periodicDescentInterval) { moveDown = true; timeSinceLastPeriodicDescent = 0; } let minX = canvas.width, maxX = 0; invaders.forEach(inv => { if (inv.alive) { inv.x += invaderSpeedX; minX = Math.min(minX, inv.x); maxX = Math.max(maxX, inv.x + inv.width); } }); if (minX <= 0 || maxX >= canvas.width) hitEdge = true; if (hitEdge) { invaderSpeedX *= -1; moveDown = true; invaders.forEach(inv => { if (inv.alive) inv.x += invaderSpeedX * 1.5; }); } if (moveDown) { invaders.forEach(inv => { if (inv.alive) { inv.y += invaderDropDistance; if (player && inv.y + inv.height >= player.y) { if (gameState === 'playing') { saveHighScore(score); lives = 0; gameState = 'gameOver'; if (!gameOverSoundPlayed) { playSound(gameOverSound); gameOverSoundPlayed = true; } } } } }); } invaders.forEach(inv => { if (inv.alive && Math.random() < invaderFireRate) { bombs.push({ x: inv.x + inv.width / 2 - bombWidth / 2, y: inv.y + inv.height, width: bombWidth, height: bombHeight, speed: bombSpeed, color: 'red' }); } }); } catch(e) {console.error("updateInvaders Error:", e);} }
function updateBombs(deltaTime) { try { for (let i = bombs.length - 1; i >= 0; i--) { if(!bombs[i]) continue; bombs[i].y += bombSpeed; if (bombs[i].y > canvas.height) bombs.splice(i, 1); } } catch(e) {console.error("updateBombs Error:", e);} } // Added check for bomb existence
function updateStars(deltaTime) { try { stars.forEach(star => { star.y += starSpeed; if (star.y > canvas.height + star.size) { star.y = 0 - star.size; star.x = Math.random() * canvas.width; } }); } catch(e) {console.error("updateStars Error:", e);} }

// --- Collision Detection ---
function checkCollision(rect1, rect2) { if (!rect1 || !rect2) return false; return rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y; }
function handleCollisions() { try { if (!player || gameState !== 'playing') return; for (let i = bullets.length - 1; i >= 0; i--) { if (!bullets[i]) continue; for (let j = invaders.length - 1; j >= 0; j--) { if (invaders[j] && invaders[j].alive && checkCollision(bullets[i], invaders[j])) { invaders[j].alive = false; playSound(explosionSound); bullets.splice(i, 1); score += 10; break; } } } for (let i = bombs.length - 1; i >= 0; i--) { if (!bombs[i]) continue; if (checkCollision(bombs[i], player)) { bombs.splice(i, 1); lives--; playSound(explosionSound); if (lives <= 0) { saveHighScore(score); lives = 0; gameState = 'gameOver'; if (!gameOverSoundPlayed) { playSound(gameOverSound); gameOverSoundPlayed = true; } } } } invaders.forEach(inv => { if (inv && inv.alive && checkCollision(inv, player)) { saveHighScore(score); lives = 0; gameState = 'gameOver'; playSound(explosionSound); if (!gameOverSoundPlayed) { playSound(gameOverSound); gameOverSoundPlayed = true; } } }); } catch(e) {console.error("handleCollisions Error:", e);} } // Added checks for object existence


// --- Game Loop ---
let lastTime = 0;
function gameLoop(timestamp) {
    try {
        if (!ctx) { console.error("Canvas context missing in game loop!"); return; }
        // Ensure timestamp is valid for calculations
        let currentTime = (typeof timestamp === 'number' && timestamp > 0) ? timestamp : performance.now();
        if (lastTime === 0) lastTime = currentTime; // Initialize lastTime on first frame
        const deltaTime = currentTime - lastTime;
        const effectiveDeltaTime = Math.min(deltaTime > 0 ? deltaTime : 0, 100);
        lastTime = currentTime;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updateStars(effectiveDeltaTime);

        if (gameState === 'playing') {
            updatePlayer(effectiveDeltaTime); updateBullets(effectiveDeltaTime);
            updateInvaders(effectiveDeltaTime); updateBombs(effectiveDeltaTime);
            handleCollisions();
        }

        drawStars();

        if (gameState === 'playing') {
            drawPlayer(); drawInvaders(); drawBullets(); drawBombs(); drawUI();
        } else if (gameState === 'gameOver') {
            drawPlayer(); drawInvaders(); drawBullets(); drawBombs(); drawUI();
            drawGameOver(currentTime); // Pass the valid current time
        }

        requestAnimationFrame(gameLoop);

    } catch (e) {
        console.error("Error in gameLoop:", e);
        alert("遊戲發生嚴重錯誤，請檢查主控台並重新整理頁面。");
        // Consider stopping the loop here if needed:
        // return;
    }
}


// --- Level Progression ---
function startNextLevel() { try { currentLevel++; console.log(`Starting Level ${currentLevel}`); bullets = []; bombs = []; invaderSpeedX = Math.min(baseInvaderSpeedX + 0.3 * (currentLevel - 1), 8); invaderFireRate = Math.min(baseInvaderFireRate + 0.00015 * (currentLevel - 1), 0.005); bombSpeed = Math.min(baseBombSpeed + 0.15 * (currentLevel - 1), 5); console.log(`Level ${currentLevel} Stats: InvSpeedX=${invaderSpeedX.toFixed(2)}, FireRate=${invaderFireRate.toFixed(5)}, BombSpeed=${bombSpeed.toFixed(2)}`); createInvaders(); invaderSpeedX = Math.abs(invaderSpeedX); timeSinceLastPeriodicDescent = 0; } catch(e){console.error("startNextLevel Error:", e);} }

// --- Initialization and Event Listeners ---
function resetGame() {
    try {
        score = 0; lives = 3; currentLevel = 1;
        player = createPlayer(); bullets = []; bombs = []; keys = {}; touchLeft = false; touchRight = false;
        invaderSpeedX = baseInvaderSpeedX; invaderFireRate = baseInvaderFireRate; bombSpeed = baseBombSpeed;
        createInvaders(); createStars(); invaderSpeedX = Math.abs(invaderSpeedX);
        timeSinceLastPeriodicDescent = 0; gameState = 'playing'; gameOverSoundPlayed = false;
        lastTime = performance.now(); console.log("Game Reset to Level 1");
        startMusic();
        if(restartButton) restartButton.style.display = 'none';
        loadHighScores();
    } catch (e) { console.error("Error during resetGame:", e); }
}

function fireBullet() { try { if (gameState === 'playing' && player && bullets.length < 5) { bullets.push({ x: player.x + player.width / 2 - bulletWidth / 2, y: player.y, width: bulletWidth, height: bulletHeight, speed: bulletSpeed, color: 'yellow' }); playSound(shootSound); } } catch(e){console.error("fireBullet Error:", e);} }

function init() {
    // Wrap major parts of init in try-catch
    try {
        if (!canvas || !ctx) { throw new Error("Canvas or Context not available in init!"); }
        createStars();
        loadHighScores();

        // Keyboard Listeners
        document.addEventListener('keydown', (e) => { try { if (!musicStarted && gameState === 'playing') { startMusic(); } keys[e.code] = true; if (gameState === 'playing' && e.code === 'Space') { e.preventDefault(); fireBullet(); } if (gameState === 'gameOver' && e.code === 'Enter') { resetGame(); } } catch(er){console.error("keydown listener error", er);} });
        document.addEventListener('keyup', (e) => { try{ keys[e.code] = false; } catch(er){console.error("keyup listener error", er);} });

        // Touch Listeners
        function handleTouchStart(e, action) { e.preventDefault(); if (!musicStarted) startMusic(); action(); }
        function handleTouchEnd(e, action) { e.preventDefault(); action(); }

        // Check if buttons exist before adding listeners
        if(leftButton) {
            leftButton.addEventListener('touchstart', (e) => handleTouchStart(e, () => { touchLeft = true; }));
            leftButton.addEventListener('touchend', (e) => handleTouchEnd(e, () => { touchLeft = false; }));
            leftButton.addEventListener('touchmove', (e) => { e.preventDefault(); });
            leftButton.addEventListener('mousedown', (e) => { if (!musicStarted) startMusic(); touchLeft = true; });
            leftButton.addEventListener('mouseup', (e) => { touchLeft = false; });
            leftButton.addEventListener('mouseleave', (e) => { touchLeft = false; });
        } else { console.warn("Left button not found"); }

         if(rightButton) {
            rightButton.addEventListener('touchstart', (e) => handleTouchStart(e, () => { touchRight = true; }));
            rightButton.addEventListener('touchend', (e) => handleTouchEnd(e, () => { touchRight = false; }));
            rightButton.addEventListener('touchmove', (e) => { e.preventDefault(); });
            rightButton.addEventListener('mousedown', (e) => { if (!musicStarted) startMusic(); touchRight = true; });
            rightButton.addEventListener('mouseup', (e) => { touchRight = false; });
            rightButton.addEventListener('mouseleave', (e) => { touchRight = false; });
         } else { console.warn("Right button not found"); }

        if(fireButton) {
            fireButton.addEventListener('touchstart', (e) => handleTouchStart(e, fireBullet));
            fireButton.addEventListener('mousedown', (e) => { if (!musicStarted) startMusic(); fireBullet(); });
        } else { console.warn("Fire button not found"); }

        if(restartButton) {
            restartButton.addEventListener('touchstart', (e) => { e.preventDefault(); if (gameState === 'gameOver') { resetGame(); } });
            restartButton.addEventListener('click', (e) => { if (gameState === 'gameOver') { resetGame(); } });
        } else { console.warn("Restart button not found"); }


        resetGame(); // Initialize game state
        requestAnimationFrame(gameLoop); // Start the loop

    } catch (e) { // Catch errors during the init process
        console.error("Critical Error during Initialization:", e);
        document.body.innerHTML = "<h1>遊戲初始化失敗，無法啟動！請檢查主控台。</h1>";
    }
} // <<<=== 這里是 init() 的結尾括號

// --- Start the Game ---
// Ensure the DOM is loaded before running init
window.addEventListener('DOMContentLoaded', (event) => {
    init(); // Call init function
}); // <<<=== 這里是 DOMContentLoaded 監聽器的結尾括號和分號
