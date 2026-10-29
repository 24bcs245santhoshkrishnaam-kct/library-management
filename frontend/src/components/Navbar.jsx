import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, 
  ShieldCheck, 
  UserCheck, 
  Settings, 
  LogOut, 
  ChevronDown 
} from 'lucide-react';

export default function Navbar() {
  const { user, role, isStudent, isLibrarian, isAdmin, quickLoginAs, logout } = useAuth();

  return (
    <nav className="apple-nav py-2.5">
      <div className="container-fluid px-4 px-lg-5">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          
          {/* Brand Identity */}
          <div className="d-flex align-items-center gap-3">
            <div 
              className="d-flex align-items-center justify-content-center text-white shadow-sm"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '11px',
                background: 'linear-gradient(135deg, #1d1d1f 0%, #000000 100%)'
              }}
            >
              <BookOpen size={18} />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <span className="fw-bold fs-6 text-dark" style={{ letterSpacing: '-0.02em' }}>
                  Smart Library
                </span>
                <span className="apple-badge apple-badge-blue py-0.5 px-2" style={{ fontSize: '0.66rem' }}>
                  {isStudent ? 'BORROWER DASHBOARD' : isLibrarian ? 'LIBRARIAN DESK' : 'ADMIN CONSOLE'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Role Switcher (Apple Segmented Style) */}
          <div className="d-none d-lg-flex apple-segmented-control shadow-sm">
            <button
              type="button"
              className={`apple-segment-btn ${isStudent ? 'active' : ''}`}
              onClick={() => quickLoginAs('student')}
            >
              <UserCheck size={14} />
              <span>Borrower</span>
            </button>

            <button
              type="button"
              className={`apple-segment-btn ${isLibrarian ? 'active' : ''}`}
              onClick={() => quickLoginAs('librarian')}
            >
              <ShieldCheck size={14} />
              <span>Librarian</span>
            </button>

            <button
              type="button"
              className={`apple-segment-btn ${isAdmin ? 'active' : ''}`}
              onClick={() => quickLoginAs('admin')}
            >
              <Settings size={14} />
              <span>Admin</span>
            </button>
          </div>

          {/* User Profile & Sign Out Button */}
          <div className="d-flex align-items-center gap-2">
            {isStudent && (
              <div className="d-none d-md-flex align-items-center gap-1.5 bg-light px-2.5 py-1 rounded-pill border">
                <span className="text-muted" style={{ fontSize: '0.74rem' }}>Student:</span>
                <select
                  className="form-select form-select-sm border-0 bg-transparent py-0 px-1 fw-semibold text-dark"
                  style={{ fontSize: '0.78rem', cursor: 'pointer', boxShadow: 'none' }}
                  value={user?.username || ''}
                  onChange={(e) => quickLoginAs('student', e.target.value)}
                >
                  <option value="santhosh">Santhosh (24BCS245)</option>
                  <option value="parthiban">Parthiban (24BCS199)</option>
                </select>
              </div>
            )}

            {/* Profile Pill */}
            <div className="d-flex align-items-center gap-2 bg-white px-3 py-1 rounded-pill border shadow-sm">
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                style={{
                  width: '26px',
                  height: '26px',
                  fontSize: '0.72rem',
                  background: isStudent ? '#0071e3' : isLibrarian ? '#ff9500' : '#1d1d1f'
                }}
              >
                {user?.name ? user.name.charAt(0) : 'U'}
              </div>
              <div className="d-flex flex-column" style={{ lineHeight: '1.2' }}>
                <span className="fw-semibold text-dark" style={{ fontSize: '0.8rem' }}>
                  {user?.name || 'User'}
                </span>
                <span className="text-muted" style={{ fontSize: '0.68rem' }}>
                  {user?.student_id ? `ID: ${user.student_id}` : (user?.role ? user.role.toUpperCase() : '')}
                </span>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              type="button"
              className="btn btn-apple-subtle btn-sm d-flex align-items-center gap-1 text-danger px-3 py-1.5 ms-1"
              style={{ fontSize: '0.8rem' }}
              onClick={logout}
              title="Sign Out to Login Portal"
            >
              <LogOut size={14} />
              <span className="d-none d-sm-inline">Sign Out</span>
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
}
