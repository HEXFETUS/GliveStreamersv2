const cache: Record<string, HTMLAudioElement> = {};

export function playSound(path: string) {
  if (!cache[path]) {
    cache[path] = new Audio(path);
  }

  const audio = cache[path];
  audio.pause();
  audio.currentTime = 0;
  audio.play().catch(console.error);
}