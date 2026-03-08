import { vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';

afterEach(cleanup);

// Polyfill Web Animations API for Svelte 5 transitions
if (!Element.prototype.animate) {
    Element.prototype.animate = function () {
        let _onfinish = null;
        return {
            finished: Promise.resolve(),
            cancel: () => {},
            get onfinish() { return _onfinish; },
            set onfinish(fn) {
                _onfinish = fn;
                if (fn) queueMicrotask(fn);
            },
        };
    };
}

// Polyfill matchMedia for flowbite-svelte components
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});
