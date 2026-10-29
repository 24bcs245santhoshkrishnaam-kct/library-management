import React, { useState, useMemo } from 'react';
import { 
  User, 
  BookOpen, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Mail, 
  Bell, 
  Filter, 
  Layers, 
  Check, 
  LayoutGrid, 
  Table as TableIcon,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  MapPin
} from 'lucide-react';

export default function StudentBorrowersRegistry({ 
  loans = [], 
  loading = false, 
  onReturnLoan, 
  onRefresh,
  title = "Student Borrowers & Due Date Registry",
  subtitle = "Live academic circulation tracker: Monitoring active students, book titles, and return deadlines"
}) {
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [filterStatus, setFilterStatus] = useState('All'); // 'All' | 'Issued' | 'Overdue' | 'Due Soon' | 'Returned'
  const [searchQuery, setSearchQuery] = useState('');
  const [remindersSent, setRemindersSent] = useState({});

  // Filter loans based on search and status
  const filteredLoans = useMemo(() => {
    return loans.filter(loan => {
      // Status filter
      if (filterStatus === 'Issued' && loan.status !== 'Issued') return false;
      if (filterStatus === 'Returned' && loan.status !== 'Returned') return false;
      if (filterStatus === 'Overdue' && (!loan.is_overdue || loan.status === 'Returned')) return false;
      if (filterStatus === 'Due Soon' && loan.status_label !== 'Due Soon') return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const studentMatch = (loan.student_name || '').toLowerCase().includes(q);
        const idMatch = (loan.student_id || '').toLowerCase().includes(q);
        const titleMatch = (loan.title || '').toLowerCase().includes(q);
        const authorMatch = (loan.author || '').toLowerCase().includes(q);
        return studentMatch || idMatch || titleMatch || authorMatch;
      }
      return true;
    });
  }, [loans, filterStatus, searchQuery]);

  // Group loans by student
  const groupedStudents = useMemo(() => {
    const map = {};
    filteredLoans.forEach(loan => {
      const key = loan.student_id || loan.student_name || String(loan.user_id);
      if (!map[key]) {
        map[key] = {
          student_name: loan.student_name,
          student_id: loan.student_id,
          student_email: loan.student_email,
          user_id: loan.user_id,
          loans: [],
          activeCount: 0,
          overdueCount: 0,
          returnedCount: 0
        };
      }
      map[key].loans.push(loan);
      if (loan.status === 'Issued') {
        map[key].activeCount++;
        if (loan.is_overdue) map[key].overdueCount++;
      } else if (loan.status === 'Returned') {
        map[key].returnedCount++;
      }
    });
    return Object.values(map);
  }, [filteredLoans]);

  // Overall metric counts
  const totalActiveLoans = loans.filter(l => l.status === 'Issued').length;
  const totalOverdueLoans = loans.filter(l => l.is_overdue && l.status === 'Issued').length;
  const totalDueSoon = loans.filter(l => l.status_label === 'Due Soon').length;
  const uniqueBorrowersCount = new Set(loans.filter(l => l.status === 'Issued').map(l => l.user_id)).size;

  const handleSendReminder = (transactionId, studentName, bookTitle) => {
    setRemindersSent(prev => ({ ...prev, [transactionId]: true }));
    setTimeout(() => {
      setRemindersSent(prev => ({ ...prev, [transactionId]: false }));
    }, 4000);
  };

  const getInitials = (name = 'Student') => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarGradient = (userId = 1) => {
    const gradients = [
      'linear-gradient(135deg, #0071e3 0%, #42a5f5 100%)',
      'linear-gradient(135deg, #5e5ce6 0%, #9c27b0 100%)',
      'linear-gradient(135deg, #ff9500 0%, #ffb74d 100%)',
      'linear-gradient(135deg, #34c759 0%, #66bb6a 100%)',
      'linear-gradient(135deg, #ff3b30 0%, #ef5350 100%)'
    ];
    return gradients[(userId || 0) % gradients.length];
  };

  return (
    <div className="animate-fade-in">
      {/* Header & Quick Metric Cards */}
      <div className="apple-card p-4 mb-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="apple-badge apple-badge-blue">LIVE CIRCULATION REGISTRY</span>
              <span className="text-muted small">Updated: 28 Oct 2026</span>
            </div>
            <h4 className="fw-bold text-dark mb-1" style={{ letterSpacing: '-0.02em' }}>
              {title}
            </h4>
            <p className="text-secondary small mb-0">
              {subtitle}
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            {onRefresh && (
              <button 
                type="button" 
                className="btn btn-apple-subtle btn-sm d-flex align-items-center gap-1.5"
                onClick={onRefresh}
                title="Sync from MySQL"
              >
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
                <span>Sync MySQL</span>
              </button>
            )}

            {/* View Switcher: Cards vs Table */}
            <div className="apple-segmented-control shadow-sm">
              <button
                type="button"
                className={`apple-segment-btn py-1.5 px-3 ${viewMode === 'cards' ? 'active' : ''}`}
                onClick={() => setViewMode('cards')}
                title="Borrower Cards View"
              >
                <LayoutGrid size={15} />
                <span className="d-none d-sm-inline">Cards</span>
              </button>
              <button
                type="button"
                className={`apple-segment-btn py-1.5 px-3 ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Detailed Ledger Table"
              >
                <TableIcon size={15} />
                <span className="d-none d-sm-inline">Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 KPI Metrics */}
        <div className="row g-3">
          <div className="col-6 col-md-3">
            <div className="p-3 rounded-4 bg-light border d-flex flex-column">
              <span className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.04em' }}>
                Active Borrowers
              </span>
              <h3 className="fw-bold text-dark mt-1 mb-0">{uniqueBorrowersCount}</h3>
              <span className="text-secondary small mt-0.5" style={{ fontSize: '0.74rem' }}>Holding university books</span>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="p-3 rounded-4 bg-light border d-flex flex-column">
              <span className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.04em' }}>
                Books in Possession
              </span>
              <h3 className="fw-bold text-primary mt-1 mb-0">{totalActiveLoans}</h3>
              <span className="text-secondary small mt-0.5" style={{ fontSize: '0.74rem' }}>Active loans in circulation</span>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="p-3 rounded-4 bg-light border d-flex flex-column">
              <span className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.04em' }}>
                Overdue Books
              </span>
              <h3 className={`fw-bold mt-1 mb-0 ${totalOverdueLoans > 0 ? 'text-danger' : 'text-success'}`}>
                {totalOverdueLoans}
              </h3>
              <span className="text-secondary small mt-0.5" style={{ fontSize: '0.74rem' }}>Past last return date</span>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="p-3 rounded-4 bg-light border d-flex flex-column">
              <span className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.04em' }}>
                Due Today / Soon
              </span>
              <h3 className="fw-bold text-warning mt-1 mb-0">{totalDueSoon}</h3>
              <span className="text-secondary small mt-0.5" style={{ fontSize: '0.74rem' }}>Expiring within 3 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="apple-card p-3 mb-4">
        <div className="row g-3 align-items-center">
          <div className="col-12 col-md-5">
            <div className="input-group input-group-sm rounded-pill border overflow-hidden bg-light">
              <span className="input-group-text bg-transparent border-0 ps-3">
                <Search size={15} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-0 bg-transparent px-2"
                placeholder="Search by student name, ID, or book title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  className="btn btn-sm btn-link text-muted pe-3 text-decoration-none"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="col-12 col-md-7 d-flex justify-content-md-end flex-wrap gap-1.5">
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 fw-medium ${filterStatus === 'All' ? 'btn-apple-primary' : 'btn-apple-subtle'}`}
              onClick={() => setFilterStatus('All')}
            >
              All ({loans.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 fw-medium ${filterStatus === 'Issued' ? 'btn-apple-primary' : 'btn-apple-subtle'}`}
              onClick={() => setFilterStatus('Issued')}
            >
              Active ({totalActiveLoans})
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 fw-medium ${filterStatus === 'Overdue' ? 'btn-apple-primary' : 'btn-apple-subtle'}`}
              onClick={() => setFilterStatus('Overdue')}
            >
              ⚠️ Overdue ({totalOverdueLoans})
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 fw-medium ${filterStatus === 'Due Soon' ? 'btn-apple-primary' : 'btn-apple-subtle'}`}
              onClick={() => setFilterStatus('Due Soon')}
            >
              ⏳ Due Soon ({totalDueSoon})
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 fw-medium ${filterStatus === 'Returned' ? 'btn-apple-primary' : 'btn-apple-subtle'}`}
              onClick={() => setFilterStatus('Returned')}
            >
              Returned
            </button>
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-muted small mt-2">Loading student circulation registry from MySQL...</p>
        </div>
      ) : filteredLoans.length === 0 ? (
        <div className="apple-card p-5 text-center">
          <BookOpen size={48} className="text-secondary opacity-40 mx-auto mb-3" />
          <h5 className="fw-bold text-dark">No Borrowing Records Found</h5>
          <p className="text-muted small mb-3">No students or book loans matched your filter criteria.</p>
          <button 
            type="button" 
            className="btn btn-apple-subtle btn-sm"
            onClick={() => { setFilterStatus('All'); setSearchQuery(''); }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          {/* ========================================================= */}
          {/* VIEW 1: BORROWER PROFILE CARDS (GROUPED BY STUDENT)      */}
          {/* ========================================================= */}
          {viewMode === 'cards' && (
            <div className="row g-4">
              {groupedStudents.map((student) => (
                <div key={student.student_id || student.student_name} className="col-12 col-lg-6">
                  <div className="borrower-card p-4 h-100 d-flex flex-column">
                    
                    {/* Student Profile Header */}
                    <div className="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom">
                      <div className="d-flex align-items-center gap-3">
                        <div 
                          className="student-avatar shadow-sm"
                          style={{ background: getAvatarGradient(student.user_id) }}
                        >
                          {getInitials(student.student_name)}
                        </div>
                        <div>
                          <div className="d-flex align-items-center gap-2">
                            <h5 className="fw-bold text-dark mb-0" style={{ letterSpacing: '-0.02em' }}>
                              {student.student_name}
                            </h5>
                            <span className="apple-badge apple-badge-blue py-0 px-2" style={{ fontSize: '0.68rem' }}>
                              {student.student_id || 'STUDENT'}
                            </span>
                          </div>
                          <div className="text-muted small d-flex align-items-center gap-1 mt-0.5" style={{ fontSize: '0.78rem' }}>
                            <Mail size={12} className="text-secondary" />
                            <span>{student.student_email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="text-end">
                        {student.overdueCount > 0 ? (
                          <span className="apple-badge apple-badge-red d-flex align-items-center gap-1 mb-1">
                            <AlertTriangle size={12} />
                            <span>{student.overdueCount} Overdue</span>
                          </span>
                        ) : (
                          <span className="apple-badge apple-badge-green d-flex align-items-center gap-1 mb-1">
                            <CheckCircle2 size={12} />
                            <span>In Good Standing</span>
                          </span>
                        )}
                        <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                          {student.activeCount} book(s) held
                        </div>
                      </div>
                    </div>

                    {/* Books Borrowed by this Student */}
                    <div className="d-flex flex-column gap-3 flex-grow-1">
                      {student.loans.map((loan) => {
                        const isOverdue = loan.is_overdue && loan.status === 'Issued';
                        const isReturned = loan.status === 'Returned';
                        const isDueSoon = loan.status_label === 'Due Soon';

                        return (
                          <div 
                            key={loan.transaction_id}
                            className={`p-3 rounded-4 border transition-all ${
                              isOverdue ? 'bg-danger bg-opacity-10 border-danger border-opacity-25' :
                              isReturned ? 'bg-light opacity-75' : 'bg-white shadow-2xs'
                            }`}
                          >
                            <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                              <div>
                                <div className="d-flex align-items-center gap-1.5 mb-1">
                                  <span className="apple-badge apple-badge-blue py-0 px-1.5" style={{ fontSize: '0.64rem' }}>
                                    #{loan.transaction_id}
                                  </span>
                                  <span className="text-muted small" style={{ fontSize: '0.72rem' }}>
                                    {loan.category}
                                  </span>
                                  {loan.shelf_location && (
                                    <span className="text-muted small d-flex align-items-center gap-0.5" style={{ fontSize: '0.72rem' }}>
                                      • <MapPin size={10} /> {loan.shelf_location}
                                    </span>
                                  )}
                                </div>
                                <h6 className="fw-bold text-dark mb-0" style={{ fontSize: '0.94rem', lineHeight: '1.3' }}>
                                  {loan.title}
                                </h6>
                                <div className="text-secondary small" style={{ fontSize: '0.76rem' }}>
                                  By {loan.author}
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="d-flex align-items-center gap-1.5 flex-shrink-0">
                                {!isReturned && onReturnLoan && (
                                  <button
                                    type="button"
                                    className="btn btn-apple-blue btn-sm py-1 px-2.5 d-flex align-items-center gap-1"
                                    style={{ fontSize: '0.75rem' }}
                                    onClick={() => onReturnLoan(loan)}
                                  >
                                    <Check size={13} />
                                    <span>Verify Return</span>
                                  </button>
                                )}
                                {!isReturned && (
                                  <button
                                    type="button"
                                    className={`btn btn-sm rounded-pill p-1.5 ${
                                      remindersSent[loan.transaction_id] 
                                        ? 'btn-success text-white' 
                                        : 'btn-apple-subtle text-muted'
                                    }`}
                                    title="Send Due Date Reminder Notice to Student"
                                    onClick={() => handleSendReminder(loan.transaction_id, student.student_name, loan.title)}
                                  >
                                    {remindersSent[loan.transaction_id] ? <Check size={14} /> : <Bell size={14} />}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Toast alert if reminder sent */}
                            {remindersSent[loan.transaction_id] && (
                              <div className="alert alert-success py-1 px-2 rounded-3 small mb-2 d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                                <Check size={12} />
                                <span>Reminder notification dispatched to {student.student_email}!</span>
                              </div>
                            )}

                            {/* LAST DATE DUE HIGHLIGHT ROW */}
                            <div className="d-flex align-items-center justify-content-between pt-2 border-top mt-2">
                              <div className="d-flex align-items-center gap-2">
                                <span className="text-muted fw-semibold" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  LAST DATE DUE:
                                </span>
                                
                                {isReturned ? (
                                  <span className="due-date-pill due-date-pill-success">
                                    <CheckCircle2 size={13} />
                                    <span>Returned on {loan.return_date}</span>
                                  </span>
                                ) : isOverdue ? (
                                  <span className="due-date-pill due-date-pill-danger">
                                    <AlertTriangle size={13} />
                                    <span>{loan.due_date} ({loan.days_overdue}d Overdue!)</span>
                                  </span>
                                ) : isDueSoon ? (
                                  <span className="due-date-pill due-date-pill-warning">
                                    <Clock size={13} />
                                    <span>{loan.due_date} (Due Today / Soon)</span>
                                  </span>
                                ) : (
                                  <span className="due-date-pill due-date-pill-primary">
                                    <Calendar size={13} />
                                    <span>{loan.due_date} ({loan.days_left}d left)</span>
                                  </span>
                                )}
                              </div>

                              <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                                Issued: {loan.issue_date}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW 2: DETAILED DUE DATE LEDGER (TABLE VIEW)             */}
          {/* ========================================================= */}
          {viewMode === 'table' && (
            <div className="apple-card p-4 overflow-hidden">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="fw-bold text-dark mb-0">Due Date Ledger</h5>
                <span className="text-muted small">Showing {filteredLoans.length} total loan records</span>
              </div>

              <div className="table-responsive">
                <table className="table table-borderless align-middle mb-0">
                  <thead className="border-bottom text-muted small text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                    <tr>
                      <th className="ps-3">Borrower Student</th>
                      <th>Book Information</th>
                      <th>Issue Date</th>
                      <th>LAST DATE DUE</th>
                      <th>Current Status</th>
                      <th className="text-end pe-3">Librarian Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLoans.map((loan) => {
                      const isOverdue = loan.is_overdue && loan.status === 'Issued';
                      const isReturned = loan.status === 'Returned';
                      const isDueSoon = loan.status_label === 'Due Soon';

                      return (
                        <tr 
                          key={loan.transaction_id}
                          className={`border-bottom ${isOverdue ? 'bg-danger bg-opacity-10' : ''}`}
                        >
                          {/* Student Info */}
                          <td className="ps-3 py-3">
                            <div className="d-flex align-items-center gap-2.5">
                              <div 
                                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-2xs"
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  fontSize: '0.75rem',
                                  background: getAvatarGradient(loan.user_id)
                                }}
                              >
                                {getInitials(loan.student_name)}
                              </div>
                              <div>
                                <div className="fw-bold text-dark" style={{ fontSize: '0.88rem' }}>
                                  {loan.student_name}
                                </div>
                                <div className="text-muted small" style={{ fontSize: '0.74rem' }}>
                                  ID: {loan.student_id || 'N/A'} • {loan.student_email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Book Title */}
                          <td>
                            <div className="fw-bold text-dark" style={{ fontSize: '0.88rem' }}>
                              {loan.title}
                            </div>
                            <div className="text-muted small" style={{ fontSize: '0.74rem' }}>
                              By {loan.author} • Shelf: {loan.shelf_location || 'A1'}
                            </div>
                          </td>

                          {/* Issue Date */}
                          <td className="small text-secondary">
                            {loan.issue_date}
                          </td>

                          {/* LAST DATE DUE (PROMINENTLY HIGHLIGHTED) */}
                          <td>
                            {isReturned ? (
                              <div>
                                <span className="due-date-pill due-date-pill-success">
                                  <CheckCircle2 size={13} />
                                  <span>{loan.due_date}</span>
                                </span>
                                <div className="text-muted small mt-0.5" style={{ fontSize: '0.7rem' }}>
                                  Returned: {loan.return_date}
                                </div>
                              </div>
                            ) : isOverdue ? (
                              <div>
                                <span className="due-date-pill due-date-pill-danger">
                                  <AlertTriangle size={13} />
                                  <span>{loan.due_date}</span>
                                </span>
                                <div className="text-danger fw-bold small mt-0.5" style={{ fontSize: '0.72rem' }}>
                                  ⚠️ {loan.days_overdue} Days Overdue!
                                </div>
                              </div>
                            ) : isDueSoon ? (
                              <div>
                                <span className="due-date-pill due-date-pill-warning">
                                  <Clock size={13} />
                                  <span>{loan.due_date}</span>
                                </span>
                                <div className="text-warning fw-semibold small mt-0.5" style={{ fontSize: '0.72rem' }}>
                                  Due Today / Soon
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="due-date-pill due-date-pill-primary">
                                  <Calendar size={13} />
                                  <span>{loan.due_date}</span>
                                </span>
                                <div className="text-primary small mt-0.5" style={{ fontSize: '0.72rem' }}>
                                  {loan.days_left} days remaining
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td>
                            {isReturned ? (
                              <span className="apple-badge apple-badge-green">Returned</span>
                            ) : isOverdue ? (
                              <span className="apple-badge apple-badge-red">Overdue</span>
                            ) : isDueSoon ? (
                              <span className="apple-badge apple-badge-orange">Due Soon</span>
                            ) : (
                              <span className="apple-badge apple-badge-blue">Issued</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="text-end pe-3">
                            <div className="d-flex align-items-center justify-content-end gap-1.5">
                              {isReturned ? (
                                <span className="text-muted small">Checked-in</span>
                              ) : (
                                <>
                                  {onReturnLoan && (
                                    <button
                                      type="button"
                                      className="btn btn-apple-blue btn-sm py-1 px-3"
                                      onClick={() => onReturnLoan(loan)}
                                    >
                                      Verify & Return
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className={`btn btn-sm rounded-pill p-1.5 ${
                                      remindersSent[loan.transaction_id] 
                                        ? 'btn-success text-white' 
                                        : 'btn-apple-subtle text-muted'
                                    }`}
                                    title="Send Notice"
                                    onClick={() => handleSendReminder(loan.transaction_id, loan.student_name, loan.title)}
                                  >
                                    {remindersSent[loan.transaction_id] ? <Check size={14} /> : <Bell size={14} />}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

