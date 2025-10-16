(() => {
  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');

  const W = canvas.width, H = canvas.height;
  let running = false, paused = false;
  let score = 0, lives = 3, level = 1;

  const paddle = { w: 110, h: 14, x: (W-110)/2, y: H-28, speed: 7, dir: 0 };
  const ball = { r: 8, x: W/2, y: H-60, vx: 0, vy: 0, speed: 5, launched: false };

  const COLS = 10, ROWS = 6, BRICK_W = 70, BRICK_H = 22, BRICK_PAD = 6;
  const offsetX = (W - (COLS*BRICK_W + (COLS-1)*BRICK_PAD))/2;
  const offsetY = 80;
  let bricks = [];

  function makeBricks() {
    bricks = [];
    for (let r=0; r<ROWS; r++) {
      for (let c=0; c<COLS; c++) {
        bricks.push({
          x: offsetX + c*(BRICK_W + BRICK_PAD),
          y: offsetY + r*(BRICK_H + BRICK_PAD),
          w: BRICK_W, h: BRICK_H,
          hp: 1 + Math.floor(r/2)
        });
      }
    }
  }

  function resetBall() {
    ball.x = W/2; ball.y = H-60; ball.vx = 0; ball.vy = 0;
    ball.launched = false;
  }

  function launchBall() {
    if (!ball.launched) {
      const dir = (Math.random() * 0.6 + 0.2) * (Math.random()<0.5?-1:1);
      ball.vx = dir * ball.speed;
      ball.vy = -Math.sqrt(Math.max(1, ball.speed*ball.speed - ball.vx*ball.vx));
      ball.launched = true;
    }
  }

  function draw() {
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);

    // Stars background
    ctx.fillStyle = '#23314f';
    for (let i=0;i<60;i++){
      const x = (i*97 + Date.now()/20) % W;
      const y = (i*53 + (Date.now()/60 + i*7)) % H;
      ctx.fillRect(x, y, 2, 2);
    }

    // UI
    ctx.fillStyle = '#9cf'; ctx.font = '16px monospace';
    ctx.fillText(`Score ${score}`, 16, 24);
    ctx.fillText(`Lives ${lives}`, 140, 24);
    ctx.fillText(`Level ${level}`, 240, 24);

    // Bricks
    bricks.forEach(b => {
      if (b.hp<=0) return;
      ctx.fillStyle = b.hp===1 ? '#66e' : '#e66';
      ctx.fillRect(b.x, b.y, b.w, b.h);
    });

    // Paddle
    ctx.fillStyle = '#aef';
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

    // Ball
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
  }

  function step() {
    if (!running || paused) return;
    // Move paddle
    paddle.x += paddle.dir * paddle.speed;
    paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

    // Move ball (stick to paddle if not launched)
    if (!ball.launched) {
      ball.x = paddle.x + paddle.w/2;
      ball.y = paddle.y - ball.r - 2;
    } else {
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Walls
      if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx *= -1; }
      if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx *= -1; }
      if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy *= -1; }

      // Paddle collision
      if (ball.y + ball.r >= paddle.y &&
          ball.x >= paddle.x && ball.x <= paddle.x + paddle.w &&
          ball.vy > 0) {
        const hit = (ball.x - (paddle.x + paddle.w/2)) / (paddle.w/2);
        ball.vx = hit * ball.speed;
        ball.vy = -Math.sqrt(Math.max(1, ball.speed*ball.speed - ball.vx*ball.vx));
        ball.y = paddle.y - ball.r - 0.01;
      }

      // Bottom -> life lost
      if (ball.y - ball.r > H) {
        lives--;
        if (lives <= 0) {
          running = false;
          showMsg('Game Over — R to reset');
        } else {
          resetBall();
        }
      }

      // Bricks collisions (simple AABB)
      for (const b of bricks) {
        if (b.hp<=0) continue;
        if (ball.x+ball.r > b.x && ball.x-ball.r < b.x+b.w &&
            ball.y+ball.r > b.y && ball.y-ball.r < b.y+b.h) {
          // Determine side
          const overlapX = (ball.x < b.x) ? (ball.x+ball.r - b.x) : (b.x+b.w - (ball.x-ball.r));
          const overlapY = (ball.y < b.y) ? (ball.y+ball.r - b.y) : (b.y+b.h - (ball.y-ball.r));
          if (overlapX < overlapY) ball.vx *= -1; else ball.vy *= -1;
          b.hp--;
          score += 10;
          break;
        }
      }

      // Win?
      if (bricks.every(b=>b.hp<=0)) {
        level++; ball.speed += 0.5;
        makeBricks(); resetBall();
      }
    }

    draw();
    requestAnimationFrame(step);
  }

  function showMsg(t) {
    ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#fff'; ctx.font='24px monospace';
    ctx.fillText(t, W/2 - ctx.measureText(t).width/2, H/2);
  }

  function start() {
    if (running) return;
    running = true; paused = false;
    makeBricks(); resetBall(); draw();
    requestAnimationFrame(step);
  }
  function pauseToggle(){ if(!running) return; paused=!paused; if(!paused) requestAnimationFrame(step); }
  function reset(){ score=0; lives=3; level=1; ball.speed=5; start(); }

  // Buttons
  document.getElementById('btnStart').onclick = start;
  document.getElementById('btnPause').onclick = pauseToggle;
  document.getElementById('btnReset').onclick = reset;

  // Keyboard
  const keys = {};
  document.addEventListener('keydown', e => {
    keys[e.code]=true;
    if (e.code==='ArrowLeft')  paddle.dir = -1;
    if (e.code==='ArrowRight') paddle.dir = 1;
    if (e.code==='Space') launchBall();
    if (e.code==='KeyP') pauseToggle();
    if (e.code==='KeyR') reset();
  });
  document.addEventListener('keyup', e => {
    keys[e.code]=false;
    if (!keys['ArrowLeft'] && !keys['ArrowRight']) paddle.dir = 0;
    else if (keys['ArrowLeft']) paddle.dir = -1;
    else if (keys['ArrowRight']) paddle.dir = 1;
  });

  // Touch controls
  function touchDir(btn, dir){
    btn.addEventListener('touchstart', e=>{ paddle.dir = dir; e.preventDefault(); });
    btn.addEventListener('touchend',   e=>{ paddle.dir = 0; e.preventDefault(); });
  }
  touchDir(document.querySelector('.pad.left'), -1);
  touchDir(document.querySelector('.pad.right'), 1);
  document.getElementById('btnAction').addEventListener('touchstart', e=>{ launchBall(); e.preventDefault(); });

  // PWA install prompt
  let deferred; const btnInstall = document.getElementById('btnInstall');
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred=e; btnInstall.hidden=false; });
  btnInstall?.addEventListener('click', async ()=>{ if(!deferred) return; deferred.prompt(); await deferred.userChoice; deferred=null; btnInstall.hidden=true; });

  // Auto-start on first interaction to comply with some browsers
  canvas.addEventListener('click', ()=>{ if(!running) start(); else launchBall(); });
})();
