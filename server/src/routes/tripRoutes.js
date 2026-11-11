import { Router } from 'express';
import {
  createTrip,
  listTrips,
  getTrip,
  getTripByShareCode,
  updateTrip,
  deleteTrip,
} from '../controllers/tripController.js';
import {
  requestToJoin,
  approveJoinRequest,
  denyJoinRequest,
  removeMember,
} from '../controllers/memberController.js';
import { requireTripRole } from '../middleware/requireTripRole.js';
import { validateBody } from '../middleware/validate.js';
import { tripSchema } from '../validators/tripSchemas.js';

export function createTripRouter() {
  const router = Router();

  router.post('/', validateBody(tripSchema), createTrip);
  router.get('/', listTrips);
  router.get('/:tripId', requireTripRole(), getTrip);
  router.patch('/:tripId', requireTripRole('organizer'), validateBody(tripSchema), updateTrip);
  router.delete('/:tripId', requireTripRole('organizer'), deleteTrip);
  router.post(
    '/:tripId/join-requests/:userId/approve',
    requireTripRole('organizer'),
    approveJoinRequest,
  );
  router.delete('/:tripId/join-requests/:userId', requireTripRole('organizer'), denyJoinRequest);
  // Any Member may call this to leave; the service only lets the Organizer remove others.
  router.delete('/:tripId/members/:userId', requireTripRole(), removeMember);

  return router;
}

export function createJoinRouter() {
  const router = Router();

  router.get('/:shareCode', getTripByShareCode);
  router.post('/:shareCode/requests', requestToJoin);

  return router;
}
