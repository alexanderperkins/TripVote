import MoreMenu from '../../components/MoreMenu.jsx';
import VoteButton from './VoteButton.jsx';

// One activity on the itinerary timeline: time on the left rail, details, votes and a ⋯ menu.
export default function ActivityCard({
  activity,
  memberCount,
  isFavorite,
  isHighlighted,
  canManage,
  onEdit,
  onDelete,
  onToggleVote,
}) {
  return (
    <div className="grid grid-cols-[3.5rem_1fr] gap-3 sm:grid-cols-[4.5rem_1fr] sm:gap-4">
      <p className="pt-4 text-right text-sm font-bold text-ink tabular-nums">{activity.time}</p>
      <div className="relative pb-3 before:absolute before:top-0 before:bottom-0 before:-left-2 before:w-0.5 before:bg-border after:absolute after:top-5 after:-left-3 after:h-2.5 after:w-2.5 after:rounded-full after:border-2 after:border-primary after:bg-card">
        <article
          className={`flex flex-col gap-3 rounded-card border bg-card p-4 ${
            isFavorite ? 'border-warning' : 'border-border'
          } ${isHighlighted ? '[animation:highlight_1.8s_ease-out]' : ''}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-1">
              {isFavorite && (
                <span className="w-max rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-bold text-warning-text">
                  <span aria-hidden="true">★ </span>Group favorite
                </span>
              )}
              <h3 className="text-base font-bold text-ink sm:text-lg">{activity.title}</h3>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
                {activity.location && <span>{activity.location}</span>}
                {activity.addedBy?.name && <span>Suggested by {activity.addedBy.name}</span>}
              </div>
            </div>
            {canManage && (
              <MoreMenu
                label={`More actions for ${activity.title}`}
                items={[
                  { label: 'Edit', onSelect: onEdit },
                  { label: 'Delete', onSelect: onDelete, danger: true },
                ]}
              />
            )}
          </div>
          {activity.notes && <p className="text-sm text-muted">{activity.notes}</p>}
          <VoteButton
            activityTitle={activity.title}
            votes={activity.votes}
            memberCount={memberCount}
            onToggle={onToggleVote}
          />
        </article>
      </div>
    </div>
  );
}
