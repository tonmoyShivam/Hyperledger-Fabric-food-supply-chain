import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { batchApi } from '../api';
import BatchTimeline from '../components/BatchTimeline';
import RecallModal from '../components/RecallModal';
import VerificationStatus from '../components/VerificationStatus';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { demonstrateTamper } from '../utils/hash';
import {
  canContaminate,
  formatDate,
  getErrorMessage,
  statusClass,
  STATUS_LABELS,
  truncateHash,
} from '../utils/helpers';

export default function BatchDetail() {
  const { batchId } = useParams();
  const { role } = useAuth();
  const toast = useToast();

  const [batch, setBatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [recallOpen, setRecallOpen] = useState(false);
  const [recalling, setRecalling] = useState(false);

  const [tamperIndex, setTamperIndex] = useState(0);
  const [tamperField, setTamperField] = useState('location');
  const [tamperValue, setTamperValue] = useState('TAMPERED-LOCATION');
  const [tamperResult, setTamperResult] = useState(null);
  const [tampering, setTampering] = useState(false);

  const verifyUrl = useMemo(() => {
    const origin = window.location.origin;
    return `${origin}/verify/${batchId}`;
  }, [batchId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await batchApi.history(batchId);
      const nextBatch = data.batch || data;
      const nextEvents = data.events || data.history || [];
      setBatch(nextBatch);
      setEvents(nextEvents);
      setTamperIndex(0);
      setTamperResult(null);
      setVerifyResult(null);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load batch'));
    } finally {
      setLoading(false);
    }
  }, [batchId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleVerify() {
    setVerifying(true);
    try {
      const { data } = await batchApi.verify(batchId);
      setVerifyResult(data);
      toast.info('Fabric integrity verification complete');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Verification failed'));
    } finally {
      setVerifying(false);
    }
  }

  async function handleContaminate({ reason, severity }) {
    setRecalling(true);
    try {
      await batchApi.contaminate(batchId, { reason, severity });
      toast.success('Contamination recorded on Fabric');
      setRecallOpen(false);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Contamination failed'));
    } finally {
      setRecalling(false);
    }
  }

  async function runIntegrityDemo(e) {
    e.preventDefault();
    setTampering(true);
    setTamperResult(null);
    try {
      const result = await demonstrateTamper(events, Number(tamperIndex), tamperField, tamperValue);
      setTamperResult(result);
      if (result.mismatch) {
        toast.warning('In-memory hash mismatch detected (Fabric unchanged)');
      } else {
        toast.info('Hashes still match after change');
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Integrity demo failed'));
    } finally {
      setTampering(false);
    }
  }

  if (loading) {
    return (
      <div className="panel loading-panel">
        <div className="spinner" />
        <p>Loading batch from Fabric…</p>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="panel empty-panel">
        <h3>Batch not found</h3>
        <Link to="/batches">Back to batches</Link>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow mono">{batch.batchId}</p>
          <h2>{batch.product}</h2>
          <div className="meta-row">
            <span className={statusClass(batch.status)}>
              {STATUS_LABELS[batch.status] || batch.status}
            </span>
            <span className="muted">Updated {formatDate(batch.updatedAt)}</span>
            <span className="muted">{batch.eventCount ?? events.length} events</span>
          </div>
        </div>
        <div className="action-row">
          <button type="button" className="btn btn-info" onClick={handleVerify} disabled={verifying}>
            {verifying ? (
              <>
                <span className="spinner spinner-sm" /> Verifying…
              </>
            ) : (
              'Verify on Fabric'
            )}
          </button>
          {canContaminate(role) && batch.status !== 'RECALLED' && (
            <button type="button" className="btn btn-danger" onClick={() => setRecallOpen(true)}>
              Flag contamination
            </button>
          )}
          <Link className="btn btn-ghost" to="/batches">
            Back
          </Link>
        </div>
      </div>

      <div className="detail-grid">
        <section className="panel">
          <h3>Batch summary</h3>
          <div className="summary-grid">
            <div>
              <div className="field-label">Origin actor</div>
              <div>{batch.originActor}</div>
            </div>
            <div>
              <div className="field-label">Origin location</div>
              <div>{batch.originLocation}</div>
            </div>
            <div>
              <div className="field-label">Created</div>
              <div>{formatDate(batch.createdAt)}</div>
            </div>
            <div>
              <div className="field-label">Latest hash</div>
              <code className="mono" title={batch.latestHash}>
                {truncateHash(batch.latestHash, 14)}
              </code>
            </div>
            {batch.contaminationReason && (
              <div className="full">
                <div className="field-label">Contamination reason</div>
                <div>{batch.contaminationReason}</div>
              </div>
            )}
          </div>
        </section>

        <section className="panel qr-panel">
          <h3>Public verification QR</h3>
          <p className="muted small">Scan to open the read-only public verify page.</p>
          <div className="qr-wrap">
            <QRCodeSVG value={verifyUrl} size={160} level="M" includeMargin />
          </div>
          <a className="mono small link" href={verifyUrl} target="_blank" rel="noreferrer">
            {verifyUrl}
          </a>
        </section>
      </div>

      <section className="panel mt-lg">
        <div className="panel-header">
          <h3>Supply-chain timeline</h3>
        </div>
        <BatchTimeline events={events} />
      </section>

      <div className="mt-lg">
        <VerificationStatus loading={verifying} result={verifyResult} />
      </div>

      <section className="panel mt-lg integrity-demo">
        <div className="panel-header">
          <h3>Integrity demonstration</h3>
          <span className="badge badge-warning">In-memory only</span>
        </div>
        <p className="muted">
          Clone this batch history in browser memory, change a field, and compare the original
          stored hash with a recalculated SHA-256 hash. This does <strong>not</strong> modify
          Hyperledger Fabric ledger state.
        </p>

        <form className="form-grid compact" onSubmit={runIntegrityDemo}>
          <label className="field">
            <span>Event index</span>
            <select value={tamperIndex} onChange={(e) => setTamperIndex(Number(e.target.value))}>
              {events.map((ev) => (
                <option key={ev.index} value={ev.index}>
                  #{ev.index} · {ev.stage}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Field</span>
            <select value={tamperField} onChange={(e) => setTamperField(e.target.value)}>
              <option value="location">location</option>
              <option value="actor">actor</option>
              <option value="stage">stage</option>
              <option value="timestamp">timestamp</option>
            </select>
          </label>
          <label className="field">
            <span>Tampered value</span>
            <input value={tamperValue} onChange={(e) => setTamperValue(e.target.value)} required />
          </label>
          <div className="field form-actions-inline">
            <button type="submit" className="btn btn-warning" disabled={tampering || !events.length}>
              {tampering ? (
                <>
                  <span className="spinner spinner-sm" /> Calculating…
                </>
              ) : (
                'Run in-memory tamper demo'
              )}
            </button>
          </div>
        </form>

        {tamperResult && (
          <div className={`tamper-result ${tamperResult.mismatch ? 'mismatch' : 'match'}`}>
            <p className="tamper-note">{tamperResult.note}</p>
            <div className="hash-compare">
              <div>
                <div className="field-label">ORIGINAL hash (from Fabric copy)</div>
                <code className="mono break">{tamperResult.originalHash}</code>
              </div>
              <div>
                <div className="field-label">RECALCULATED hash (after in-memory edit)</div>
                <code className="mono break">{tamperResult.recalculatedHash}</code>
              </div>
            </div>
            <p>
              Field <strong>{tamperResult.field}</strong> on event #{tamperResult.eventIndex}:{' '}
              <code>{String(tamperResult.previousValue)}</code> →{' '}
              <code>{String(tamperResult.newValue)}</code>
            </p>
            <p className="tamper-verdict">
              {tamperResult.mismatch
                ? 'Mismatch detected — local tampering would break the hash chain.'
                : 'Hashes still match.'}
            </p>
          </div>
        )}
      </section>

      <RecallModal
        open={recallOpen}
        batch={batch}
        onClose={() => setRecallOpen(false)}
        onConfirm={handleContaminate}
        submitting={recalling}
      />
    </div>
  );
}
