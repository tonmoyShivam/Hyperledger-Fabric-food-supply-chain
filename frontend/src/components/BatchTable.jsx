import { Link } from 'react-router-dom';
import { formatDate, statusClass, STATUS_LABELS } from '../utils/helpers';

export default function BatchTable({
  batches = [],
  loading = false,
  onVerify,
  onRecall,
  showRecall = false,
}) {
  if (loading) {
    return (
      <div className="panel loading-panel">
        <div className="spinner" />
        <p>Loading batches from Fabric…</p>
      </div>
    );
  }

  if (!batches.length) {
    return (
      <div className="panel empty-panel">
        <h3>No batches found</h3>
        <p>Register a batch or adjust your search filters.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Batch ID</th>
            <th>Product</th>
            <th>Status</th>
            <th>Origin</th>
            <th>Events</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((batch) => (
            <tr key={batch.batchId}>
              <td>
                <Link className="mono link" to={`/batches/${batch.batchId}`}>
                  {batch.batchId}
                </Link>
              </td>
              <td>{batch.product}</td>
              <td>
                <span className={statusClass(batch.status)}>
                  {STATUS_LABELS[batch.status] || batch.status}
                </span>
              </td>
              <td>
                <div>{batch.originActor || '—'}</div>
                <div className="muted small">{batch.originLocation}</div>
              </td>
              <td>{batch.eventCount ?? '—'}</td>
              <td>{formatDate(batch.updatedAt || batch.createdAt)}</td>
              <td>
                <div className="action-row">
                  <Link className="btn btn-sm btn-secondary" to={`/batches/${batch.batchId}`}>
                    View
                  </Link>
                  <button
                    type="button"
                    className="btn btn-sm btn-info"
                    onClick={() => onVerify?.(batch)}
                  >
                    Verify
                  </button>
                  {showRecall && (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => onRecall?.(batch)}
                      disabled={batch.status === 'RECALLED'}
                    >
                      Recall
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
