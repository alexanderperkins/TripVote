import { Avatar } from '../../components/Avatar.jsx';
import Button from '../../components/Button.jsx';

export default function JoinRequestList({ requests, isBusy, onApprove, onDeny }) {
  return (
    <section aria-labelledby="join-requests-heading" className="flex flex-col gap-3">
      <h2 id="join-requests-heading" className="text-lg font-bold">
        Join requests
      </h2>
      {requests.length > 0 ? (
        <ul className="divide-y divide-border rounded-card border border-border bg-card px-4">
          {requests.map((request) => (
            <li
              key={request.userId}
              className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-3"
            >
              <span className="flex items-center gap-3">
                <Avatar userId={request.userId} name={request.name} />
                <span className="font-semibold">{request.name}</span>
              </span>
              <span className="flex gap-2">
                <Button
                  disabled={isBusy}
                  aria-label={`Approve ${request.name}`}
                  onClick={() => onApprove(request)}
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  disabled={isBusy}
                  aria-label={`Deny ${request.name}`}
                  onClick={() => onDeny(request)}
                >
                  Deny
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          No pending requests. People who ask to join from your share link will appear here.
        </p>
      )}
    </section>
  );
}
