import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../utils/helpers';

export default function Navbar({ onMenuToggle, title }) {
  const { user, role, organization, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button type="button" className="menu-btn" onClick={onMenuToggle} aria-label="Toggle menu">
          <span />
          <span />
          <span />
        </button>
        <div>
          <h1 className="navbar-title">{title || 'Operations Dashboard'}</h1>
          <p className="navbar-subtitle">Hyperledger Fabric food supply chain</p>
        </div>
      </div>
      <div className="navbar-right">
        <div className="navbar-org">
          <span className="navbar-role">{ROLE_LABELS[role] || role}</span>
          <span className="navbar-msp">{organization}</span>
        </div>
        <div className="navbar-user">
          <span className="navbar-email">{user?.email}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
