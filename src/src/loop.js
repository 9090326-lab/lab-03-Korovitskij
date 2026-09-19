export function createLoop({ update, render, onFpsUpdate }) {
  const FIXED_DT = 1 / 60;
  let lastTime = performance.now();
  let accumulator = 0;

  let frames = 0;
  let steps = 0;
  let lastFpsTime = performance.now();

  function tick(currentTime) {
    let frameDuration = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    if (frameDuration > 0.25) frameDuration = 0.25;
    accumulator += frameDuration;

    while (accumulator >= FIXED_DT) {
      update(FIXED_DT);
      accumulator -= FIXED_DT;
      steps++;
    }

    render();
    frames++;

    if (currentTime - lastFpsTime >= 1000) {
      if (typeof onFpsUpdate === 'function') {
        onFpsUpdate({
          stepsPerSec: steps,
          fps: frames,
          frameTime: frameDuration * 1000
        });
      }
      steps = 0;
      frames = 0;
      lastFpsTime = currentTime;
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}