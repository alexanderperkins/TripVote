import {
  createTrip as createTripRecord,
  listTrips as listTripRecords,
  getTrip as getTripRecord,
  updateTrip as updateTripRecord,
  deleteTrip as deleteTripRecord,
} from '../services/tripService.js';

export async function createTrip(req, res) {
  const trip = await createTripRecord(req.user.id, req.body);
  res.status(201).json(trip);
}

export async function listTrips(req, res) {
  const trips = await listTripRecords(req.user.id);
  res.json(trips);
}

export async function getTrip(req, res) {
  const trip = await getTripRecord(req.params.tripId, req.membership.role);
  res.json(trip);
}

export async function updateTrip(req, res) {
  const trip = await updateTripRecord(req.params.tripId, req.body);
  res.json({ ...trip, role: req.membership.role });
}

export async function deleteTrip(req, res) {
  await deleteTripRecord(req.params.tripId);
  res.status(204).end();
}
