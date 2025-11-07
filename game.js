const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Players
let player = { x: 100, y: 500, width: 30, height: 50, speed: 5, hasBall: true };
let opponent = { x: 700, y: 500, width: 30, height: 50, speed: 4, hasBall: false };

// Ball
let ball = { x: player.x + player.width/2, y: player.y, dx: 0, dy: 0 };

// Keys
let keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// Draw court and hoops
function drawCourt() {
    ctx.fillStyle = "#228B22";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "red";
    ctx.fillRect(50, 260, 10, 80); // left hoop
    ctx.fillRect(740, 260, 10, 80); // right hoop
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

    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

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

// Ball physics via Python
async function updateBallPhysics() {
    if(!player.hasBall){
        const response = await fetch("/update_ball", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ball })
        });
        const data = await response.json();
        ball.x = data.x;
        ball.y = data.y;
        ball.dx = data.dx;
        ball.dy = data.dy;

        // Reset if ball touches floor
        if(ball.y >= canvas.height) {
            player.hasBall = true;
            ball.x = player.x + player.width/2;
            ball.y = player.y;
            ball.dx = 0;
            ball.dy = 0;
        }
    }
}

// Simple AI: opponent moves toward ball
function moveOpponent() {
    if(ball.x > opponent.x) opponent.x += opponent.speed;
    if(ball.x < opponent.x) opponent.x -= opponent.speed;
    opponent.x = Math.max(0, Math.min(canvas.width - opponent.width, opponent.x));
}

// Game loop
async function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCourt();
    drawPlayers();
    drawBall();

    movePlayer();
    shootBall();
    await updateBallPhysics();
    moveOpponent();

    requestAnimationFrame(draw);
}

draw();
