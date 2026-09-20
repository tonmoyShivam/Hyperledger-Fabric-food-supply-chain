export const STAGE_LABELS = {
  ORIGIN: 'Farm / Origin',
  PROCESSOR: 'Processor',
  DISTRIBUTOR: 'Distributor',
  WALMART_STORE: 'Walmart Store',
  CUSTOMER_SALE: 'Customer Sale',
  STATUS_CHANGE: 'Status Change',
};

export const STATUS_LABELS = {
  SAFE: 'Safe',
  CONTAMINATED: 'Contaminated',
  RECALLED: 'Recalled',
};

export const ROLE_LABELS = {
  FARM: 'Farm',
  PROCESSOR: 'Processor',
  DISTRIBUTOR: 'Distributor',
  STORE_ADMIN: 'Store Admin',
  AUDITOR: 'Auditor',
};

export const DEMO_USERS = [
  { email: 'farm@foodchain.local', role: 'FARM', org: 'FarmOrgMSP' },
  { email: 'processor@foodchain.local', role: 'PROCESSOR', org: 'ProcessorOrgMSP' },
  { email: 'distributor@foodchain.local', role: 'DISTRIBUTOR', org: 'DistributorOrgMSP' },
  { email: 'store@foodchain.local', role: 'STORE_ADMIN', org: 'RetailOrgMSP' },
  { email: 'auditor@foodchain.local', role: 'AUDITOR', org: 'AuditorOrgMSP' },
];

export const ROLE_STAGES = {
  FARM: ['ORIGIN'],
  PROCESSOR: ['PROCESSOR'],
  DISTRIBUTOR: ['DISTRIBUTOR'],
  STORE_ADMIN: ['WALMART_STORE', 'CUSTOMER_SALE'],
  AUDITOR: [],
};

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncateHash(hash, size = 10) {
  if (!hash) return '—';
  const str = String(hash);
  if (str.length <= size * 2) return str;
  return `${str.slice(0, size)}…${str.slice(-size)}`;
}

export function statusClass(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'SAFE') return 'badge badge-success';
  if (s === 'CONTAMINATED') return 'badge badge-warning';
  if (s === 'RECALLED') return 'badge badge-danger';
  return 'badge badge-info';
}

export function getErrorMessage(error, fallback = 'Something went wrong') {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

export function canRegisterBatch(role) {
  return role === 'FARM';
}

export function canAddEvent(role) {
  return ['PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN'].includes(role);
}

export function canContaminate(role) {
  return role === 'STORE_ADMIN';
}

export function canViewAudit(role) {
  return ['AUDITOR', 'STORE_ADMIN', 'FARM', 'PROCESSOR', 'DISTRIBUTOR'].includes(role);
}
