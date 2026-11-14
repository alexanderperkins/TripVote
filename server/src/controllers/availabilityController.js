import { getAvailability, setMyAvailability } from '../services/availabilityService.js';
import { notifyAvailabilityChanged } from '../realtime/tripEvents.js';

export async function listAvailability(req, res) {
  res.json(await getAvailability(req.params.tripId));
}

export async function saveMyAvailability(req, res) {
  const summary = await setMyAvailability(req.params.tripId, req.user.id, req.body.dates);
  notifyAvailabilityChanged(req, summary);
  res.json(summary);
}
