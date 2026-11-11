import Button from '../../components/Button.jsx';

export default function JoinRequestList({ requests, isBusy, onApprove, onDeny }) {
  return (
    <section aria-labelledby="join-requests-heading" className="mt-8">
      <h2 id="join-requests-heading" className="text-xl font-bold">
        Join requests
      </h2>
      {requests.length > 0 ? (
        <ul className="mt-4 divide-y divide-border rounded-card border border-border bg-card px-4">
          {requests.map((request) => (
            <li
              key={request.userId}
              className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-3"
            >
              <span>{request.name}</span>
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
        <p className="mt-3 text-muted">
          No pending requests. People who ask to join from your share link will appear here.
        </p>
      )}
    </section>
  );
}
