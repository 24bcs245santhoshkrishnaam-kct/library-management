import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyLoans, getMyLoanStatus } from '../services/api';
import { BookOpen, AlertTriangle, Clock, CheckCircle2, AlertCircle, RefreshCw, MessageSquare } from 'lucide-react';

export default function StudentLoans({ onAskChatbot }) {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterTab, setFilterTab] = useState('active'); // 'active' | 'all'

  const loadStudentData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [loansData, summaryData] = await Promise.all([
        getMyLoans(),
        getMyLoanStatus()
      ]);
      setLoans(loansData.loans || []);
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to load borrowing records:', err);
      setError(err.response?.data?.message || 'Failed to retrieve your borrowing records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [user]);

  const displayedLoans = filterTab === 'active'
    ? loans.filter(l => l.status === 'Issued')
    : loans;

  const getStatusBadge = (loan) => {
    switch (loan.status_label) {
      case 'Overdue':
        return (
          <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2.5 py-1 rounded-pill d-flex align-items-center gap-1">
            <AlertTriangle size={13} /> Overdue ({loan.days_overdue}d)
          </span>
        );
      case 'Due Soon':
        return (
          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2.5 py-1 rounded-pill d-flex align-items-center gap-1">
            <Clock size={13} /> Due Today / Soon
          </span>
        );
      case 'Returned':
        return (
          <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1 rounded-pill d-flex align-items-center gap-1">
            <CheckCircle2 size={13} /> Returned
          </span>
        );
      default:
        return (
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1 rounded-pill d-flex align-items-center gap-1">
            <Clock size={13} /> Issued ({loan.days_left}d left)
          </span>
        );
    }
  };

  return (
    <div className="container py-4">
      {/* Header and User Notice */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold text-dark mb-1">My Borrowing Status & History</h3>
          <p className="text-muted small mb-0">
            Authenticated Student: <strong>{user?.name}</strong> (Student ID: <strong>{user?.student_id || 'N/A'}</strong>)
          </p>
        </div>
        <button
          className="btn btn-outline-secondary btn-sm rounded-pill px-3 d-flex align-items-center gap-2"
          onClick={loadStudentData}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh Records
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <span className="text-muted small fw-medium">Active Loans</span>
            <h3 className="fw-bold text-primary mt-1 mb-0">{summary?.active_loans_count ?? 0}</h3>
            <span className="text-secondary small mt-1">Currently in possession</span>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <span className="text-muted small fw-medium">Overdue Books</span>
            <h3 className={`fw-bold mt-1 mb-0 ${(summary?.overdue_count ?? 0) > 0 ? 'text-danger' : 'text-success'}`}>
              {summary?.overdue_count ?? 0}
            </h3>
            <span className="text-secondary small mt-1">Requires immediate return</span>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <span className="text-muted small fw-medium">Due Soon</span>
            <h3 className="fw-bold text-warning mt-1 mb-0">{summary?.due_soon_count ?? 0}</h3>
            <span className="text-secondary small mt-1">Due within 3 days</span>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <span className="text-muted small fw-medium">Returned History</span>
            <h3 className="fw-bold text-success mt-1 mb-0">{summary?.returned_count ?? 0}</h3>
            <span className="text-secondary small mt-1">Successfully returned</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger rounded-4 d-flex align-items-center gap-2 mb-4" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="btn-group bg-light p-1 rounded-pill border">
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-3 fw-medium ${filterTab === 'active' ? 'btn-white bg-white shadow-sm text-dark' : 'text-muted'}`}
            onClick={() => setFilterTab('active')}
          >
            Currently Issued ({summary?.active_loans_count ?? 0})
          </button>
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-3 fw-medium ${filterTab === 'all' ? 'btn-white bg-white shadow-sm text-dark' : 'text-muted'}`}
            onClick={() => setFilterTab('all')}
          >
            Complete History ({loans.length})
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="text-muted small mt-2">Retrieving borrowing records from MySQL...</p>
          </div>
        ) : displayedLoans.length === 0 ? (
          <div className="text-center py-5">
            <BookOpen size={40} className="text-secondary opacity-50 mb-2" />
            <h6 className="fw-semibold text-dark">No Borrowing Records Found</h6>
            <p className="text-muted small">
              {filterTab === 'active' 
                ? 'You do not have any active book loans currently.' 
                : 'You have not borrowed any books yet.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-secondary small">
                <tr>
                  <th className="ps-4">Tx ID</th>
                  <th>Book Title & Subject</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Return Date</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Assistant Inquiry</th>
                </tr>
              </thead>
              <tbody>
                {displayedLoans.map((loan) => (
                  <tr key={loan.transaction_id}>
                    <td className="ps-4 fw-semibold text-secondary">
                      #{loan.transaction_id}
                    </td>
                    <td>
                      <div className="fw-bold text-dark">{loan.title}</div>
                      <div className="text-muted small">
                        Book #{loan.book_id} • Author: {loan.author} • Category: {loan.category}
                      </div>
                    </td>
                    <td className="small text-secondary">{loan.issue_date}</td>
                    <td className="small fw-semibold text-dark">
                      <span className={loan.is_overdue ? 'text-danger' : ''}>
                        {loan.due_date}
                      </span>
                    </td>
                    <td className="small text-secondary">
                      {loan.return_date ? (
                        <span className="text-success fw-medium">{loan.return_date}</span>
                      ) : (
                        <span className="text-muted italic">—</span>
                      )}
                    </td>
                    <td>
                      {getStatusBadge(loan)}
                    </td>
                    <td className="text-end pe-4">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary rounded-pill px-3 d-inline-flex align-items-center gap-1"
                        onClick={() => {
                          if (onAskChatbot) {
                            if (loan.status === 'Returned') {
                              onAskChatbot(`Has my return been updated for "${loan.title}"?`);
                            } else {
                              onAskChatbot(`When is my "${loan.title}" due, and have I returned it?`);
                            }
                          }
                        }}
                      >
                        <MessageSquare size={13} />
                        Ask AI
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

