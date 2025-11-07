// BasketballGame 3D - simple full-court game using Three.js
// Controls: WASD / Arrow keys to move; Mouse drag to aim & release to shoot; Space to reset ball

// Scene essentials
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b2b2b);

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 80, 220);

// Optional orbit control for debugging: comment out if not needed
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enabled = false; // set true to debug the scene

// Lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
hemi.position.set(0, 200, 0);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(-50, 200, 100);
dir.castShadow = true;
dir.shadow.camera.top = 200;
dir.shadow.camera.bottom = -200;
dir.shadow.camera.left = -200;
dir.shadow.camera.right = 200;
scene.add(dir);

// Court
const courtW = 200;
const courtH = 120;
const courtGeo = new THREE.PlaneGeometry(courtW, courtH);
const courtMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });
const court = new THREE.Mesh(courtGeo, courtMat);
court.rotation.x = -Math.PI / 2;
court.receiveShadow = true;
scene.add(court);

// Court lines (simple)
const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
const centerLineGeom = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(0, 0.05, -courtH/2), new THREE.Vector3(0, 0.05, courtH/2) ]);
const centerLine = new THREE.Line(centerLineGeom, lineMat);
scene.add(centerLine);

// Hoops (left & right)
function makeHoop(x) {
  const hoopGroup = new THREE.Group();

  // backboard
  const backGeo = new THREE.BoxGeometry(16, 10, 2);
  const backMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.6 });
  const back = new THREE.Mesh(backGeo, backMat);
  back.position.set(x, 30, -courtH/2 + 8); // near end
  back.castShadow = true;
  hoopGroup.add(back);

  // rim as torus
  const rimGeo = new THREE.TorusGeometry(6, 0.6, 8, 24);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xff4500, metalness: 0.7, roughness: 0.2 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(x, 26, -courtH/2 + 4);
  rim.castShadow = true;
  hoopGroup.add(rim);

  // net sensor (invisible thin ring) for scoring detection
  const net = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, 1.4, 16), new THREE.MeshBasicMaterial({ visible: false }));
  net.position.set(x, 26, -courtH/2 + 4);
  hoopGroup.add(net);
  hoopGroup.userData = { rim, net, x };

  scene.add(hoopGroup);
  return hoopGroup;
}
const leftHoop = makeHoop(-courtW/2 + 20);
const rightHoop = makeHoop(courtW/2 - 20);

// Player and opponent
function makePlayer(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(8, 18, 8), new THREE.MeshStandardMaterial({ color }));
  body.position.y = 9; // half height
  body.castShadow = true;
  g.add(body);
  return g;
}
const player = makePlayer(0x2b7aff);
player.position.set(-40, 0, 0);
scene.add(player);

const opponent = makePlayer(0xff8c00);
opponent.position.set(40, 0, 0);
scene.add(opponent);

// Ball
const ballGeo = new THREE.SphereGeometry(3.8, 24, 24);
const ballMat = new THREE.MeshStandardMaterial({ color: 0xffd27f, metalness: 0.2, roughness: 0.6 });
const ballMesh = new THREE.Mesh(ballGeo, ballMat);
ballMesh.castShadow = true;
scene.add(ballMesh);

// Ball physics state
const ballState = {
  pos: new THREE.Vector3(player.position.x, 9 + 3.8, player.position.z - 6),
  vel: new THREE.Vector3(0, 0, 0),
  radius: 3.8,
  heldBy: 'player' // 'player' | 'opponent' | null
};
ballMesh.position.copy(ballState.pos);

// Scores
let scorePlayer = 0;
let scoreOpponent = 0;
const scoreEl = document.getElementById('score');

// Movement state
const keys = {};
document.addEventListener('keydown', e => { keys[e.key] = true; });
document.addEventListener('keyup', e => { keys[e.key] = false; });

// Resize handler
window.addEventListener('resize', onWindowResize);
function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
onWindowResize();

// Simple camera follow
function updateCamera() {
  const lookAt = new THREE.Vector3().copy(player.position);
  camera.position.lerp(new THREE.Vector3(player.position.x, 80, player.position.z + 220), 0.06);
  camera.lookAt(lookAt.x, 20, lookAt.z);
}

// Player movement
const playerSpeed = 1.8;
function updatePlayer(dt) {
  let moved = false;
  if (keys['w'] || keys['ArrowUp']) { player.position.z -= playerSpeed; moved = true; }
  if (keys['s'] || keys['ArrowDown']) { player.position.z += playerSpeed; moved = true; }
  if (keys['a'] || keys['ArrowLeft']) { player.position.x -= playerSpeed; moved = true; }
  if (keys['d'] || keys['ArrowRight']) { player.position.x += playerSpeed; moved = true; }

  // Boundaries within court
  const limitX = courtW / 2 - 12;
  const limitZ = courtH / 2 - 12;
  player.position.x = THREE.MathUtils.clamp(player.position.x, -limitX, limitX);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -limitZ, limitZ);

  // Keep the body rotation facing movement direction
  // (optional: rotate based on velocity)
  if (moved) {
    // nothing fancy now
  }

  // If holding ball, move ball with player
  if (ballState.heldBy === 'player') {
    ballState.pos.set(player.position.x, player.position.y + 12, player.position.z - 8);
    ballState.vel.set(0, 0, 0);
  }
  // Opponent simple behavior handled elsewhere
}

// Opponent AI (very basic: chase ball when free, else move toward player)
function updateOpponent(dt) {
  const dx = ballState.pos.x - opponent.position.x;
  const dz = ballState.pos.z - opponent.position.z;
  const dist = Math.sqrt(dx*dx + dz*dz);

  // If ball is free and not near player, chase it
  if (ballState.heldBy === null && dist > 6) {
    // move toward ball
    opponent.position.x += Math.sign(dx) * 0.9;
    opponent.position.z += Math.sign(dz) * 0.9;
  } else {
    // guard player
    const guardDx = player.position.x - opponent.position.x;
    const guardDz = player.position.z - opponent.position.z;
    opponent.position.x += Math.sign(guardDx) * 0.4;
    opponent.position.z += Math.sign(guardDz) * 0.4;
  }

  // Boundaries
  const limitX = courtW / 2 - 12;
  const limitZ = courtH / 2 - 12;
  opponent.position.x = THREE.MathUtils.clamp(opponent.position.x, -limitX, limitX);
  opponent.position.z = THREE.MathUtils.clamp(opponent.position.z, -limitZ, limitZ);

  // If close enough and ball free, pick up
  if (ballState.heldBy === null && opponent.position.distanceTo(ballState.pos) < 8) {
    ballState.heldBy = 'opponent';
  }

  // If opponent holding, set ball position to follow
  if (ballState.heldBy === 'opponent') {
    ballState.pos.set(opponent.position.x, opponent.position.y + 12, opponent.position.z - 8);
    ballState.vel.set(0, 0, 0);
  }
}

// Mouse drag to aim & shoot
let dragging = false;
let dragStart = null;
let dragEnd = null;
let aimLineMesh = null;

function addAimLine() {
  if (aimLineMesh) scene.remove(aimLineMesh);
  const mat = new THREE.LineBasicMaterial({ color: 0xffff00 });
  const geom = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(), new THREE.Vector3() ]);
  aimLineMesh = new THREE.Line(geom, mat);
  scene.add(aimLineMesh);
}
addAimLine();

canvas.addEventListener('pointerdown', (e) => {
  // only start drag when player holds the ball
  if (ballState.heldBy !== 'player') return;
  dragging = true;
  dragStart = getPointerGroundPoint(e);
});

canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  dragEnd = getPointerGroundPoint(e);
  if (!dragEnd || !dragStart) return;

  // update aimLine positions from ball pos to dragEnd
  const p1 = new THREE.Vector3(ballState.pos.x, ballState.pos.y, ballState.pos.z);
  const p2 = new THREE.Vector3(dragEnd.x, ballState.pos.y, dragEnd.z);
  const positions = aimLineMesh.geometry.attributes.position.array;
  positions[0] = p1.x; positions[1] = p1.y; positions[2] = p1.z;
  positions[3] = p2.x; positions[4] = p2.y; positions[5] = p2.z;
  aimLineMesh.geometry.attributes.position.needsUpdate = true;
});

canvas.addEventListener('pointerup', (e) => {
  if (!dragging) return;
  dragging = false;
  scene.remove(aimLineMesh);
  aimLineMesh = null;
  // compute direction and power
  if (!dragStart) return;
  const release = getPointerGroundPoint(e);
  if (!release) return;
  const dx = dragStart.x - release.x;
  const dz = dragStart.z - release.z;
  const strength = Math.min(40, Math.sqrt(dx*dx + dz*dz)) / 1.2; // clamp
  // convert to velocity: push forward (toward release direction)
  const dir = new THREE.Vector3(release.x - dragStart.x, 0.7, release.z - dragStart.z).normalize();
  const speed = strength * 0.8;
  ballState.vel.copy(dir.multiplyScalar(speed));
  ballState.vel.y = Math.max(6, strength * 0.5);
  ballState.heldBy = null;
  dragStart = null;
  dragEnd = null;
  addAimLine();
});

// utility: convert pointer to ground plane point
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
function getPointerGroundPoint(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const y = - ((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
  const intersectPoint = new THREE.Vector3();
  const didHit = raycaster.ray.intersectPlane(groundPlane, intersectPoint);
  if (!didHit) return null;
  return intersectPoint;
}

// Physics constants
const gravity = -0.45; // negative y
const groundY = 0; // court plane y
const bounce = 0.6;

// Ball physics update per frame
function physicsUpdate(dt) {
  if (ballState.heldBy) return; // if held, no physics applied

  // integrate velocity -> position
  ballState.vel.y += gravity * dt;
  ballState.pos.addScaledVector(ballState.vel, dt);

  // floor collision
  if (ballState.pos.y - ballState.radius < groundY + 0.1) {
    ballState.pos.y = groundY + ballState.radius + 0.1;
    // bounce
    ballState.vel.y = -ballState.vel.y * bounce;
    // apply friction to horizontal velocity
    ballState.vel.x *= 0.92;
    ballState.vel.z *= 0.92;

    // if very small vertical speed and very low horizontal speed, stop
    if (Math.abs(ballState.vel.y) < 1.0 && ballState.pos.y <= groundY + ballState.radius + 0.15) {
      ballState.vel.set(0, 0, 0);
      // allow pickup by nearest player after a short timeout
      setTimeout(() => {
        // decide who gets the ball: nearest player
        const distP = player.position.distanceTo(ballState.pos);
        const distO = opponent.position.distanceTo(ballState.pos);
        if (distP < distO) ballState.heldBy = 'player';
        else ballState.heldBy = 'opponent';
      }, 300);
    }
  }

  // rim collisions (simple): bounce off if close to rim plane
  // We'll implement a cheap detection: if ball intersects torus bounding sphere, reflect horizontal component
  // check left & right rims
  [leftHoop, rightHoop].forEach(hg => {
    const rimPos = hg.userData.rim ? hg.userData.rim.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3();
    // distance in xz-plane
    const dx = ballState.pos.x - rimPos.x;
    const dz = ballState.pos.z - rimPos.z;
    const distXZ = Math.sqrt(dx*dx + dz*dz);
    const rimRadius = 6.0;
    const rimHeight = rimPos.y;
    // if near rim height and near rim radius, bounce sideways
    const heightDiff = Math.abs(ballState.pos.y - rimHeight);
    if (heightDiff < 6 && distXZ < rimRadius + ballState.radius && distXZ > rimRadius - 2) {
      // simple bounce: reflect horizontal velocity outward
      const normal = new THREE.Vector3(dx, 0, dz).normalize();
      const horiz = new THREE.Vector3(ballState.vel.x, 0, ballState.vel.z);
      const reflected = horiz.reflect(normal).multiplyScalar(0.8);
      ballState.vel.x = reflected.x;
      ballState.vel.z = reflected.z;
      // give small upward push
      ballState.vel.y = Math.max(ballState.vel.y, 2.5);
    }
  });

  // update mesh
  ballMesh.position.copy(ballState.pos);
}

// Scoring detection: check if ball passes downward through net cylinder area
function checkScoring() {
  [ {hoop: leftHoop, side: 'left'}, {hoop: rightHoop, side: 'right'} ].forEach(obj => {
    const hoop = obj.hoop;
    // net location
    const netWorld = hoop.userData.net.getWorldPosition(new THREE.Vector3());
    const netRadius = 5.6;
    const netTop = netWorld.y + 0.7;
    const netBottom = netWorld.y - 0.7;

    // if the ball center is inside the net cylinder horizontally and moved downward across the net plane, count.
    const dx = ballState.pos.x - netWorld.x;
    const dz = ballState.pos.z - netWorld.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    // detect crossing through top plane (rough)
    if (dist < netRadius && ballState.pos.y < netTop && ballState.lastY > netTop) {
      // Who scored? if ball came from player's side toward opponent hoop -> player scored
      // We can check ball position Z relative to court center (z < 0 towards left side in our coord system)
      const isLeftHoop = (hoop === leftHoop);
      // Determine origin of shot: compare last holder or position
      // We'll approximate: if ball was shot from x < 0 -> player; else opponent
      if (ballState.pos.x < 0 && !isLeftHoop) {
        // scored on opponent hoop (right) while on left half = player scored
        scorePlayer++;
      } else if (ballState.pos.x > 0 && isLeftHoop) {
        // scored on left hoop while on right half = opponent scored
        scoreOpponent++;
      } else {
        // fallback: if ballState.pos.x < 0 then player else opponent
        if (ballState.pos.x < 0) scorePlayer++; else scoreOpponent++;
      }
      updateScoreUI();
      // small celebration: freeze ball and give possession to the opponent of scorer
      ballState.vel.set(0,0,0);
      ballState.heldBy = (scorePlayer > scoreOpponent) ? 'opponent' : 'player';
      if (ballState.heldBy === 'player') {
        ballState.pos.set(player.position.x, player.position.y + 12, player.position.z - 8);
      } else {
        ballState.pos.set(opponent.position.x, opponent.position.y + 12, opponent.position.z - 8);
      }
    }
  });
}

// Update UI score
function updateScoreUI() {
  scoreEl.innerText = `Player: ${scorePlayer}  \u00A0\u00A0 Opponent: ${scoreOpponent}`;
}

// Simple reset
const resetBtn = document.getElementById('resetBtn');
resetBtn.addEventListener('click', resetGame);
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    // allow manual pickup if ball stopped
    if (ballState.heldBy === null && ballState.vel.length() === 0) {
      ballState.heldBy = 'player';
      ballState.pos.set(player.position.x, player.position.y + 12, player.position.z - 8);
    } else {
      // reset ball to player
      ballState.vel.set(0,0,0);
      ballState.heldBy = 'player';
      ballState.pos.set(player.position.x, player.position.y + 12, player.position.z - 8);
    }
  }
});

function resetGame() {
  scorePlayer = 0;
  scoreOpponent = 0;
  updateScoreUI();
  ballState.heldBy = 'player';
  ballState.vel.set(0,0,0);
  ballState.pos.set(player.position.x, player.position.y + 12, player.position.z - 8);
  ballMesh.position.copy(ballState.pos);
}

// Animation loop
let lastTime = performance.now();
function animate(t) {
  const dt = Math.min(60, t - lastTime) / 16.666; // normalized roughly to 60fps steps
  lastTime = t;

  // dt ~ 1 for 60fps, dt ~ 2 for 30fps
  updatePlayer(dt);
  updateOpponent(dt);
  physicsUpdate(dt);
  checkScoring();
  ballMesh.position.copy(ballState.pos);

  updateCamera();

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
resetGame();
requestAnimationFrame(animate);
