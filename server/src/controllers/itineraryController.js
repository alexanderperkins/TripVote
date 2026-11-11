import {
  createActivity as createActivityRecord,
  listActivities as listActivityRecords,
  updateActivity as updateActivityRecord,
  deleteActivity as deleteActivityRecord,
} from '../services/itineraryService.js';

export async function createActivity(req, res) {
  const activity = await createActivityRecord(req.params.tripId, req.user, req.body);
  res.status(201).json(activity);
}

export async function listActivities(req, res) {
  const activities = await listActivityRecords(req.params.tripId);
  res.json(activities);
}

export async function updateActivity(req, res) {
  const activity = await updateActivityRecord(
    req.params.tripId,
    req.params.activityId,
    req.user,
    req.membership.role,
    req.body,
  );
  res.json(activity);
}

export async function deleteActivity(req, res) {
  await deleteActivityRecord(
    req.params.tripId,
    req.params.activityId,
    req.user,
    req.membership.role,
  );
  res.status(204).end();
}
