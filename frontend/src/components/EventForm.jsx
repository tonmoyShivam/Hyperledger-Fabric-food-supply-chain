import { useEffect, useMemo, useState } from 'react';
import { ROLE_STAGES, STAGE_LABELS } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

const defaultForm = {
  batchId: '',
  stage: '',
  actor: '',
  location: '',
  notes: '',
  temperature: '',
  quantity: '',
};

export default function EventForm({
  initialBatchId = '',
  onSubmit,
  submitting = false,
  batches = [],
}) {
  const { role, user } = useAuth();
  const allowedStages = useMemo(() => ROLE_STAGES[role] || [], [role]);
  const [form, setForm] = useState({
    ...defaultForm,
    batchId: initialBatchId,
    stage: allowedStages[0] || '',
    actor: user?.email || '',
  });

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      batchId: initialBatchId || prev.batchId,
      stage: prev.stage || allowedStages[0] || '',
      actor: prev.actor || user?.email || '',
    }));
  }, [initialBatchId, allowedStages, user]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const details = {
      notes: form.notes || 'Event recorded',
    };
    if (form.temperature) details.temperature = form.temperature;
    if (form.quantity) details.quantity = form.quantity;

    onSubmit?.({
      batchId: form.batchId.trim().toUpperCase(),
      stage: form.stage,
      actor: form.actor.trim(),
      location: form.location.trim(),
      details,
    });
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span>Batch ID</span>
          {batches.length > 0 ? (
            <select
              value={form.batchId}
              onChange={(e) => update('batchId', e.target.value)}
              required
            >
              <option value="">Select batch</option>
              {batches.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  {b.batchId} — {b.product}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={form.batchId}
              onChange={(e) => update('batchId', e.target.value.toUpperCase())}
              placeholder="e.g. MNG1024"
              required
            />
          )}
        </label>

        <label className="field">
          <span>Stage</span>
          <select
            value={form.stage}
            onChange={(e) => update('stage', e.target.value)}
            required
            disabled={!allowedStages.length}
          >
            {!allowedStages.length && <option value="">No stages for this role</option>}
            {allowedStages.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_LABELS[stage] || stage}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Actor</span>
          <input
            value={form.actor}
            onChange={(e) => update('actor', e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Location</span>
          <input
            value={form.location}
            onChange={(e) => update('location', e.target.value)}
            placeholder="Facility / city"
            required
          />
        </label>

        <label className="field">
          <span>Temperature (optional)</span>
          <input
            value={form.temperature}
            onChange={(e) => update('temperature', e.target.value)}
            placeholder="e.g. 4°C"
          />
        </label>

        <label className="field">
          <span>Quantity (optional)</span>
          <input
            value={form.quantity}
            onChange={(e) => update('quantity', e.target.value)}
            placeholder="e.g. 200 crates"
          />
        </label>

        <label className="field full">
          <span>Notes</span>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="Event details"
          />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting || !allowedStages.length}>
          {submitting ? (
            <>
              <span className="spinner spinner-sm" /> Submitting to Fabric…
            </>
          ) : (
            'Submit Event'
          )}
        </button>
      </div>
    </form>
  );
}
