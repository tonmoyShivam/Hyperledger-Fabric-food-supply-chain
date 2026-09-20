import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { batchApi } from '../api';
import EventForm from '../components/EventForm';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { canAddEvent, getErrorMessage } from '../utils/helpers';

export default function AddEvent() {
  const { role } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [batches, setBatches] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [txInfo, setTxInfo] = useState(null);
  const initialBatchId = searchParams.get('batchId') || '';

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data } = await batchApi.list();
        if (!cancelled) {
          setBatches(Array.isArray(data) ? data : data.batches || []);
        }
      } catch (error) {
        if (!cancelled) toast.error(getErrorMessage(error, 'Failed to load batches'));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  if (!canAddEvent(role)) {
    return (
      <div className="panel empty-panel">
        <h3>Unauthorized</h3>
        <p>Your role cannot append supply-chain events.</p>
      </div>
    );
  }

  async function handleSubmit(payload) {
    setSubmitting(true);
    setTxInfo(null);
    try {
      const { batchId, ...body } = payload;
      const { data } = await batchApi.addEvent(batchId, body);
      setTxInfo(data);
      toast.success(`Event recorded for ${batchId}`);
      setTimeout(() => navigate(`/batches/${batchId}`), 800);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Event submission failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Add supply-chain event</h2>
          <p className="muted">
            Appends a hashed event linked to the previous block via previousHash.
          </p>
        </div>
      </div>

      <EventForm
        initialBatchId={initialBatchId}
        batches={batches}
        onSubmit={handleSubmit}
        submitting={submitting}
      />

      {submitting && (
        <div className="panel loading-panel mt-lg">
          <div className="spinner" />
          <p>Submitting transaction to Hyperledger Fabric…</p>
        </div>
      )}

      {txInfo && (
        <div className="panel success-panel mt-lg">
          <h3>Fabric transaction committed</h3>
          <p className="mono">Tx ID: {txInfo.transactionId || txInfo.txId || '—'}</p>
          <p className="mono">Event: {txInfo.eventId || txInfo.event?.eventId || '—'}</p>
        </div>
      )}
    </div>
  );
}
