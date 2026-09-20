import { formatDate, STAGE_LABELS, truncateHash } from '../utils/helpers';

function detailsText(details) {
  if (!details) return '—';
  if (typeof details === 'string') return details;
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

export default function BatchTimeline({ events = [], loading = false }) {
  if (loading) {
    return (
      <div className="panel loading-panel">
        <div className="spinner" />
        <p>Loading chain history…</p>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="panel empty-panel">
        <h3>No events</h3>
        <p>This batch has no recorded supply-chain events yet.</p>
      </div>
    );
  }

  return (
    <ol className="timeline">
      {events.map((event) => (
        <li key={event.eventId || `${event.batchId}-${event.index}`} className="timeline-item">
          <div className="timeline-marker" />
          <div className="timeline-card">
            <div className="timeline-header">
              <div>
                <span className="timeline-stage">
                  #{event.index} · {STAGE_LABELS[event.stage] || event.stage}
                </span>
                <div className="timeline-meta">{formatDate(event.timestamp)}</div>
              </div>
              <span className="badge badge-info">{event.actorOrg}</span>
            </div>

            <div className="timeline-grid">
              <div>
                <div className="field-label">Actor</div>
                <div>{event.actor}</div>
              </div>
              <div>
                <div className="field-label">Organization</div>
                <div>{event.actorOrg}</div>
              </div>
              <div>
                <div className="field-label">Location</div>
                <div>{event.location}</div>
              </div>
              <div>
                <div className="field-label">Fabric Tx ID</div>
                <div className="mono small">{event.transactionId || '—'}</div>
              </div>
            </div>

            <div className="timeline-details">
              <div className="field-label">Details</div>
              <pre className="code-block">{detailsText(event.details)}</pre>
            </div>

            <div className="hash-row">
              <div>
                <div className="field-label">Previous Hash</div>
                <code className="mono" title={event.previousHash}>
                  {truncateHash(event.previousHash, 12)}
                </code>
              </div>
              <div>
                <div className="field-label">Hash</div>
                <code className="mono" title={event.hash}>
                  {truncateHash(event.hash, 12)}
                </code>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
