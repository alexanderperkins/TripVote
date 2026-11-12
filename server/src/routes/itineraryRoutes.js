import { Router } from 'express';
import {
  createActivity,
  listActivities,
  updateActivity,
  deleteActivity,
  addVote,
  removeVote,
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
  router.post('/:activityId/votes', addVote);
  router.delete('/:activityId/votes', removeVote);

  return router;
}
