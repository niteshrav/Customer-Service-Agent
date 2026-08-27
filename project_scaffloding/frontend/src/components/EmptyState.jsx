export default function EmptyState({ title, body, action }) {
  return (
    <div className="empty-state" role="status">
      <h4 className="empty-state-title">{title}</h4>
      {body ? <p className="empty-state-body">{body}</p> : null}
      {action || null}
    </div>
  );
}
