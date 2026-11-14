import { Server } from 'socket.io';
import { SESSION_COOKIE } from '../middleware/requireAuth.js';
import { findUserById } from '../services/authService.js';
import { isActiveMember } from '../services/membershipService.js';
import { verifyToken } from '../services/tokenService.js';
import { logger } from '../config/logger.js';

const tripRoom = (tripId) => `trip:${tripId}`;

function readCookie(header = '', name) {
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

// Same session check as requireAuth, but for the WebSocket handshake.
function authenticate(jwtSecret) {
  return async (socket, next) => {
    try {
      const token = readCookie(socket.handshake.headers.cookie, SESSION_COOKIE);
      const userId = verifyToken(token, { secret: jwtSecret });
      const user = userId && (await findUserById(userId));
      if (!user) return next(new Error('UNAUTHENTICATED'));
      socket.data.userId = user.id;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

async function handleJoin(socket, tripId, ack) {
  const reply = typeof ack === 'function' ? ack : () => {};
  try {
    if (!(await isActiveMember(tripId, socket.data.userId))) {
      reply({ ok: false, error: 'FORBIDDEN' });
      return;
    }
    await socket.join(tripRoom(tripId));
    reply({ ok: true });
  } catch (error) {
    logger.error(`Live updates: could not join trip ${tripId}: ${error.message}`);
    reply({ ok: false, error: 'SERVER_ERROR' });
  }
}

// Adds Socket.IO to the HTTP server and gives the app a way to push trip events
// (app.locals.realtime). Members join a trip's room only after a membership check.
export function attachRealtime(httpServer, app) {
  const { clientOrigin, jwtSecret } = app.locals.config;
  const io = new Server(httpServer, { cors: { origin: clientOrigin, credentials: true } });

  io.use(authenticate(jwtSecret));
  io.on('connection', (socket) => {
    socket.on('trip:join', (tripId, ack) => handleJoin(socket, tripId, ack));
  });

  app.locals.realtime = {
    emitToTrip(tripId, event, payload) {
      io.to(tripRoom(tripId)).emit(event, payload);
    },
    async removeUserFromTrip(tripId, userId) {
      const sockets = await io.in(tripRoom(tripId)).fetchSockets();
      sockets
        .filter((socket) => socket.data.userId === userId)
        .forEach((socket) => socket.leave(tripRoom(tripId)));
    },
  };

  return {
    io,
    close: () =>
      new Promise((resolve) => {
        delete app.locals.realtime;
        io.close(() => resolve());
      }),
  };
}
