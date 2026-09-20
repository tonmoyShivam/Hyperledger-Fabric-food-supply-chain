import { useEffect, useState } from 'react';
import { batchApi } from '../api';
import VerificationStatus from '../components/VerificationStatus';
import { useToast } from '../components/Toast';
import { getErrorMessage, STAGE_LABELS } from '../utils/helpers';

export default function Audit() {
  const toast = useToast();
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState('');
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [integrity, setIntegrity] = useState(null);
  const [history, setHistory] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingBatches(true);
      try {
        const { data } = await batchApi.list();
        if (!cancelled) {
          const list = Array.isArray(data) ? data : data.batches || [];
          setBatches(list);
          if (list.length && !batchId) setBatchId(list[0].batchId);
        }
      } catch (error) {
        if (!cancelled) toast.error(getErrorMessage(error, 'Failed to load batches'));
      } finally {
        if (!cancelled) setLoadingBatches(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [toast]); // eslint-disable-line react-hooks/exhaustive-deps

  async function runAudit(e) {
    e.preventDefault();
    if (!batchId) return;
    setVerifying(true);
    setResult(null);
    setIntegrity(null);
    setHistory(null);
    try {
      const [verifyRes, integrityRes, historyRes] = await Promise.all([
        batchApi.verify(batchId),
        batchApi.integrity(batchId).catch(() => ({ data: null })),
        batchApi.history(batchId),
      ]);
      setResult(verifyRes.data);
      setIntegrity(integrityRes.data);
      setHistory(historyRes.data);
      toast.success(`Audit complete for ${batchId}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Audit failed'));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Audit & verify</h2>
          <p className="muted">
            Recalculate event hashes and previousHash links for a selected batch on Fabric.
          </p>
        </div>
      </div>

      <form className="toolbar" onSubmit={runAudit}>
        <select
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
          disabled={loadingBatches}
          required
        >
          <option value="">Select batch</option>
          {batches.map((b) => (
            <option key={b.batchId} value={b.batchId}>
              {b.batchId} — {b.product}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary" disabled={verifying || !batchId}>
          {verifying ? (
            <>
              <span className="spinner spinner-sm" /> Auditing on Fabric…
            </>
          ) : (
            'Run audit'
          )}
        </button>
      </form>

      <VerificationStatus loading={verifying} result={result} title={`Audit · ${batchId || '—'}`} />

      {integrity && (
        <section className="panel mt-lg">
          <h3>Integrity report</h3>
          <pre className="code-block">{JSON.stringify(integrity, null, 2)}</pre>
        </section>
      )}

      {history?.events?.length > 0 && (
        <section className="panel mt-lg">
          <h3>Event digest</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Stage</th>
                  <th>Actor / Org</th>
                  <th>Tx ID</th>
                  <th>Hash</th>
                </tr>
              </thead>
              <tbody>
                {history.events.map((ev) => (
                  <tr key={ev.eventId || ev.index}>
                    <td>{ev.index}</td>
                    <td>{STAGE_LABELS[ev.stage] || ev.stage}</td>
                    <td>
                      {ev.actor}
                      <div className="muted small">{ev.actorOrg}</div>
                    </td>
                    <td className="mono small">{ev.transactionId || '—'}</td>
                    <td className="mono small">{ev.hash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
