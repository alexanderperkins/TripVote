import { Router } from 'express';
import {
  createTrip,
  listTrips,
  getTrip,
  updateTrip,
  deleteTrip,
} from '../controllers/tripController.js';
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

  return router;
}
