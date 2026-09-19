export function createInput() {
  const keys = new Map();

  window.addEventListener('keydown', (e) => keys.set(e.code, true));
  window.addEventListener('keyup', (e) => keys.set(e.code, false));

  return {
    isPressed(code) {
      return keys.get(code) === true;
    }
  };
}