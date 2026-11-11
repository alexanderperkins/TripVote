import { useState } from 'react';
import { approveJoinRequest, denyJoinRequest, removeMember } from '../../api/members.js';
import JoinRequestList from './JoinRequestList.jsx';
import MemberList from './MemberList.jsx';

// Members list, plus join requests and Remove for the Organizer.
// Errors are reported to the page through onError so they appear with the other trip errors.
export default function TripPeople({ trip, onTripChange, onError }) {
  const [isBusy, setIsBusy] = useState(false);
  const isOrganizer = trip.role === 'organizer';

  async function run(action) {
    onError('');
    setIsBusy(true);
    try {
      await action();
    } catch (error) {
      onError(error);
    } finally {
      setIsBusy(false);
    }
  }

  function handleApprove(request) {
    return run(async () => {
      const member = await approveJoinRequest(trip.id, request.userId);
      onTripChange((current) => ({
        ...current,
        members: [...current.members, member],
        joinRequests: current.joinRequests.filter((item) => item.userId !== request.userId),
      }));
    });
  }

  function handleDeny(request) {
    return run(async () => {
      await denyJoinRequest(trip.id, request.userId);
      onTripChange((current) => ({
        ...current,
        joinRequests: current.joinRequests.filter((item) => item.userId !== request.userId),
      }));
    });
  }

  function handleRemove(member) {
    if (!window.confirm(`Remove ${member.name} from this trip?`)) return undefined;
    return run(async () => {
      await removeMember(trip.id, member.userId);
      onTripChange((current) => ({
        ...current,
        members: current.members.filter((item) => item.userId !== member.userId),
      }));
    });
  }

  return (
    <>
      <MemberList
        members={trip.members}
        canRemove={isOrganizer}
        isBusy={isBusy}
        onRemove={handleRemove}
      />
      {isOrganizer && (
        <JoinRequestList
          requests={trip.joinRequests ?? []}
          isBusy={isBusy}
          onApprove={handleApprove}
          onDeny={handleDeny}
        />
      )}
    </>
  );
}
