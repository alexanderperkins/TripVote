import { vi } from 'vitest';

// A stand-in for a socket.io-client socket, so tests can play the server's side.
let current = null;

function createFakeSocket() {
  const handlers = new Map();
  const socket = {
    connected: false,
    emitted: [],
    joinReply: { ok: true },
    on(event, handler) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(handler);
      return socket;
    },
    off(event, handler) {
      handlers.get(event)?.delete(handler);
      return socket;
    },
    emit(event, ...args) {
      socket.emitted.push([event, ...args]);
      const ack = args.at(-1);
      if (typeof ack === 'function') ack(socket.joinReply);
      return socket;
    },
    disconnect: vi.fn(() => {
      socket.connected = false;
    }),
    serverEmit(event, payload) {
      [...(handlers.get(event) ?? [])].forEach((handler) => handler(payload));
    },
  };
  return socket;
}

export const io = vi.fn(() => {
  current = createFakeSocket();
  return current;
});

export function lastSocket() {
  return current;
}

export function connectSocket() {
  current.connected = true;
  current.serverEmit('connect');
}

export function dropSocket() {
  current.connected = false;
  current.serverEmit('disconnect', 'transport close');
}
