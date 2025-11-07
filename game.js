const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Physics constants
const GRAVITY = 0.5;
const FLOOR_Y = canvas.height - 10;
const BOUNCE = -0.6;

// Player and opponent
let player = { x: 100, y: FLOOR_Y - 50, width: 30, height: 50, speed: 5, hasBall: true };
let opponent = { x: 700, y: FLOOR_Y - 50, width: 30, height: 50, speed: 4, hasBall: false };

// Ball
let ball = { x: player.x + player.width/2, y: player.y, dx: 0, dy: 0 };

// Key input
let keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// Draw court and hoops
function drawCourt() {
    ctx.fillStyle = "#228B22";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "red";
    ctx.fillRect(50, 260, 10, 80);  // Left hoop
    ctx.fillRect(740, 260, 10, 80); // Right hoop
}

// Draw players
function drawPlayers() {
    ctx.fillStyle = "blue";
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.fillStyle = "orange";
    ctx.fillRect(opponent.x, opponent.y, opponent.width, opponent.height);
}

// Draw ball
function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 10, 0, Math.PI*2);
    ctx.fillStyle = "yellow";
    ctx.fill();
    ctx.closePath();
}

// Move player
function movePlayer() {
    if(keys['ArrowUp']) player.y -= player.speed;
    if(keys['ArrowDown']) player.y += player.speed;
    if(keys['ArrowLeft']) player.x -= player.speed;
    if(keys['ArrowRight']) player.x += player.speed;

    // Stay in bounds
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(FLOOR_Y - player.height, player.y));

    // Move ball with player if holding it
    if(player.hasBall){
        ball.x = player.x + player.width/2;
        ball.y = player.y;
    }
}

// Shoot ball
function shootBall() {
    if(player.hasBall && keys[' ']) {
        player.hasBall = false;
        ball.dx = 8;
        ball.dy = -10;
    }
}

// Ball physics
function updateBall() {
    if(!player.hasBall){
        ball.dy += GRAVITY;
        ball.x += ball.dx;
        ball.y += ball.dy;

        // Floor collision
        if(ball.y > FLOOR_Y) {
            ball.y = FLOOR_Y;
            ball.dy *= BOUNCE;
        }

        // Wall collisions
        if(ball.x < 0) {
            ball.x = 0;
            ball.dx *= BOUNCE;
        }
        if(ball.x > canvas.width) {
            ball.x = canvas.width;
            ball.dx *= BOUNCE;
        }

        // Reset ball if it stops moving
        if(Math.abs(ball.dy) < 1 && ball.y >= FLOOR_Y - 1) {
            player.hasBall = true;
            ball.x = player.x + player.width/2;
            ball.y = player.y;
            ball.dx = 0;
            ball.dy = 0;
        }
    }
}

// Opponent AI
function moveOpponent() {
    if(ball.x > opponent.x) opponent.x += opponent.speed;
    if(ball.x < opponent.x) opponent.x -= opponent.speed;
    opponent.x = Math.max(0, Math.min(canvas.width - opponent.width, opponent.x));
}

// Game loop
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCourt();
    drawPlayers();
    drawBall();
    movePlayer();
    shootBall();
    updateBall();
    moveOpponent();
    requestAnimationFrame(gameLoop);
}

gameLoop();
