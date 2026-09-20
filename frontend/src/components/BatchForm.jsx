import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const defaultForm = {
  batchId: '',
  product: '',
  originActor: '',
  originLocation: '',
  variety: '',
  harvestDate: '',
  notes: '',
};

export default function BatchForm({ onSubmit, submitting = false }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    ...defaultForm,
    originActor: user?.email || '',
  });

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const details = {
      notes: form.notes || 'Batch registered at origin',
    };
    if (form.variety) details.variety = form.variety;
    if (form.harvestDate) details.harvestDate = form.harvestDate;

    onSubmit?.({
      batchId: form.batchId.trim().toUpperCase(),
      product: form.product.trim(),
      originActor: form.originActor.trim(),
      originLocation: form.originLocation.trim(),
      details,
    });
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span>Batch ID</span>
          <input
            value={form.batchId}
            onChange={(e) => update('batchId', e.target.value.toUpperCase())}
            placeholder="e.g. MNG2048"
            required
          />
        </label>

        <label className="field">
          <span>Product</span>
          <input
            value={form.product}
            onChange={(e) => update('product', e.target.value)}
            placeholder="e.g. Organic Mangoes"
            required
          />
        </label>

        <label className="field">
          <span>Origin Actor</span>
          <input
            value={form.originActor}
            onChange={(e) => update('originActor', e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Origin Location</span>
          <input
            value={form.originLocation}
            onChange={(e) => update('originLocation', e.target.value)}
            placeholder="Farm / region"
            required
          />
        </label>

        <label className="field">
          <span>Variety (optional)</span>
          <input
            value={form.variety}
            onChange={(e) => update('variety', e.target.value)}
            placeholder="e.g. Alphonso"
          />
        </label>

        <label className="field">
          <span>Harvest Date (optional)</span>
          <input
            type="date"
            value={form.harvestDate}
            onChange={(e) => update('harvestDate', e.target.value)}
          />
        </label>

        <label className="field full">
          <span>Notes</span>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="Origin notes"
          />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? (
            <>
              <span className="spinner spinner-sm" /> Registering on Fabric…
            </>
          ) : (
            'Register Batch'
          )}
        </button>
      </div>
    </form>
  );
}
