import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// No test opens a real WebSocket; see fakeSocket.js.
vi.mock('socket.io-client', () => import('./fakeSocket.js'));

afterEach(cleanup);
