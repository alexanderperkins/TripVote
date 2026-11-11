import {
  requestToJoin as createJoinRequest,
  approveJoinRequest as approveJoinRequestRecord,
  denyJoinRequest as denyJoinRequestRecord,
  removeMember as removeMemberRecord,
} from '../services/membershipService.js';

export async function requestToJoin(req, res) {
  const result = await createJoinRequest(req.params.shareCode, req.user.id);
  res.status(201).json(result);
}

export async function approveJoinRequest(req, res) {
  const member = await approveJoinRequestRecord(req.params.tripId, req.params.userId);
  res.json(member);
}

export async function denyJoinRequest(req, res) {
  await denyJoinRequestRecord(req.params.tripId, req.params.userId);
  res.status(204).end();
}

export async function removeMember(req, res) {
  await removeMemberRecord(req.params.tripId, req.params.userId, req.membership);
  res.status(204).end();
}
