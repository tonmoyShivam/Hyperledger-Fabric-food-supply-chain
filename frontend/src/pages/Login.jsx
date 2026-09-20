import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { DEMO_USERS, getErrorMessage } from '../utils/helpers';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('farm@foodchain.local');
  const [password, setPassword] = useState('Password123!');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.success('Signed in successfully');
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Login failed'));
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(user) {
    setEmail(user.email);
    setPassword('Password123!');
  }

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-brand">
          <div className="brand-mark large">FC</div>
          <h1>FoodChain Traceability</h1>
          <p>Enterprise Hyperledger Fabric supply-chain portal</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? (
              <>
                <span className="spinner spinner-sm" /> Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <div className="demo-users">
          <h2>Demo users</h2>
          <p className="muted">Password for all accounts: <code>Password123!</code></p>
          <ul>
            {DEMO_USERS.map((user) => (
              <li key={user.email}>
                <button type="button" className="demo-user-btn" onClick={() => fillDemo(user)}>
                  <span className="mono">{user.email}</span>
                  <span className="muted">
                    {user.role} · {user.org}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
