import { Router } from 'express';
import {
  createActivity,
  listActivities,
  updateActivity,
  deleteActivity,
} from '../controllers/itineraryController.js';
import { requireTripRole } from '../middleware/requireTripRole.js';
import { validateBody } from '../middleware/validate.js';
import { activitySchema, updateActivitySchema } from '../validators/itinerarySchemas.js';

export function createItineraryRouter() {
  const router = Router({ mergeParams: true });

  router.use(requireTripRole());

  router.post('/', validateBody(activitySchema), createActivity);
  router.get('/', listActivities);
  router.patch('/:activityId', validateBody(updateActivitySchema), updateActivity);
  router.delete('/:activityId', deleteActivity);

  return router;
}
