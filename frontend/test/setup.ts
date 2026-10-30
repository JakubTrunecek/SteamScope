import { clearLibraryCache } from '../src/libraryCache';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => { cleanup(); clearLibraryCache(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
Element.prototype.scrollIntoView = vi.fn();
