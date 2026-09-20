import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS, canAddEvent, canRegisterBatch } from '../utils/helpers';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/batches', label: 'Batches' },
  { to: '/register', label: 'Register Batch', roles: ['FARM'] },
  { to: '/events/add', label: 'Add Event', roles: ['PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN'] },
  { to: '/recalls', label: 'Recalls' },
  { to: '/audit', label: 'Audit & Verify' },
];

export default function Sidebar({ open, onClose }) {
  const { role, organization, user } = useAuth();

  const visible = links.filter((link) => {
    if (!link.roles) return true;
    return link.roles.includes(role);
  });

  return (
    <>
      <div className={`sidebar-backdrop ${open ? 'visible' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">FC</div>
          <div>
            <div className="brand-title">FoodChain</div>
            <div className="brand-subtitle">Fabric Traceability</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {visible.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-email">{user?.email}</div>
            <div className="sidebar-user-meta">
              {ROLE_LABELS[role] || role} · {organization}
            </div>
          </div>
          {canRegisterBatch(role) && (
            <p className="sidebar-hint">Farm org can register origin batches.</p>
          )}
          {canAddEvent(role) && (
            <p className="sidebar-hint">Your role may append supply-chain events.</p>
          )}
        </div>
      </aside>
    </>
  );
}
