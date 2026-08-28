/**
 * Hold-to-Tick Quantity Accelerator
 * Immediately triggers 1 step on press.
 * If held for >= 1000ms (1 second), rapidly ticks every 65ms until release.
 */

export interface HoldToTickOptions {
  onStep: () => void;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
  initialDelayMs?: number; // default 1000ms
  intervalMs?: number; // default 65ms
}

export function attachHoldToTick(
  element: HTMLElement,
  options: HoldToTickOptions
): () => void {
  const initialDelay = options.initialDelayMs ?? 1000;
  const intervalSpeed = options.intervalMs ?? 65;

  let delayTimer: number | null = null;
  let repeatInterval: number | null = null;
  let isHolding = false;

  const start = (e: Event) => {
    // Only respond to primary mouse button or touch
    if (e instanceof MouseEvent && e.button !== 0) return;
    e.preventDefault();

    // 1. Fire single immediate click/step
    options.onStep();
    element.classList.add('active-pressing');

    // 2. Start 1-second delay before rapid tick
    delayTimer = window.setTimeout(() => {
      isHolding = true;
      element.classList.add('ticking-rapidly');
      options.onHoldStart?.();

      repeatInterval = window.setInterval(() => {
        options.onStep();
      }, intervalSpeed);
    }, initialDelay);
  };

  const stop = () => {
    if (delayTimer !== null) {
      clearTimeout(delayTimer);
      delayTimer = null;
    }
    if (repeatInterval !== null) {
      clearInterval(repeatInterval);
      repeatInterval = null;
    }
    element.classList.remove('active-pressing');
    element.classList.remove('ticking-rapidly');

    if (isHolding) {
      isHolding = false;
      options.onHoldEnd?.();
    }
  };

  element.addEventListener('pointerdown', start);
  element.addEventListener('pointerup', stop);
  element.addEventListener('pointerleave', stop);
  element.addEventListener('pointercancel', stop);
  element.addEventListener('contextmenu', (e) => e.preventDefault());

  return () => {
    stop();
    element.removeEventListener('pointerdown', start);
    element.removeEventListener('pointerup', stop);
    element.removeEventListener('pointerleave', stop);
    element.removeEventListener('pointercancel', stop);
  };
}
