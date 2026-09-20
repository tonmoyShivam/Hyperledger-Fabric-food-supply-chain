import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { batchApi } from '../api';
import BatchTable from '../components/BatchTable';
import RecallModal from '../components/RecallModal';
import VerificationStatus from '../components/VerificationStatus';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { canContaminate, getErrorMessage } from '../utils/helpers';

export default function Batches() {
  const { role } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [recallBatch, setRecallBatch] = useState(null);
  const [recalling, setRecalling] = useState(false);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      let data;
      if (search.trim()) {
        const res = await batchApi.search(search.trim());
        data = res.data;
      } else {
        const res = await batchApi.list();
        data = res.data;
      }
      const list = Array.isArray(data) ? data : data.batches || [];
      setBatches(list);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load batches'));
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    const timer = setTimeout(loadBatches, 250);
    return () => clearTimeout(timer);
  }, [loadBatches]);

  const filtered = useMemo(() => {
    if (statusFilter === 'ALL') return batches;
    return batches.filter((b) => String(b.status).toUpperCase() === statusFilter);
  }, [batches, statusFilter]);

  async function handleVerify(batch) {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const { data } = await batchApi.verify(batch.batchId);
      setVerifyResult({ ...data, batchId: batch.batchId });
      toast.info(`Verification completed for ${batch.batchId}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Verification failed'));
    } finally {
      setVerifying(false);
    }
  }

  async function handleContaminate({ reason, severity }) {
    if (!recallBatch) return;
    setRecalling(true);
    try {
      await batchApi.contaminate(recallBatch.batchId, { reason, severity });
      toast.success(`Contamination flagged for ${recallBatch.batchId}`);
      setRecallBatch(null);
      await loadBatches();
      navigate(`/batches/${recallBatch.batchId}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Contamination request failed'));
    } finally {
      setRecalling(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Batches</h2>
          <p className="muted">Search, filter, verify integrity, and manage contamination.</p>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search by batch ID or product…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All statuses</option>
          <option value="SAFE">Safe</option>
          <option value="CONTAMINATED">Contaminated</option>
          <option value="RECALLED">Recalled</option>
        </select>
        <button type="button" className="btn btn-secondary" onClick={loadBatches}>
          Refresh
        </button>
      </div>

      <BatchTable
        batches={filtered}
        loading={loading}
        onVerify={handleVerify}
        onRecall={canContaminate(role) ? setRecallBatch : undefined}
        showRecall={canContaminate(role)}
      />

      {(verifying || verifyResult) && (
        <div className="mt-lg">
          <VerificationStatus
            loading={verifying}
            result={verifyResult}
            title={
              verifyResult?.batchId
                ? `Verification · ${verifyResult.batchId}`
                : 'Chain Verification'
            }
          />
        </div>
      )}

      <RecallModal
        open={Boolean(recallBatch)}
        batch={recallBatch}
        onClose={() => setRecallBatch(null)}
        onConfirm={handleContaminate}
        submitting={recalling}
      />
    </div>
  );
}
