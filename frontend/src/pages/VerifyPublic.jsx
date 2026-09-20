import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { publicApi } from '../api';
import BatchTimeline from '../components/BatchTimeline';
import VerificationStatus from '../components/VerificationStatus';
import {
  formatDate,
  getErrorMessage,
  statusClass,
  STATUS_LABELS,
} from '../utils/helpers';

export default function VerifyPublic() {
  const { batchId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await publicApi.verify(batchId);
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Unable to verify batch'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [batchId]);

  const batch = data?.batch || data;
  const events = data?.events || data?.history || [];
  const verification = data?.verification || data?.integrity || data?.verifyResult || null;

  return (
    <div className="public-verify-page">
      <header className="public-header">
        <div className="brand-inline">
          <div className="brand-mark">FC</div>
          <div>
            <div className="brand-title">FoodChain</div>
            <div className="brand-subtitle">Public batch verification</div>
          </div>
        </div>
        <Link className="btn btn-ghost btn-sm" to="/login">
          Partner login
        </Link>
      </header>

      <main className="public-content">
        <div className="page-header">
          <div>
            <p className="eyebrow">Read-only public view</p>
            <h1 className="mono">{batchId}</h1>
            <p className="muted">
              Consumers and auditors can inspect provenance without signing in. No write actions
              are available on this page.
            </p>
          </div>
        </div>

        {loading && (
          <div className="panel loading-panel">
            <div className="spinner" />
            <p>Fetching public verification data…</p>
          </div>
        )}

        {!loading && error && (
          <div className="panel empty-panel">
            <h3>Verification unavailable</h3>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && batch && (
          <>
            <section className="panel">
              <div className="summary-grid">
                <div>
                  <div className="field-label">Product</div>
                  <div>{batch.product || '—'}</div>
                </div>
                <div>
                  <div className="field-label">Status</div>
                  <span className={statusClass(batch.status)}>
                    {STATUS_LABELS[batch.status] || batch.status || '—'}
                  </span>
                </div>
                <div>
                  <div className="field-label">Origin</div>
                  <div>
                    {batch.originActor || '—'}
                    <div className="muted small">{batch.originLocation}</div>
                  </div>
                </div>
                <div>
                  <div className="field-label">Last update</div>
                  <div>{formatDate(batch.updatedAt || batch.createdAt)}</div>
                </div>
              </div>
            </section>

            <div className="mt-lg">
              <VerificationStatus
                result={
                  verification || {
                    valid: batch.status !== 'CONTAMINATED',
                    summary: data?.message || 'Public provenance record retrieved from Fabric gateway.',
                    totalBlocks: events.length,
                  }
                }
                title="Public integrity status"
              />
            </div>

            <section className="panel mt-lg">
              <div className="panel-header">
                <h3>Provenance timeline</h3>
              </div>
              <BatchTimeline events={events} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
