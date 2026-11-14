import { Router } from 'express';
import { listAvailability, saveMyAvailability } from '../controllers/availabilityController.js';
import { requireTripRole } from '../middleware/requireTripRole.js';
import { validateBody } from '../middleware/validate.js';
import { availabilitySchema } from '../validators/availabilitySchemas.js';

// Members only: requireTripRole() turns away Viewers and pending join requests.
export function createAvailabilityRouter() {
  const router = Router({ mergeParams: true });

  router.use(requireTripRole());

  router.get('/', listAvailability);
  router.put('/me', validateBody(availabilitySchema), saveMyAvailability);

  return router;
}
