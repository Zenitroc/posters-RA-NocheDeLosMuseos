import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());

// jsdom no implementa la reproducción de medios: se simula lo mínimo.
if (typeof HTMLMediaElement !== 'undefined') {
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    writable: true,
    value: () => Promise.resolve(),
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, writable: true, value: () => {} });
  Object.defineProperty(HTMLMediaElement.prototype, 'load', { configurable: true, writable: true, value: () => {} });
}
