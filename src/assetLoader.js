export async function loadAll(manifestPath, audioCtx, onProgress) {
  const response = await fetch(manifestPath);
  if (!response.ok) {
    throw new Error(`Не вдалося завантажити ${manifestPath}: ${response.statusText}`);
  }

  const manifest = await response.json();
  const imagesToLoad = manifest.images || {};
  const audioToLoad = manifest.audio || {};

  const total = Object.keys(imagesToLoad).length + Object.keys(audioToLoad).length;
  let loaded = 0;

  const updateProgress = () => {
    loaded++;
    if (typeof onProgress === 'function') {
      onProgress(total > 0 ? loaded / total : 1);
    }
  };

  const assets = {
    images: {},
    audio: {}
  };

  // Якщо маніфест порожній
  if (total === 0) {
    if (typeof onProgress === 'function') onProgress(1);
    return assets;
  }

  // Завантаження картинок
  const imagePromises = Object.entries(imagesToLoad).map(([key, src]) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        assets.images[key] = img;
        updateProgress();
        resolve();
      };
      img.onerror = () => reject(new Error(`Не вдалося знайти зображення: ${src}`));
      img.src = src;
    });
  });

  // Завантаження звуків (якщо вони є)
  const audioPromises = Object.entries(audioToLoad).map(async ([key, src]) => {
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`Помилка мережі ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      if (audioCtx) {
        assets.audio[key] = await audioCtx.decodeAudioData(arrayBuffer);
      }
      updateProgress();
    } catch (err) {
      console.warn(`Пропущено звук ${src}:`, err);
      updateProgress();
    }
  });

  await Promise.all([...imagePromises, ...audioPromises]);
  return assets;
}