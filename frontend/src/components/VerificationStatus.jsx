export default function VerificationStatus({ result, loading = false, title = 'Chain Verification' }) {
  if (loading) {
    return (
      <div className="panel verify-panel">
        <div className="spinner" />
        <p>Verifying hash chain on Fabric…</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="panel verify-panel muted">
        <h3>{title}</h3>
        <p>Run verification to check previousHash links and SHA-256 event hashes.</p>
      </div>
    );
  }

  const valid =
    result.valid === true ||
    result.isValid === true ||
    result.integrity === 'VALID' ||
    result.status === 'VALID';

  const invalidBlocks = result.invalidBlocks || result.failures || [];
  const validBlocks = result.validBlocks ?? result.validCount;
  const total = result.totalBlocks ?? result.eventCount ?? result.total;

  return (
    <div className={`panel verify-panel ${valid ? 'valid' : 'invalid'}`}>
      <div className="verify-header">
        <h3>{title}</h3>
        <span className={`badge ${valid ? 'badge-success' : 'badge-danger'}`}>
          {valid ? 'VALID' : 'INVALID'}
        </span>
      </div>

      <p className="verify-summary">
        {result.summary ||
          result.message ||
          (valid
            ? 'All event hashes and previousHash links verify successfully.'
            : 'Hash chain integrity check failed.')}
      </p>

      <div className="verify-stats">
        {validBlocks != null && (
          <div>
            <div className="field-label">Valid blocks</div>
            <div>{validBlocks}</div>
          </div>
        )}
        {total != null && (
          <div>
            <div className="field-label">Total blocks</div>
            <div>{total}</div>
          </div>
        )}
        {result.brokenLinks != null && (
          <div>
            <div className="field-label">Broken links</div>
            <div>{result.brokenLinks}</div>
          </div>
        )}
      </div>

      {Array.isArray(invalidBlocks) && invalidBlocks.length > 0 && (
        <div className="verify-failures">
          <div className="field-label">Issues</div>
          <ul>
            {invalidBlocks.map((item, idx) => (
              <li key={idx}>
                {typeof item === 'string'
                  ? item
                  : `Block #${item.index ?? item.blockIndex}: ${(item.reasons || item.errors || []).join('; ') || item.message || 'Invalid'}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
