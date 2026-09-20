import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { batchApi } from '../api';
import BatchForm from '../components/BatchForm';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { canRegisterBatch, getErrorMessage } from '../utils/helpers';

export default function RegisterBatch() {
  const { role } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [txInfo, setTxInfo] = useState(null);

  if (!canRegisterBatch(role)) {
    return (
      <div className="panel empty-panel">
        <h3>Unauthorized</h3>
        <p>Only Farm organization users can register new batches.</p>
      </div>
    );
  }

  async function handleSubmit(payload) {
    setSubmitting(true);
    setTxInfo(null);
    try {
      const { data } = await batchApi.create(payload);
      setTxInfo(data);
      toast.success(`Batch ${payload.batchId} registered on Fabric`);
      setTimeout(() => navigate(`/batches/${payload.batchId}`), 800);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Batch registration failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Register batch</h2>
          <p className="muted">
            Creates an ORIGIN event on the Fabric ledger with a genesis previousHash.
          </p>
        </div>
      </div>

      <BatchForm onSubmit={handleSubmit} submitting={submitting} />

      {submitting && (
        <div className="panel loading-panel mt-lg">
          <div className="spinner" />
          <p>Waiting for Fabric transaction commit…</p>
        </div>
      )}

      {txInfo && (
        <div className="panel success-panel mt-lg">
          <h3>Fabric transaction committed</h3>
          <p className="mono">Tx ID: {txInfo.transactionId || txInfo.txId || '—'}</p>
          <p className="mono">Hash: {txInfo.hash || txInfo.event?.hash || '—'}</p>
        </div>
      )}
    </div>
  );
}
