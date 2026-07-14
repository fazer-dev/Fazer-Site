document.addEventListener("DOMContentLoaded", () => {
  const target = document.querySelector("#OnPage, .OnPage");
  if (!target) return;

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
  let devicePixelRatioValue = window.devicePixelRatio || 1;

  const state = {
    paddleWidth: 12,
    paddleHeight: 80,
    left: { x: 0, y: 0 },
    right: { x: 0, y: 0 },
    ball: { x: 0, y: 0, vx: 260, vy: 180, r: 8 },
    ballSpeed: 260,
    maxPaddleSpeed: 320,
    lastTime: performance.now(),
  };

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function resetState() {
    state.ball.x = width / 2;
    state.ball.y = height / 2;
    state.ball.vx = state.ballSpeed * (Math.random() < 0.5 ? 1 : -1);
    state.ball.vy = state.ballSpeed * (Math.random() * 0.8 - 0.4);
    state.left.y = height / 2 - state.paddleHeight / 2;
    state.right.y = height / 2 - state.paddleHeight / 2;
  }

  function resize() {
    const rect = target.getBoundingClientRect();
    const newWidth = Math.max(160, rect.width);
    const newHeight = Math.max(120, rect.height);
    const newDPR = window.devicePixelRatio || 1;

    // Save old values to avoid abrupt speed changes on resize
    const oldWidth = width;
    const oldHeight = height;
    const oldBallSpeed = state.ballSpeed;

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
    state.ballSpeed = Math.max(240, width * 0.45);
    state.left.x = 14;
    state.right.x = width - state.paddleWidth - 14;

    // If this is the first resize (initial setup), initialize state
    if (!oldWidth || !oldHeight) {
      resetState();
      return;
    }

    // Scale velocities to preserve speed proportionally when ballSpeed changed
    if (oldBallSpeed > 0) {
      const speedScale = state.ballSpeed / oldBallSpeed;
      state.ball.vx *= speedScale;
      state.ball.vy *= speedScale;
    }

    // Keep paddles' relative vertical position
    state.left.y = (state.left.y / Math.max(1, oldHeight)) * height;
    state.right.y = (state.right.y / Math.max(1, oldHeight)) * height;
    state.left.y = clamp(state.left.y, 0, height - state.paddleHeight);
    state.right.y = clamp(state.right.y, 0, height - state.paddleHeight);

    // If ball is out of bounds after resize, reset to center
    if (state.ball.x + state.ball.r < 0 || state.ball.x - state.ball.r > width || state.ball.y + state.ball.r < 0 || state.ball.y - state.ball.r > height) {
      resetState();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "rgb(87, 243, 90)";
    ctx.fillRect(state.left.x, state.left.y, state.paddleWidth, state.paddleHeight);
    ctx.fillRect(state.right.x, state.right.y, state.paddleWidth, state.paddleHeight);

    ctx.fillStyle = "#23ccdf";
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
    ctx.fill();
  }

  function update(dt) {
    state.ball.x += state.ball.vx * dt;
    state.ball.y += state.ball.vy * dt;

    if (state.ball.y - state.ball.r < 0) {
      state.ball.y = state.ball.r;
      state.ball.vy *= -1;
    }
    if (state.ball.y + state.ball.r > height) {
      state.ball.y = height - state.ball.r;
      state.ball.vy *= -1;
    }

    const leftPaddleCenter = state.left.y + state.paddleHeight / 2;
    const rightPaddleCenter = state.right.y + state.paddleHeight / 2;
    const ballTarget = state.ball.y;
    const leftDelta = ballTarget - leftPaddleCenter;
    const rightDelta = ballTarget - rightPaddleCenter;

    state.left.y += clamp(leftDelta, -state.maxPaddleSpeed * dt, state.maxPaddleSpeed * dt);
    state.right.y += clamp(rightDelta, -state.maxPaddleSpeed * dt, state.maxPaddleSpeed * dt);
    state.left.y = clamp(state.left.y, 0, height - state.paddleHeight);
    state.right.y = clamp(state.right.y, 0, height - state.paddleHeight);

    if (
      state.ball.x - state.ball.r < state.left.x + state.paddleWidth &&
      state.ball.x - state.ball.r > state.left.x &&
      state.ball.y > state.left.y &&
      state.ball.y < state.left.y + state.paddleHeight
    ) {
      state.ball.x = state.left.x + state.paddleWidth + state.ball.r;
      state.ball.vx = Math.abs(state.ball.vx);
      state.ball.vx *= 1.03;
      state.ball.vy += leftDelta * 0.02;
    }

    if (
      state.ball.x + state.ball.r > state.right.x &&
      state.ball.x + state.ball.r < state.right.x + state.paddleWidth &&
      state.ball.y > state.right.y &&
      state.ball.y < state.right.y + state.paddleHeight
    ) {
      state.ball.x = state.right.x - state.ball.r;
      state.ball.vx = -Math.abs(state.ball.vx);
      state.ball.vx *= 1.03;
      state.ball.vy += rightDelta * 0.02;
    }

    if (state.ball.x + state.ball.r < 0 || state.ball.x - state.ball.r > width) {
      resetState();
    }
  }

  function loop(now) {
    const dt = Math.min(0.032, (now - state.lastTime) / 1000);
    state.lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  resize();
  requestAnimationFrame(loop);

  new ResizeObserver(resize).observe(target);
  window.addEventListener("resize", resize);
});
