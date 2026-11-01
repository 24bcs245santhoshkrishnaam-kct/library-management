import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, 
  GraduationCap, 
  ShieldCheck, 
  Settings, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  Database,
  Library
} from 'lucide-react';

export default function LoginPage({ onWatchIntro }) {
  const { login, quickLoginAs, loading } = useAuth();

  const [selectedRole, setSelectedRole] = useState('student'); // 'student' | 'librarian' | 'admin'
  const [identifier, setIdentifier] = useState('santhoshkrishna@gmail.com');
  const [password, setPassword] = useState('1234');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Role switch handler updates presets and clears error
  const handleRoleTabChange = (role) => {
    setSelectedRole(role);
    setError(null);
    if (role === 'admin') {
      setIdentifier('arun444@gamil.com');
      setPassword('KCT.admin');
    } else if (role === 'librarian') {
      setIdentifier('shankarlibarian46@gmail.vom');
      setPassword('Kct.libarian');
    } else {
      setIdentifier('santhoshkrishna@gmail.com');
      setPassword('1234');
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await login(identifier.trim(), password, selectedRole);
    if (!res.success) {
      setError(res.message || 'Invalid email or password');
    }
    setSubmitting(false);
  };

  const handleQuickDemoClick = async (demoId) => {
    setError(null);
    setSubmitting(true);
    const res = await quickLoginAs(selectedRole, demoId);
    if (!res.success) {
      setError(res.message || 'Login failed');
    }
    setSubmitting(false);
  };

  return (
    <div className="login-split-container">
        {/* Left Visual Column */}
        <div className="login-split-visual">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-3">
              <div 
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <Library size={26} className="text-white" />
              </div>
              <div>
                <h4 className="fw-bold text-white mb-0" style={{ letterSpacing: '-0.02em' }}>
                  KCT AI Smart Library
                </h4>
                <span className="text-white-50 small">Autonomous Academic Knowledge Center</span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-outline-light rounded-pill px-3 py-1.5 small d-inline-flex align-items-center gap-1.5 shadow-sm"
              onClick={() => onWatchIntro && onWatchIntro()}
              style={{ fontSize: '0.74rem', background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)' }}
              title="Watch 3D Book Opening Intro Animation"
            >
              <Sparkles size={12} className="text-teal-400" />
              <span>Watch 3D Intro</span>
            </button>
          </div>

        <div className="my-auto py-5" style={{ maxWidth: '540px' }}>
          <div className="d-inline-flex align-items-center gap-2 px-3 py-1.5 rounded-pill mb-4" style={{ background: 'rgba(13, 148, 136, 0.35)', border: '1px solid rgba(20, 184, 166, 0.5)' }}>
            <Sparkles size={14} className="text-teal-400" />
            <span className="small text-white fw-semibold">Next-Gen Circulation & AI Recommendations</span>
          </div>
          <h1 className="display-5 fw-bold text-white mb-4" style={{ letterSpacing: '-0.03em', lineHeight: '1.2' }}>
            Empowering Engineering Minds With Grounded Knowledge.
          </h1>
          <p className="text-white-50 fs-6 mb-5" style={{ lineHeight: '1.7' }}>
            Kumaraguru College of Technology (KCT) Autonomous Academic Knowledge Center. Access over 600+ curated textbooks across Computer Science, AI & Machine Learning, ECE, EEE, Mechanical, Shakespeare, and Tamil literature.
          </p>

          <div className="d-flex flex-column gap-3">
            <div className="d-flex align-items-center gap-3 text-white-50 small">
              <CheckCircle2 size={18} className="text-info flex-shrink-0" />
              <span>Instant online borrowing for 25+ registered student demo accounts</span>
            </div>
            <div className="d-flex align-items-center gap-3 text-white-50 small">
              <CheckCircle2 size={18} className="text-info flex-shrink-0" />
              <span>Prioritized librarian overdue tracking with 1-click SMS reminder dispatch</span>
            </div>
            <div className="d-flex align-items-center gap-3 text-white-50 small">
              <CheckCircle2 size={18} className="text-info flex-shrink-0" />
              <span>Institutional governance, CSV student ingestion & audit trails for admins</span>
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center justify-content-between text-white-50 small pt-4 border-top border-secondary border-opacity-25">
          <span>Kumaraguru College of Technology (KCT)</span>
          <span className="d-flex align-items-center gap-1.5 text-white">
            <Database size={13} className="text-success" />
            MySQL 9.4 Live
          </span>
        </div>
      </div>

      {/* Right Login Card Column */}
      <div className="login-split-card-wrapper">
        <div className="login-card">
          <div className="text-center mb-4">
            <h3 className="fw-bold text-navy-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
              Sign In to KCT AI Smart Library
            </h3>
            <p className="text-muted small mb-0">Select your institutional role to continue</p>
          </div>

          {/* Role Selection Tabs */}
          <div className="role-tabs-container">
            <button
              type="button"
              className={`role-tab-btn ${selectedRole === 'student' ? 'active' : ''}`}
              onClick={() => handleRoleTabChange('student')}
            >
              <GraduationCap size={16} />
              <span>Student</span>
            </button>

            <button
              type="button"
              className={`role-tab-btn ${selectedRole === 'librarian' ? 'active' : ''}`}
              onClick={() => handleRoleTabChange('librarian')}
            >
              <ShieldCheck size={16} />
              <span>Librarian</span>
            </button>

            <button
              type="button"
              className={`role-tab-btn ${selectedRole === 'admin' ? 'active' : ''}`}
              onClick={() => handleRoleTabChange('admin')}
            >
              <Settings size={16} />
              <span>Admin</span>
            </button>
          </div>

          {/* One-Click Quick Demo Access Pills */}
          <div className="p-3 mb-4 rounded-3" style={{ background: '#f8fafc', border: '1px solid var(--border-color)' }}>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="small text-secondary fw-semibold" style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1-Click Demo Login:
              </span>
              <span className="badge-active-teal px-2 py-0.5 rounded-pill" style={{ fontSize: '0.68rem', fontWeight: 600 }}>
                Instant Access
              </span>
            </div>

            {selectedRole === 'student' && (
              <div className="d-flex flex-column gap-2">
                <button
                  type="button"
                  className="btn btn-white bg-white border text-dark btn-sm rounded-3 text-start px-3 py-2 d-flex align-items-center justify-content-between shadow-sm"
                  onClick={() => handleQuickDemoClick('santhoshkrishna@gmail.com')}
                  disabled={submitting}
                >
                  <div>
                    <div className="fw-semibold small text-navy-900">Santhosh Krishna (Student 1)</div>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>santhoshkrishna@gmail.com • CSE • Active Loans</div>
                  </div>
                  <ArrowRight size={14} className="text-teal-600" />
                </button>

                <button
                  type="button"
                  className="btn btn-white bg-white border text-dark btn-sm rounded-3 text-start px-3 py-2 d-flex align-items-center justify-content-between shadow-sm"
                  onClick={() => handleQuickDemoClick('Parthi43@gmail.com')}
                  disabled={submitting}
                >
                  <div>
                    <div className="fw-semibold small text-navy-900">Parthipan (Student 2)</div>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>Parthi43@gmail.com • AI & Data • Overdue Loan</div>
                  </div>
                  <ArrowRight size={14} className="text-teal-600" />
                </button>

                {/* Extra Student Demo Accounts: Parama, Prawin, Rupak */}
                <div className="d-flex flex-wrap gap-1.5 pt-1 border-top mt-1">
                  <button
                    type="button"
                    className="btn btn-sm btn-light border py-1 px-2 text-dark rounded-pill"
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => { setIdentifier('parama@kct.ac.in'); setPassword('12345'); }}
                    title="Load Parama account"
                  >
                    👤 Parama (parama@kct.ac.in)
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-light border py-1 px-2 text-dark rounded-pill"
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => { setIdentifier('prawin@kct.ac.in'); setPassword('12345'); }}
                    title="Load Prawin account"
                  >
                    👤 Prawin (prawin@kct.ac.in)
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-light border py-1 px-2 text-dark rounded-pill"
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => { setIdentifier('rupak@kct.ac.in'); setPassword('12345'); }}
                    title="Load Rupak account"
                  >
                    👤 Rupak (rupak@kct.ac.in)
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-light border py-1 px-2 text-dark rounded-pill"
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => { setIdentifier('prawin.kct@gmail.com'); setPassword('12345'); }}
                    title="Load Prawin Gmail"
                  >
                    ✉️ prawin.kct@gmail.com
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-light border py-1 px-2 text-dark rounded-pill"
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => { setIdentifier('rupak.kct@gmail.com'); setPassword('12345'); }}
                    title="Load Rupak Gmail"
                  >
                    ✉️ rupak.kct@gmail.com
                  </button>
                </div>
              </div>
            )}

            {selectedRole === 'librarian' && (
              <button
                type="button"
                className="btn btn-white bg-white border text-dark btn-sm rounded-3 text-start px-3 py-2 w-100 d-flex align-items-center justify-content-between shadow-sm"
                onClick={() => handleQuickDemoClick('shankarlibarian46@gmail.vom')}
                disabled={submitting}
              >
                <div>
                  <div className="fw-semibold small text-navy-900">Head Librarian Mr. Shankar</div>
                  <div className="text-muted" style={{ fontSize: '0.72rem' }}>shankarlibarian46@gmail.vom • Overdue Tracker & SMS</div>
                </div>
                <ArrowRight size={14} className="text-teal-600" />
              </button>
            )}

            {selectedRole === 'admin' && (
              <button
                type="button"
                className="btn btn-white bg-white border text-dark btn-sm rounded-3 text-start px-3 py-2 w-100 d-flex align-items-center justify-content-between shadow-sm"
                onClick={() => handleQuickDemoClick('arun444@gamil.com')}
                disabled={submitting}
              >
                <div>
                  <div className="fw-semibold small text-navy-900">Chief Administrator Dr. Arun</div>
                  <div className="text-muted" style={{ fontSize: '0.72rem' }}>arun444@gamil.com • CSV Ingestion & Policies</div>
                </div>
                <ArrowRight size={14} className="text-navy-blue" />
              </button>
            )}
          </div>

          {/* Error Notice */}
          {error && (
            <div className="alert alert-danger rounded-3 py-2.5 px-3 small d-flex align-items-center gap-2 mb-3" role="alert">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Manual Credentials Form */}
          <form onSubmit={handleManualSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary">
                {selectedRole === 'student' ? 'College Email or Student ID' : 'Institutional Email'}
              </label>
              <div className="input-group rounded-3 border bg-light overflow-hidden">
                <span className="input-group-text bg-transparent border-0 ps-3">
                  <Mail size={16} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-0 bg-transparent px-2"
                  required
                  placeholder={selectedRole === 'student' ? 'santhoshkrishna@gmail.com, parama@kct.ac.in...' : selectedRole === 'librarian' ? 'shankarlibarian46@gmail.vom' : 'arun444@gamil.com'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <label className="form-label small fw-semibold text-secondary mb-0">Password</label>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>Encrypted & Hashed</span>
              </div>
              <div className="input-group rounded-3 border bg-light overflow-hidden">
                <span className="input-group-text bg-transparent border-0 ps-3">
                  <Lock size={16} className="text-muted" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control border-0 bg-transparent px-2"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="btn border-0 bg-transparent text-muted pe-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-navy w-100 py-2.5 d-flex align-items-center justify-content-center gap-2"
              disabled={submitting || loading}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status"></span>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In as {selectedRole === 'student' ? 'Student' : selectedRole === 'librarian' ? 'Librarian' : 'Admin'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-4">
            <span className="text-muted" style={{ fontSize: '0.74rem' }}>
              Academic Security Protocol • Unauthorized access prohibited
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
