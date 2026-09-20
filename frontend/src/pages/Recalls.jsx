import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { recallApi } from '../api';
import { useToast } from '../components/Toast';
import { formatDate, getErrorMessage, statusClass } from '../utils/helpers';

export default function Recalls() {
  const toast = useToast();
  const [recalls, setRecalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const { data } = await recallApi.list();
        if (!cancelled) {
          setRecalls(Array.isArray(data) ? data : data.recalls || []);
        }
      } catch (error) {
        if (!cancelled) toast.error(getErrorMessage(error, 'Failed to load recalls'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  if (loading) {
    return (
      <div className="panel loading-panel">
        <div className="spinner" />
        <p>Loading recalls from Fabric…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Recalls</h2>
          <p className="muted">Contamination-driven recalls recorded on the ledger.</p>
        </div>
      </div>

      {!recalls.length ? (
        <div className="panel empty-panel">
          <h3>No recalls</h3>
          <p>When a store admin flags contamination, recall records appear here.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Recall ID</th>
                <th>Batch</th>
                <th>Reason</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Created</th>
                <th>Touchpoints</th>
              </tr>
            </thead>
            <tbody>
              {recalls.map((recall) => (
                <tr key={recall.recallId || recall.id || recall.batchId}>
                  <td className="mono">{recall.recallId || recall.id || '—'}</td>
                  <td>
                    <Link className="mono link" to={`/batches/${recall.batchId}`}>
                      {recall.batchId}
                    </Link>
                  </td>
                  <td>{recall.reason || recall.contaminationReason || '—'}</td>
                  <td>{recall.severity || '—'}</td>
                  <td>
                    <span className={statusClass(recall.status || 'RECALLED')}>
                      {recall.status || 'RECALLED'}
                    </span>
                  </td>
                  <td>{formatDate(recall.createdAt || recall.timestamp)}</td>
                  <td>
                    {Array.isArray(recall.touchpoints)
                      ? recall.touchpoints.length
                      : recall.affectedLocations?.length ??
                        recall.eventCount ??
                        '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
