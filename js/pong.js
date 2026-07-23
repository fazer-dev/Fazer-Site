document.addEventListener("DOMContentLoaded", () => {
  const target = document.querySelector("#OnPage, .OnPage");
  if (!target) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (getComputedStyle(target).position === "static") {
    target.style.position = "relative";
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.zIndex = "-1";
  canvas.style.pointerEvents = "none";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  target.prepend(canvas);

  let width = 0;
  let height = 0;
  let devicePixelRatioValue = Math.min(window.devicePixelRatio || 1, 2);
  let running = false;
  let rafId = null;
  const showScore = target.hasAttribute("data-pong-score");

  const state = {
    paddleWidth: 12,
    paddleHeight: 80,
    left: { x: 0, y: 0, vy: 0 },
    right: { x: 0, y: 0, vy: 0 },
    ball: { x: 0, y: 0, vx: 260, vy: 180, r: 8 },
    trail: [],
    particles: [],
    baseBallSpeed: 260,
    ballSpeedCap: 900,
    maxPaddleSpeed: 320,
    reactionLag: 0.12, // seconds of delay before a paddle "sees" the ball
    left_target: 0,
    right_target: 0,
    left_reactionTimer: 0,
    right_reactionTimer: 0,
    score: { left: 0, right: 0 },
    lastTime: performance.now(),
  };

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function resetState(scorer) {
    if (scorer === "left") state.score.left++;
    if (scorer === "right") state.score.right++;

    state.ball.x = width / 2;
    state.ball.y = height / 2;
    const dir = Math.random() < 0.5 ? 1 : -1;
    state.ball.vx = state.baseBallSpeed * dir;
    state.ball.vy = state.baseBallSpeed * (Math.random() * 0.8 - 0.4);
    state.trail.length = 0;
    state.left.y = height / 2 - state.paddleHeight / 2;
    state.right.y = height / 2 - state.paddleHeight / 2;
    state.left_target = state.left.y;
    state.right_target = state.right.y;
  }

  function spawnHitParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 140;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.4 + Math.random() * 0.3,
        color,
      });
    }
  }

  function resize() {
    const rect = target.getBoundingClientRect();
    const newWidth = Math.max(160, rect.width);
    const newHeight = Math.max(120, rect.height);
    const newDPR = Math.min(window.devicePixelRatio || 1, 2);

    const oldWidth = width;
    const oldHeight = height;
    const oldBallSpeed = state.baseBallSpeed;

    width = newWidth;
    height = newHeight;
    devicePixelRatioValue = newDPR;
    canvas.width = Math.round(width * devicePixelRatioValue);
    canvas.height = Math.round(height * devicePixelRatioValue);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(devicePixelRatioValue, 0, 0, devicePixelRatioValue, 0, 0);

    state.paddleHeight = Math.max(60, height * 0.18);
    state.paddleWidth = Math.max(10, width * 0.015);
    state.maxPaddleSpeed = Math.max(220, height * 2);
    state.ball.r = Math.max(6, Math.min(12, width * 0.01));
    state.baseBallSpeed = Math.max(240, width * 0.45);
    state.ballSpeedCap = state.baseBallSpeed * 3;
    state.left.x = 14;
    state.right.x = width - state.paddleWidth - 14;

    if (!oldWidth || !oldHeight) {
      resetState();
      renderStaticFrame();
      return;
    }

    if (oldBallSpeed > 0) {
      const speedScale = state.baseBallSpeed / oldBallSpeed;
      state.ball.vx *= speedScale;
      state.ball.vy *= speedScale;
    }

    state.left.y = (state.left.y / Math.max(1, oldHeight)) * height;
    state.right.y = (state.right.y / Math.max(1, oldHeight)) * height;
    state.left.y = clamp(state.left.y, 0, height - state.paddleHeight);
    state.right.y = clamp(state.right.y, 0, height - state.paddleHeight);

    if (
      state.ball.x + state.ball.r < 0 ||
      state.ball.x - state.ball.r > width ||
      state.ball.y + state.ball.r < 0 ||
      state.ball.y - state.ball.r > height
    ) {
      resetState();
    }

    if (prefersReducedMotion) renderStaticFrame();
  }

  function speedColor() {
    return "rgb(87, 243, 90)";
  }


  function drawScore() {
    if (!showScore) return;
    ctx.save();
    ctx.font = `${Math.max(14, height * 0.06)}px monospace`;
    ctx.fillStyle = "rgba(200, 255, 200, 0.35)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const y = Math.max(8, height * 0.03);
    ctx.fillText(String(state.score.left), width * 0.25, y);
    ctx.fillText(String(state.score.right), width * 0.75, y);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);



    ctx.save();
    ctx.shadowBlur = Math.max(6, width * 0.01);
    ctx.fillStyle = "rgb(87, 243, 90)";
    ctx.fillRect(state.left.x, state.left.y, state.paddleWidth, state.paddleHeight);
    ctx.fillRect(state.right.x, state.right.y, state.paddleWidth, state.paddleHeight);
    ctx.restore();

    const speedMag = Math.hypot(state.ball.vx, state.ball.vy);
    const speedRatio =
      (speedMag - state.baseBallSpeed) /
      Math.max(1, state.ballSpeedCap - state.baseBallSpeed);
    const ballColor = speedColor(speedRatio);

    for (let i = 0; i < state.trail.length; i++) {
      const t = state.trail[i];
      const alpha = ((i + 1) / state.trail.length) * 0.35;
      ctx.beginPath();
      ctx.fillStyle = ballColor.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
      ctx.arc(t.x, t.y, state.ball.r * (0.5 + 0.5 * (i / state.trail.length)), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.shadowColor = ballColor;
    ctx.shadowBlur = Math.max(8, width * 0.015);
    ctx.fillStyle = ballColor;
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();


    drawScore();
  }

  function renderStaticFrame() {
    draw();
  }

  function updatePaddleAI(paddle, targetRef, reactionTimerKey, dt) {
    state[reactionTimerKey] -= dt;
    if (state[reactionTimerKey] <= 0) {
      const error = (Math.random() - 0.5) * state.paddleHeight * 0.5;
      state[targetRef] = state.ball.y + error - state.paddleHeight / 2;
      state[reactionTimerKey] = state.reactionLag * (0.6 + Math.random() * 0.8);
    }
    const desired = clamp(state[targetRef], 0, height - state.paddleHeight);
    const delta = desired - paddle.y;
    paddle.y += clamp(delta, -state.maxPaddleSpeed * dt, state.maxPaddleSpeed * dt);
    paddle.y = clamp(paddle.y, 0, height - state.paddleHeight);
  }

  function update(dt) {
    state.ball.x += state.ball.vx * dt;
    state.ball.y += state.ball.vy * dt;

    state.trail.push({ x: state.ball.x, y: state.ball.y });
    if (state.trail.length > 10) state.trail.shift();

    if (state.ball.y - state.ball.r < 0) {
      state.ball.y = state.ball.r;
      state.ball.vy *= -1;
    }
    if (state.ball.y + state.ball.r > height) {
      state.ball.y = height - state.ball.r;
      state.ball.vy *= -1;
    }

    updatePaddleAI(state.left, "left_target", "left_reactionTimer", dt);
    updatePaddleAI(state.right, "right_target", "right_reactionTimer", dt);

    if (
      state.ball.x - state.ball.r < state.left.x + state.paddleWidth &&
      state.ball.x - state.ball.r > state.left.x &&
      state.ball.y > state.left.y &&
      state.ball.y < state.left.y + state.paddleHeight
    ) {
      state.ball.x = state.left.x + state.paddleWidth + state.ball.r;
      state.ball.vx = Math.abs(state.ball.vx);
      const speed = Math.hypot(state.ball.vx, state.ball.vy);
      const angle = Math.atan2(state.ball.vy, state.ball.vx);
      state.ball.vx = Math.cos(angle) * speed;
      state.ball.vy = Math.sin(angle) * speed;
      spawnHitParticles(state.ball.x, state.ball.y, "rgb(87, 243, 90)");
    }

    if (
      state.ball.x + state.ball.r > state.right.x &&
      state.ball.x + state.ball.r < state.right.x + state.paddleWidth &&
      state.ball.y > state.right.y &&
      state.ball.y < state.right.y + state.paddleHeight
    ) {
      state.ball.x = state.right.x - state.ball.r;
      state.ball.vx = -Math.abs(state.ball.vx);
      const speed = Math.hypot(state.ball.vx, state.ball.vy);
      const angle = Math.atan2(state.ball.vy, state.ball.vx);
      state.ball.vx = Math.cos(angle) * speed;
      state.ball.vy = Math.sin(angle) * speed;
      spawnHitParticles(state.ball.x, state.ball.y, "rgb(87, 243, 90)");
    }

    if (state.ball.x + state.ball.r < 0) {
      resetState("right");
    } else if (state.ball.x - state.ball.r > width) {
      resetState("left");
    }

    // particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.032, (now - state.lastTime) / 1000);
    state.lastTime = now;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (running || prefersReducedMotion) return;
    running = true;
    state.lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  resize();

  if (!prefersReducedMotion) {
    start();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry) return;
      if (entry.isIntersecting && !document.hidden) start();
      else stop();
    },
    { threshold: 0 }
  );
  intersectionObserver.observe(target);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(target);
  window.addEventListener("resize", resize);

  const mutationObserver = new MutationObserver(() => {
    if (!document.body.contains(target)) {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      mutationObserver.disconnect();
      canvas.remove();
    }
  });
  mutationObserver.observe(document.body, { childList: true, subtree: true });
});