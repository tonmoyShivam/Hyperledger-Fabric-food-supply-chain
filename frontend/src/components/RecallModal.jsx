import { useEffect, useState } from 'react';

export default function RecallModal({
  open,
  batch,
  onClose,
  onConfirm,
  submitting = false,
}) {
  const [reason, setReason] = useState('');
  const [severity, setSeverity] = useState('HIGH');

  useEffect(() => {
    if (open) {
      setReason('');
      setSeverity('HIGH');
    }
  }, [open, batch]);

  if (!open || !batch) return null;

  function handleSubmit(e) {
    e.preventDefault();
    onConfirm?.({
      reason: reason.trim(),
      severity,
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recall-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="recall-modal-title">Flag Contamination</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <p className="modal-lead">
          Mark batch <strong className="mono">{batch.batchId}</strong> ({batch.product}) as
          contaminated. This submits a Fabric transaction and triggers targeted recall analysis.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Contamination reason</span>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the contamination finding"
              required
            />
          </label>

          <label className="field">
            <span>Severity</span>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </label>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={submitting || !reason.trim()}>
              {submitting ? (
                <>
                  <span className="spinner spinner-sm" /> Submitting to Fabric…
                </>
              ) : (
                'Confirm Contamination'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
