import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, batchApi } from '../api';
import StatCard from '../components/StatCard';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { canRegisterBatch, canAddEvent, formatDate, getErrorMessage, statusClass, STATUS_LABELS } from '../utils/helpers';

export default function Dashboard() {
  const { role } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [statsRes, batchesRes] = await Promise.all([
          dashboardApi.stats(),
          batchApi.list(),
        ]);
        if (cancelled) return;
        setStats(statsRes.data.stats || statsRes.data);
        const batches = Array.isArray(batchesRes.data)
          ? batchesRes.data
          : batchesRes.data.batches || [];
        setRecent(batches.slice(0, 5));
      } catch (error) {
        if (!cancelled) toast.error(getErrorMessage(error, 'Failed to load dashboard'));
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
        <p>Loading dashboard stats…</p>
      </div>
    );
  }

  const s = stats || {};

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Operations overview</h2>
          <p className="muted">Live metrics from Hyperledger Fabric via the API gateway.</p>
        </div>
        <div className="action-row">
          {canRegisterBatch(role) && (
            <Link className="btn btn-primary" to="/register">
              Register batch
            </Link>
          )}
          {canAddEvent(role) && (
            <Link className="btn btn-secondary" to="/events/add">
              Add event
            </Link>
          )}
          <Link className="btn btn-ghost" to="/batches">
            View all batches
          </Link>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Total batches" value={s.totalBatches ?? s.batches ?? 0} tone="info" />
        <StatCard label="Safe" value={s.safe ?? s.safeBatches ?? 0} tone="success" />
        <StatCard
          label="Contaminated"
          value={s.contaminated ?? s.contaminatedBatches ?? 0}
          tone="warning"
        />
        <StatCard label="Recalled" value={s.recalled ?? s.recalledBatches ?? 0} tone="danger" />
        <StatCard
          label="Total events"
          value={s.totalEvents ?? s.events ?? 0}
          tone="info"
          hint="Hash-chained supply-chain records"
        />
        <StatCard
          label="Active recalls"
          value={s.activeRecalls ?? s.recalls ?? 0}
          tone="warning"
        />
      </div>

      <section className="panel">
        <div className="panel-header">
          <h3>Recent batches</h3>
          <Link to="/batches">See all</Link>
        </div>
        {recent.length === 0 ? (
          <p className="muted">No batches registered yet.</p>
        ) : (
          <div className="recent-list">
            {recent.map((batch) => (
              <Link key={batch.batchId} to={`/batches/${batch.batchId}`} className="recent-item">
                <div>
                  <div className="mono">{batch.batchId}</div>
                  <div className="muted small">{batch.product}</div>
                </div>
                <div className="recent-meta">
                  <span className={statusClass(batch.status)}>
                    {STATUS_LABELS[batch.status] || batch.status}
                  </span>
                  <span className="muted small">{formatDate(batch.updatedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
