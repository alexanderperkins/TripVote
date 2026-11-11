import Button from '../../components/Button.jsx';

export default function MemberList({ members, canRemove, isBusy, onRemove }) {
  return (
    <section aria-labelledby="members-heading" className="mt-8">
      <h2 id="members-heading" className="text-xl font-bold">
        Members
      </h2>
      {members.length > 0 ? (
        <ul className="mt-4 divide-y divide-border rounded-card border border-border bg-card px-4">
          {members.map((member) => (
            <li
              key={member.userId}
              className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-3"
            >
              <span>{member.name}</span>
              <span className="flex items-center gap-3">
                <span className="text-sm capitalize text-muted">{member.role}</span>
                {canRemove && member.role !== 'organizer' && (
                  <Button
                    variant="danger"
                    disabled={isBusy}
                    aria-label={`Remove ${member.name}`}
                    onClick={() => onRemove(member)}
                  >
                    Remove
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-muted">No members yet.</p>
      )}
    </section>
  );
}
