import {
  createActivity as createActivityRecord,
  listActivities as listActivityRecords,
  updateActivity as updateActivityRecord,
  deleteActivity as deleteActivityRecord,
  voteForActivity,
  removeVoteForActivity,
} from '../services/itineraryService.js';
import {
  notifyActivityCreated,
  notifyActivityDeleted,
  notifyActivityUpdated,
  notifyVotesChanged,
} from '../realtime/tripEvents.js';

export async function createActivity(req, res) {
  const activity = await createActivityRecord(req.params.tripId, req.user, req.body);
  notifyActivityCreated(req, activity);
  res.status(201).json(activity);
}

export async function listActivities(req, res) {
  const activities = await listActivityRecords(req.params.tripId, req.user.id);
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
  notifyActivityUpdated(req, activity);
  res.json(activity);
}

export async function deleteActivity(req, res) {
  await deleteActivityRecord(
    req.params.tripId,
    req.params.activityId,
    req.user,
    req.membership.role,
  );
  notifyActivityDeleted(req, req.params.activityId);
  res.status(204).end();
}

export async function addVote(req, res) {
  const activity = await voteForActivity(req.params.tripId, req.params.activityId, req.user);
  notifyVotesChanged(req, activity);
  res.status(201).json(activity);
}

export async function removeVote(req, res) {
  const activity = await removeVoteForActivity(req.params.tripId, req.params.activityId, req.user);
  notifyVotesChanged(req, activity);
  res.json(activity);
}
