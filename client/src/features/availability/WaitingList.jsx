import { Avatar } from '../../components/Avatar.jsx';

// Members who have not marked any days yet, so the group knows who to nudge.
export default function WaitingList({ people, viewerId }) {
  return (
    <section
      aria-label="Waiting on"
      className="flex flex-col gap-3 rounded-card border border-border bg-card p-5"
    >
      <h2 className="text-lg font-bold">
        Waiting on
        {people.length > 0 && <span className="text-muted"> ({people.length})</span>}
      </h2>
      {people.length === 0 ? (
        <p className="font-semibold text-success">Everyone has responded.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {people.map((member) => (
            <li key={member.userId} className="flex items-center gap-3 font-semibold">
              <Avatar userId={member.userId} name={member.name} />
              <span>
                {member.name}
                {member.userId === viewerId && <span className="text-muted"> (you)</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
