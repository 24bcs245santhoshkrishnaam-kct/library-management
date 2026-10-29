import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getAllLoans, 
  returnBookLoan, 
  issueBookLoan, 
  getRegisteredStudents, 
  getBooks,
  createBook,
  updateBook,
  deleteBook,
  previewOverdueSMS,
  sendOverdueSMS,
  sendBulkOverdueSMS,
  getSMSLogs,
  getDepartments,
  updateLoanDetails
} from '../services/api';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Send, 
  Clock, 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  User, 
  Calendar, 
  Layers, 
  Edit2, 
  Trash2, 
  RefreshCw,
  LogOut,
  X,
  MessageSquare,
  Building2,
  CheckCircle,
  FileText
} from 'lucide-react';

export default function LibrarianDashboard() {
  const { user, logout } = useAuth();

  // Navigation tab: 'overdue' | 'circulation' | 'inventory' | 'sms_logs'
  const [activeTab, setActiveTab] = useState('overdue');

  // Loans state
  const [loans, setLoans] = useState([]);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [overdueFilter, setOverdueFilter] = useState('all'); // 'all', '1d', '2-7d', '8-14d', '15+d', 'sms_not_sent'
  const [selectedDept, setSelectedDept] = useState('All');
  const [departments, setDepartments] = useState(['All']);
  const [searchQuery, setSearchQuery] = useState('');

  // Notification toast
  const [toast, setToast] = useState(null);

  // SMS Single Modal State
  const [smsModalLoan, setSmsModalLoan] = useState(null);
  const [smsPreviewMessage, setSmsPreviewMessage] = useState('');
  const [sendingSMS, setSendingSMS] = useState(false);

  // Bulk SMS Modal State
  const [showBulkSMSModal, setShowBulkSMSModal] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);

  // Issue Book Modal State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [studentsList, setStudentsList] = useState([]);
  const [availableBooks, setAvailableBooks] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [customDueDate, setCustomDueDate] = useState('2026-11-11');
  const [submittingIssue, setSubmittingIssue] = useState(false);

  // Inventory State
  const [inventoryBooks, setInventoryBooks] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    department: 'CSE',
    category: 'Programming',
    isbn: '',
    description: '',
    total_copies: 5,
    shelf_location: 'A1-01',
    published_year: 2024
  });

  // SMS Logs State
  const [smsLogs, setSmsLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Edit Loan Details State
  const [editingLoan, setEditingLoan] = useState(null);
  const [loanEditForm, setLoanEditForm] = useState({
    due_date: '',
    fine_amount: 0,
    status: 'Issued',
    notes: ''
  });
  const [savingLoan, setSavingLoan] = useState(false);

  // Circulation Filter State: 'all' | 'active_overdue' | 'active_unoverdue' | 'returned_unoverdue' | 'returned_overdue'
  const [circulationFilter, setCirculationFilter] = useState('all');

  const fetchLoans = async () => {
    setLoadingLoans(true);
    try {
      const data = await getAllLoans({
        status: activeTab === 'overdue' ? 'Issued' : undefined,
        overdueFilter: overdueFilter !== 'all' ? overdueFilter : undefined,
        department: selectedDept !== 'All' ? selectedDept : undefined,
        search: searchQuery.trim() || undefined
      });
      setLoans(data.loans || []);
    } catch (err) {
      console.error('Failed to load loans:', err);
    } finally {
      setLoadingLoans(false);
    }
  };

  const fetchInventory = async () => {
    setLoadingInventory(true);
    try {
      const res = await getBooks({
        query: searchQuery.trim() || undefined,
        department: selectedDept !== 'All' ? selectedDept : undefined
      });
      setInventoryBooks(res.books || []);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoadingInventory(false);
    }
  };

  const fetchDepts = async () => {
    try {
      const res = await getDepartments();
      if (res.departments) {
        setDepartments(['All', ...res.departments]);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchInventory();
    } else if (activeTab === 'sms_logs') {
      setLoadingLogs(true);
      getSMSLogs().then(res => setSmsLogs(res.logs || [])).finally(() => setLoadingLogs(false));
    } else {
      fetchLoans();
    }
  }, [activeTab, overdueFilter, selectedDept, searchQuery]);

  // Separate overdue loans and active on-schedule loans
  const overdueLoansList = loans.filter(l => l.is_overdue && l.status === 'Issued');

  // Handle Mark As Returned Action
  const handleReturn = async (loanId, title) => {
    try {
      const res = await returnBookLoan(loanId);
      setToast({
        type: 'success',
        message: res.message || `Book "${title}" marked as Returned! Inventory restored.`
      });
      await fetchLoans();
    } catch (err) {
      setToast({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to process return'
      });
    }
  };

  // Open Single SMS Modal
  const openSingleSMSModal = async (loan) => {
    setSmsModalLoan(loan);
    try {
      const res = await previewOverdueSMS(loan.transaction_id);
      setSmsPreviewMessage(res.message);
    } catch (e) {
      setSmsPreviewMessage(`Dear ${loan.student_name}, the book '${loan.title}' was due on ${loan.due_date} and is now ${loan.days_overdue} day(s) overdue. Please return it to the central library immediately.`);
    }
  };

  // Send Single SMS
  const handleSendSingleSMS = async () => {
    if (!smsModalLoan) return;
    setSendingSMS(true);
    try {
      const res = await sendOverdueSMS(smsModalLoan.transaction_id, smsPreviewMessage);
      setToast({
        type: 'success',
        message: res.message || `SMS Reminder sent to ${smsModalLoan.student_name} (${smsModalLoan.student_contact})!`
      });
      setSmsModalLoan(null);
      await fetchLoans();
    } catch (err) {
      setToast({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to send SMS'
      });
    } finally {
      setSendingSMS(false);
    }
  };

  // Send Bulk SMS
  const handleSendBulkSMS = async () => {
    setBulkSending(true);
    try {
      const loanIds = overdueLoansList.map(l => l.transaction_id);
      const res = await sendBulkOverdueSMS(loanIds);
      setToast({
        type: 'success',
        message: res.message || `Bulk SMS dispatched to ${res.sentCount} overdue borrowers!`
      });
      setShowBulkSMSModal(false);
      await fetchLoans();
    } catch (err) {
      setToast({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to send bulk SMS'
      });
    } finally {
      setBulkSending(false);
    }
  };

  // Open Edit Loan Details Modal
  const handleOpenEditLoan = (loan) => {
    setEditingLoan(loan);
    setLoanEditForm({
      due_date: loan.due_date || '',
      fine_amount: loan.fine_amount || loan.accrued_fine || 0,
      status: loan.status || 'Issued',
      notes: loan.notes || ''
    });
  };

  // Save Loan Details
  const handleSaveLoanDetails = async (e) => {
    e.preventDefault();
    if (!editingLoan) return;
    setSavingLoan(true);
    try {
      await updateLoanDetails(editingLoan.transaction_id, loanEditForm);
      setToast({
        type: 'success',
        message: `Transaction #${editingLoan.transaction_id} information details updated successfully.`
      });
      setEditingLoan(null);
      await fetchLoans();
    } catch (err) {
      setToast({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to update loan information'
      });
    } finally {
      setSavingLoan(false);
    }
  };

  // Open Issue Book Modal
  const openIssueModal = async () => {
    setShowIssueModal(true);
    try {
      const [stuRes, bookRes] = await Promise.all([
        getRegisteredStudents(),
        getBooks({ available: 'true' })
      ]);
      setStudentsList(stuRes.students || []);
      setAvailableBooks(bookRes.books || []);
      if (stuRes.students && stuRes.students.length > 0) setSelectedStudentId(stuRes.students[0].id);
      if (bookRes.books && bookRes.books.length > 0) setSelectedBookId(bookRes.books[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Issue Book Submit
  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    setSubmittingIssue(true);
    try {
      const res = await issueBookLoan({
        bookId: selectedBookId,
        studentUserId: selectedStudentId,
        dueDate: customDueDate
      });
      setToast({
        type: 'success',
        message: res.message || 'Book issued successfully to student!'
      });
      setShowIssueModal(false);
      await fetchLoans();
    } catch (err) {
      setToast({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to issue book'
      });
    } finally {
      setSubmittingIssue(false);
    }
  };

  // Save Book (Add or Edit)
  const handleSaveBook = async (e) => {
    e.preventDefault();
    try {
      if (editingBook) {
        await updateBook(editingBook.id, bookForm);
        setToast({ type: 'success', message: `Book "${bookForm.title}" updated successfully.` });
      } else {
        await createBook(bookForm);
        setToast({ type: 'success', message: `Book "${bookForm.title}" added to catalogue.` });
      }
      setShowAddBookModal(false);
      setEditingBook(null);
      await fetchInventory();
    } catch (err) {
      setToast({ type: 'danger', message: err.response?.data?.message || 'Failed to save book' });
    }
  };

  const handleDeleteBook = async (id, title) => {
    if (!window.confirm(`Are you sure you want to remove "${title}" from the library?`)) return;
    try {
      await deleteBook(id);
      setToast({ type: 'success', message: `Book removed successfully.` });
      await fetchInventory();
    } catch (err) {
      setToast({ type: 'danger', message: err.response?.data?.message || 'Failed to delete book' });
    }
  };

  return (
    <div className="portal-layout">
      {/* Librarian Sidebar */}
      <aside className="portal-sidebar">
        <div className="portal-sidebar-header">
          <div 
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0d9488 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ShieldCheck size={22} className="text-white" />
          </div>
          <div>
            <h6 className="fw-bold mb-0 text-navy-900" style={{ fontSize: '0.94rem' }}>Smart Library</h6>
            <span className="text-muted" style={{ fontSize: '0.72rem' }}>Librarian Circulation</span>
          </div>
        </div>

        <nav className="portal-sidebar-nav">
          {/* Overdue Tracker Tab — FIRST & PRIORITY */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === 'overdue' ? 'active' : ''}`}
            onClick={() => { setActiveTab('overdue'); setOverdueFilter('all'); }}
          >
            <AlertTriangle size={18} className="text-danger" />
            <span>Overdue Tracker</span>
            {overdueLoansList.length > 0 && (
              <span className="badge bg-danger ms-auto rounded-pill px-2">
                {overdueLoansList.length}
              </span>
            )}
          </button>

          {/* All Circulation Loans */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === 'circulation' ? 'active' : ''}`}
            onClick={() => setActiveTab('circulation')}
          >
            <BookOpen size={18} />
            <span>All Circulation Loans</span>
          </button>

          {/* Book Inventory Management */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <Layers size={18} />
            <span>Book Inventory</span>
          </button>

          {/* SMS Notification Logs */}
          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === 'sms_logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('sms_logs')}
          >
            <MessageSquare size={18} />
            <span>SMS Alert History</span>
          </button>
        </nav>

        <div className="portal-sidebar-footer">
          <div className="d-flex align-items-center gap-2 mb-3">
            <div 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#ffedd5',
                color: '#c2410c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}
            >
              L
            </div>
            <div className="overflow-hidden">
              <div className="fw-semibold text-navy-900 text-truncate" style={{ fontSize: '0.82rem' }}>
                {user?.name || 'Mr. Shankar'}
              </div>
              <div className="text-muted text-truncate" style={{ fontSize: '0.7rem' }}>
                Head Librarian
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-1.5"
            onClick={logout}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="portal-content">
        <header className="portal-topbar">
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-danger-subtle text-danger px-2.5 py-1 rounded-pill small fw-semibold">
              Librarian Portal
            </span>
            <span className="text-muted small">
              Circulation Desk • System Date: <strong>28 Oct 2026</strong>
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-navy btn-sm"
              onClick={openIssueModal}
            >
              <Plus size={16} />
              <span>Issue New Book</span>
            </button>
          </div>
        </header>

        {/* Toast Alert */}
        {toast && (
          <div className="px-4 pt-3">
            <div className={`alert alert-${toast.type} alert-dismissible fade show rounded-3 py-2.5 px-3 small d-flex align-items-center gap-2 shadow-sm mb-0`}>
              {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{toast.message}</span>
              <button type="button" className="btn-close py-2" onClick={() => setToast(null)}></button>
            </div>
          </div>
        )}

        <div className="portal-main-body">

          {/* ==============================================================
              VIEW 1: OVERDUE TRACKER (PRIORITY SECTION AT TOP WITH RED BADGE)
             ============================================================== */}
          {activeTab === 'overdue' && (
            <div>
              {/* Overdue Priority Header Banner */}
              <div className="overdue-priority-banner d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div 
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: '#dc2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff'
                    }}
                  >
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <h4 className="fw-bold text-navy-900 mb-0" style={{ letterSpacing: '-0.02em' }}>
                        Overdue Circulation Monitor
                      </h4>
                      <span className="badge bg-danger px-3 py-1 rounded-pill fw-bold">
                        {overdueLoansList.length} Overdue Books
                      </span>
                    </div>
                    <p className="text-secondary small mb-0 mt-1">
                      Sorted strictly by: <strong>1) Highest number of overdue days first</strong>, <strong>2) Earliest due date next</strong>. Color-coded by urgency.
                    </p>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-danger btn-sm d-flex align-items-center gap-1.5 shadow-sm"
                    disabled={overdueLoansList.length === 0}
                    onClick={() => setShowBulkSMSModal(true)}
                  >
                    <Send size={15} />
                    <span>Send All Overdue SMS Reminders ({overdueLoansList.length})</span>
                  </button>
                </div>
              </div>

              {/* Overdue Filter Pills */}
              <div className="d-flex align-items-center gap-2 overflow-auto pb-2 mb-3">
                <span className="small text-muted fw-semibold me-1 d-flex align-items-center gap-1">
                  <Filter size={14} /> Filter:
                </span>
                <button
                  type="button"
                  className={`filter-pill ${overdueFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setOverdueFilter('all')}
                >
                  All Overdue ({overdueLoansList.length})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${overdueFilter === '1d' ? 'active' : ''}`}
                  onClick={() => setOverdueFilter('1d')}
                >
                  1 Day Overdue
                </button>
                <button
                  type="button"
                  className={`filter-pill ${overdueFilter === '2-7d' ? 'active' : ''}`}
                  onClick={() => setOverdueFilter('2-7d')}
                >
                  2 - 7 Days
                </button>
                <button
                  type="button"
                  className={`filter-pill ${overdueFilter === '8-14d' ? 'active' : ''}`}
                  onClick={() => setOverdueFilter('8-14d')}
                >
                  8 - 14 Days
                </button>
                <button
                  type="button"
                  className={`filter-pill ${overdueFilter === '15+d' ? 'active' : ''}`}
                  onClick={() => setOverdueFilter('15+d')}
                >
                  15+ Days Critical
                </button>
                <button
                  type="button"
                  className={`filter-pill ${overdueFilter === 'sms_not_sent' ? 'active' : ''}`}
                  onClick={() => setOverdueFilter('sms_not_sent')}
                >
                  SMS Not Sent
                </button>
              </div>

              {/* Overdue Table */}
              {loadingLoans ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-danger" role="status"></div>
                  <div className="mt-2 text-muted small">Loading prioritized overdue books...</div>
                </div>
              ) : overdueLoansList.length === 0 ? (
                <div className="text-center py-5 bg-white rounded-4 border">
                  <CheckCircle size={40} className="text-success mb-2 opacity-60" />
                  <h6 className="fw-bold text-navy-900 mb-1">No Overdue Books!</h6>
                  <p className="text-muted small">All active student loans are currently within their due dates.</p>
                </div>
              ) : (
                <div className="table-responsive bg-white rounded-4 border shadow-xs">
                  <table className="table-clean">
                    <thead>
                      <tr>
                        <th>Student Information</th>
                        <th>Book Title</th>
                        <th>Due Date</th>
                        <th>Overdue Status</th>
                        <th>Accrued Fine</th>
                        <th>SMS Alert</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueLoansList.map(loan => (
                        <tr key={loan.transaction_id}>
                          {/* Student Details */}
                          <td>
                            <div className="fw-bold text-navy-900">{loan.student_name}</div>
                            <div className="text-muted" style={{ fontSize: '0.74rem' }}>
                              Roll: <strong>{loan.student_id || 'N/A'}</strong> • Dept: {loan.student_department || 'CSE'}
                            </div>
                            <div className="text-secondary small d-flex align-items-center gap-1 mt-0.5">
                              <Phone size={12} className="text-teal-600" />
                              <span>{loan.student_contact || '+91 98765 43210'}</span>
                            </div>
                          </td>

                          {/* Book Title */}
                          <td>
                            <div className="fw-semibold text-navy-900">{loan.title}</div>
                            <div className="text-muted" style={{ fontSize: '0.74rem' }}>
                              {loan.author} • Shelf: {loan.shelf_location || 'A1'}
                            </div>
                          </td>

                          {/* Due Date */}
                          <td>
                            <strong className="text-danger">{loan.due_date}</strong>
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>Issued: {loan.issue_date}</div>
                          </td>

                          {/* Overdue Days Badge with Color Coding */}
                          <td>
                            <span className={`badge-overdue badge-overdue-${loan.overdue_color}`}>
                              {loan.days_overdue} Day(s) Overdue
                            </span>
                          </td>

                          {/* Fine ($5.00/day) */}
                          <td>
                            <strong className="text-danger">${loan.accrued_fine.toFixed(2)}</strong>
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>($5.00/day)</div>
                          </td>

                          {/* SMS Status */}
                          <td>
                            {loan.sms_status === 'Sent' ? (
                              <span className="badge bg-success-subtle text-success px-2 py-1 rounded-pill small">
                                Sent ({loan.sms_count || 1}x)
                              </span>
                            ) : (
                              <span className="badge bg-secondary-subtle text-muted px-2 py-1 rounded-pill small">
                                Not Sent
                              </span>
                            )}
                          </td>

                          {/* Actions: Send SMS, Edit Details & Return */}
                          <td>
                            <div className="d-flex align-items-center gap-1.5">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-teal d-flex align-items-center gap-1"
                                title="Send SMS Reminder"
                                onClick={() => openSingleSMSModal(loan)}
                              >
                                <Send size={13} />
                                <span>SMS</span>
                              </button>

                              <button
                                type="button"
                                className="btn btn-sm btn-light border p-1.5 text-secondary"
                                title="Edit Loan Information Details"
                                onClick={() => handleOpenEditLoan(loan)}
                              >
                                <Edit2 size={13} />
                              </button>

                              <button
                                type="button"
                                className="btn btn-sm btn-navy d-flex align-items-center gap-1"
                                onClick={() => handleReturn(loan.transaction_id, loan.title)}
                              >
                                <CheckCircle size={13} />
                                <span>Return</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ==============================================================
              VIEW 2: ALL CIRCULATION LOANS (WITH OVERDUE & UNOVERDUE STATUS)
             ============================================================== */}
          {activeTab === 'circulation' && (
            <div>
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
                <div>
                  <h3 className="fw-bold text-navy-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
                    All Circulation Records ({loans.length})
                  </h3>
                  <p className="text-secondary small mb-0">
                    Track <strong>Active Overdue</strong>, <strong>Active Unoverdue</strong>, <strong>Returned On-Time</strong>, and <strong>Returned Overdue</strong> records.
                  </p>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="text"
                    className="form-control form-control-sm rounded-pill px-3"
                    placeholder="Search student or book..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '220px' }}
                  />
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="d-flex align-items-center gap-2 overflow-auto pb-2 mb-3">
                <span className="small text-muted fw-semibold me-1 d-flex align-items-center gap-1">
                  <Filter size={14} /> Filter:
                </span>
                <button
                  type="button"
                  className={`filter-pill ${circulationFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setCirculationFilter('all')}
                >
                  All Loans ({loans.length})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${circulationFilter === 'active_overdue' ? 'active' : ''}`}
                  onClick={() => setCirculationFilter('active_overdue')}
                >
                  Active Overdue ({loans.filter(l => l.status === 'Issued' && l.is_overdue).length})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${circulationFilter === 'active_unoverdue' ? 'active' : ''}`}
                  onClick={() => setCirculationFilter('active_unoverdue')}
                >
                  Active Unoverdue ({loans.filter(l => l.status === 'Issued' && !l.is_overdue).length})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${circulationFilter === 'returned_unoverdue' ? 'active' : ''}`}
                  onClick={() => setCirculationFilter('returned_unoverdue')}
                >
                  Returned On-Time (Unoverdue)
                </button>
                <button
                  type="button"
                  className={`filter-pill ${circulationFilter === 'returned_overdue' ? 'active' : ''}`}
                  onClick={() => setCirculationFilter('returned_overdue')}
                >
                  Returned Overdue (Late)
                </button>
              </div>

              {loadingLoans ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-navy-900" role="status"></div>
                </div>
              ) : (
                <div className="table-responsive bg-white rounded-4 border shadow-xs">
                  <table className="table-clean">
                    <thead>
                      <tr>
                        <th>Tx ID</th>
                        <th>Student Borrower</th>
                        <th>Book Title</th>
                        <th>Issue Date</th>
                        <th>Due Date</th>
                        <th>Actual Return</th>
                        <th>Return Status & History</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loans
                        .filter(loan => {
                          if (circulationFilter === 'active_overdue') {
                            return loan.status === 'Issued' && loan.is_overdue;
                          }
                          if (circulationFilter === 'active_unoverdue') {
                            return loan.status === 'Issued' && !loan.is_overdue;
                          }
                          if (circulationFilter === 'returned_unoverdue') {
                            return loan.status === 'Returned' && (!loan.was_overdue && loan.status_label !== 'Returned Overdue');
                          }
                          if (circulationFilter === 'returned_overdue') {
                            return loan.status === 'Returned' && (loan.was_overdue || loan.status_label === 'Returned Overdue' || loan.days_late > 0);
                          }
                          return true;
                        })
                        .map(loan => {
                          const isReturned = loan.status === 'Returned' || Boolean(loan.return_date);
                          const isLateReturned = isReturned && (loan.was_overdue || loan.status_label === 'Returned Overdue' || loan.days_late > 0);

                          return (
                            <tr key={loan.transaction_id}>
                              <td><strong>#{loan.transaction_id}</strong></td>
                              <td>
                                <div className="fw-semibold text-navy-900">{loan.student_name}</div>
                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                  Roll: {loan.student_id} • Dept: {loan.student_department || 'CSE'}
                                </div>
                              </td>
                              <td>
                                <div className="fw-semibold text-navy-900">{loan.title}</div>
                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>{loan.author}</div>
                              </td>
                              <td>{loan.issue_date}</td>
                              <td><strong>{loan.due_date}</strong></td>
                              <td>
                                {loan.return_date ? (
                                  <strong className="text-teal-600">{loan.return_date}</strong>
                                ) : (
                                  <span className="text-muted small">Not Returned</span>
                                )}
                              </td>
                              <td>
                                {isReturned ? (
                                  isLateReturned ? (
                                    <span className="badge-overdue badge-overdue-darkorange">
                                      <AlertTriangle size={12} /> Returned Overdue ({loan.days_late || loan.days_overdue}d)
                                    </span>
                                  ) : (
                                    <span className="badge bg-success-subtle text-success px-2.5 py-1 rounded-pill small fw-semibold d-inline-flex align-items-center gap-1">
                                      <CheckCircle size={12} /> Returned On-Time (Unoverdue)
                                    </span>
                                  )
                                ) : loan.is_overdue ? (
                                  <span className={`badge-overdue badge-overdue-${loan.overdue_color}`}>
                                    Active Overdue ({loan.days_overdue}d)
                                  </span>
                                ) : (
                                  <span className="badge-issued-blue px-2.5 py-1 rounded-pill small">
                                    Active Unoverdue ({loan.days_left}d left)
                                  </span>
                                )}
                              </td>
                              <td>
                                <div className="d-flex align-items-center gap-1">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-light border p-1.5 text-secondary"
                                    title="Edit Loan Information Details"
                                    onClick={() => handleOpenEditLoan(loan)}
                                  >
                                    <Edit2 size={13} />
                                  </button>

                                  {loan.status === 'Issued' && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-navy rounded-pill py-1 px-2.5 small"
                                      onClick={() => handleReturn(loan.transaction_id, loan.title)}
                                    >
                                      Return
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ==============================================================
              VIEW 3: BOOK INVENTORY (Add, Edit, Delete Books)
             ============================================================== */}
          {activeTab === 'inventory' && (
            <div>
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
                <div>
                  <h3 className="fw-bold text-navy-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
                    Central Book Catalogue ({inventoryBooks.length} Books)
                  </h3>
                  <p className="text-secondary small mb-0">Manage physical copies, shelf locations, and book metadata.</p>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-teal btn-sm"
                    onClick={() => {
                      setEditingBook(null);
                      setBookForm({
                        title: '',
                        author: '',
                        department: 'CSE',
                        category: 'Programming',
                        isbn: '',
                        description: '',
                        total_copies: 5,
                        shelf_location: 'A1-01',
                        published_year: 2024
                      });
                      setShowAddBookModal(true);
                    }}
                  >
                    <Plus size={16} />
                    <span>Add New Book</span>
                  </button>
                </div>
              </div>

              {/* Department Filters */}
              <div className="d-flex align-items-center gap-2 overflow-auto pb-2 mb-3">
                {departments.map(dept => (
                  <button
                    key={dept}
                    type="button"
                    className={`filter-pill ${selectedDept === dept ? 'active' : ''}`}
                    onClick={() => setSelectedDept(dept)}
                  >
                    {dept}
                  </button>
                ))}
              </div>

              {loadingInventory ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-teal-600" role="status"></div>
                </div>
              ) : (
                <div className="table-responsive bg-white rounded-4 border shadow-xs">
                  <table className="table-clean">
                    <thead>
                      <tr>
                        <th>Book Cover & Title</th>
                        <th>Author</th>
                        <th>Department</th>
                        <th>Category</th>
                        <th>Copies</th>
                        <th>Shelf</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryBooks.slice(0, 50).map(b => (
                        <tr key={b.id}>
                          <td>
                            <div className="d-flex align-items-center gap-3">
                              <img
                                src={b.cover_image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=100&q=80'}
                                alt={b.title}
                                style={{ width: '38px', height: '48px', objectFit: 'cover', borderRadius: '4px' }}
                              />
                              <div>
                                <div className="fw-semibold text-navy-900">{b.title}</div>
                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>ISBN: {b.isbn || 'N/A'}</div>
                              </div>
                            </div>
                          </td>
                          <td>{b.author}</td>
                          <td><span className="badge-active-teal px-2 py-0.5 rounded-pill small">{b.department || 'CSE'}</span></td>
                          <td>{b.category}</td>
                          <td>
                            <strong className={b.available_copies > 0 ? 'text-teal-600' : 'text-danger'}>
                              {b.available_copies}
                            </strong> / {b.total_copies}
                          </td>
                          <td>{b.shelf_location || 'A1'}</td>
                          <td>
                            <div className="d-flex align-items-center gap-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-light border p-1.5"
                                title="Edit Book"
                                onClick={() => {
                                  setEditingBook(b);
                                  setBookForm({
                                    title: b.title,
                                    author: b.author,
                                    department: b.department,
                                    category: b.category,
                                    isbn: b.isbn || '',
                                    description: b.description || '',
                                    total_copies: b.total_copies,
                                    shelf_location: b.shelf_location || 'A1',
                                    published_year: b.published_year || 2024
                                  });
                                  setShowAddBookModal(true);
                                }}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-light border text-danger p-1.5"
                                title="Delete Book"
                                onClick={() => handleDeleteBook(b.id, b.title)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {inventoryBooks.length > 50 && (
                    <div className="p-3 text-center text-muted small border-top">
                      Showing first 50 of {inventoryBooks.length} books. Use the department filter above to navigate specific subjects.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==============================================================
              VIEW 4: SMS ALERT HISTORY
             ============================================================== */}
          {activeTab === 'sms_logs' && (
            <div>
              <div className="mb-4">
                <h3 className="fw-bold text-navy-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
                  SMS Overdue Alert History ({smsLogs.length} Dispatched)
                </h3>
                <p className="text-secondary small mb-0">Audit log of automated SMS reminders sent to students.</p>
              </div>

              {loadingLogs ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-navy-900" role="status"></div>
                </div>
              ) : smsLogs.length === 0 ? (
                <div className="text-center py-5 bg-white rounded-4 border">
                  <MessageSquare size={36} className="text-muted mb-2 opacity-50" />
                  <p className="text-muted small">No SMS alerts dispatched yet.</p>
                </div>
              ) : (
                <div className="table-responsive bg-white rounded-4 border shadow-xs">
                  <table className="table-clean">
                    <thead>
                      <tr>
                        <th>Recipient Student</th>
                        <th>Contact Number</th>
                        <th>Message Content</th>
                        <th>Status</th>
                        <th>Sent Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {smsLogs.map(log => (
                        <tr key={log.id}>
                          <td>
                            <div className="fw-semibold text-navy-900">{log.recipient_name || 'Student'}</div>
                          </td>
                          <td><code>{log.recipient_phone}</code></td>
                          <td style={{ maxWidth: '380px' }}>
                            <div className="text-secondary small leading-relaxed">{log.message}</div>
                          </td>
                          <td>
                            <span className="badge bg-success-subtle text-success px-2.5 py-1 rounded-pill small">
                              {log.status}
                            </span>
                          </td>
                          <td className="text-muted small">{log.created_at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Single SMS Reminder Modal */}
      {smsModalLoan && (
        <div className="modal-overlay" onClick={() => setSmsModalLoan(null)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="p-4 border-bottom d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <Send size={18} className="text-teal-600" />
                <h5 className="fw-bold text-navy-900 mb-0">Send SMS Reminder</h5>
              </div>
              <button type="button" className="btn-close" onClick={() => setSmsModalLoan(null)}></button>
            </div>

            <div className="p-4">
              <div className="p-3 mb-3 rounded-3 bg-light border small">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Recipient Student:</span>
                  <strong className="text-navy-900">{smsModalLoan.student_name}</strong>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Phone Number:</span>
                  <code>{smsModalLoan.student_contact || '+91 98765 43210'}</code>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Overdue Book:</span>
                  <span className="fw-semibold text-navy-900">{smsModalLoan.title}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Overdue Duration:</span>
                  <span className="text-danger fw-bold">{smsModalLoan.days_overdue} days</span>
                </div>
              </div>

              <label className="form-label small fw-semibold text-secondary">SMS Message Preview & Template:</label>
              <textarea
                className="form-control small mb-3"
                rows={4}
                value={smsPreviewMessage}
                onChange={e => setSmsPreviewMessage(e.target.value)}
              />

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => setSmsModalLoan(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-teal btn-sm d-flex align-items-center gap-1.5"
                  disabled={sendingSMS}
                  onClick={handleSendSingleSMS}
                >
                  {sendingSMS ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Send SMS Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk SMS Confirmation Modal */}
      {showBulkSMSModal && (
        <div className="modal-overlay" onClick={() => setShowBulkSMSModal(false)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="p-4 border-bottom d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <Send size={18} className="text-danger" />
                <h5 className="fw-bold text-navy-900 mb-0">Confirm Bulk SMS Dispatch</h5>
              </div>
              <button type="button" className="btn-close" onClick={() => setShowBulkSMSModal(false)}></button>
            </div>

            <div className="p-4">
              <p className="text-secondary small mb-3">
                You are about to dispatch automated SMS overdue reminders to all <strong>{overdueLoansList.length} overdue student borrowers</strong>:
              </p>

              <div className="p-3 bg-light rounded-3 border mb-3 small" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                {overdueLoansList.map(l => (
                  <div key={l.transaction_id} className="d-flex justify-content-between py-1 border-bottom">
                    <span>{l.student_name} ({l.student_id})</span>
                    <span className="text-danger fw-bold">{l.days_overdue}d overdue</span>
                  </div>
                ))}
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => setShowBulkSMSModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm d-flex align-items-center gap-1.5"
                  disabled={bulkSending}
                  onClick={handleSendBulkSMS}
                >
                  {bulkSending ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      <span>Sending Bulk SMS...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Dispatch All {overdueLoansList.length} SMS Reminders</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issue Book Modal */}
      {showIssueModal && (
        <div className="modal-overlay" onClick={() => setShowIssueModal(false)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="p-4 border-bottom d-flex align-items-center justify-content-between">
              <h5 className="fw-bold text-navy-900 mb-0">Issue Book to Student</h5>
              <button type="button" className="btn-close" onClick={() => setShowIssueModal(false)}></button>
            </div>

            <form onSubmit={handleIssueSubmit} className="p-4">
              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">Select Student Borrower:</label>
                <select
                  className="form-select small"
                  required
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                >
                  {studentsList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.student_id || s.username}) - {s.department || 'CSE'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">Select Book to Issue:</label>
                <select
                  className="form-select small"
                  required
                  value={selectedBookId}
                  onChange={e => setSelectedBookId(e.target.value)}
                >
                  {availableBooks.slice(0, 100).map(b => (
                    <option key={b.id} value={b.id}>
                      {b.title} (Available: {b.available_copies})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold text-secondary">Return Due Date:</label>
                <input
                  type="date"
                  className="form-control small"
                  required
                  value={customDueDate}
                  onChange={e => setCustomDueDate(e.target.value)}
                />
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => setShowIssueModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-navy btn-sm"
                  disabled={submittingIssue}
                >
                  {submittingIssue ? 'Issuing Book...' : 'Issue Book Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Book Modal */}
      {showAddBookModal && (
        <div className="modal-overlay" onClick={() => setShowAddBookModal(false)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="p-4 border-bottom d-flex align-items-center justify-content-between">
              <h5 className="fw-bold text-navy-900 mb-0">
                {editingBook ? 'Edit Book Details' : 'Add New Book to Catalog'}
              </h5>
              <button type="button" className="btn-close" onClick={() => setShowAddBookModal(false)}></button>
            </div>

            <form onSubmit={handleSaveBook} className="p-4">
              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">Book Title</label>
                <input
                  type="text"
                  className="form-control small"
                  required
                  value={bookForm.title}
                  onChange={e => setBookForm({ ...bookForm, title: e.target.value })}
                />
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold text-secondary">Author</label>
                  <input
                    type="text"
                    className="form-control small"
                    required
                    value={bookForm.author}
                    onChange={e => setBookForm({ ...bookForm, author: e.target.value })}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold text-secondary">Department</label>
                  <select
                    className="form-select small"
                    value={bookForm.department}
                    onChange={e => setBookForm({ ...bookForm, department: e.target.value })}
                  >
                    <option value="CSE">CSE</option>
                    <option value="AI AND MACHINE LEARNING">AI AND MACHINE LEARNING</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="MECHANICAL">MECHANICAL</option>
                    <option value="CIVIL & BASIC SCIENCES">CIVIL & BASIC SCIENCES</option>
                  </select>
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold text-secondary">Category</label>
                  <input
                    type="text"
                    className="form-control small"
                    required
                    value={bookForm.category}
                    onChange={e => setBookForm({ ...bookForm, category: e.target.value })}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold text-secondary">Total Physical Copies</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control small"
                    required
                    value={bookForm.total_copies}
                    onChange={e => setBookForm({ ...bookForm, total_copies: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold text-secondary">ISBN</label>
                  <input
                    type="text"
                    className="form-control small"
                    value={bookForm.isbn}
                    onChange={e => setBookForm({ ...bookForm, isbn: e.target.value })}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold text-secondary">Shelf Location</label>
                  <input
                    type="text"
                    className="form-control small"
                    value={bookForm.shelf_location}
                    onChange={e => setBookForm({ ...bookForm, shelf_location: e.target.value })}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold text-secondary">Description</label>
                <textarea
                  className="form-control small"
                  rows={3}
                  value={bookForm.description}
                  onChange={e => setBookForm({ ...bookForm, description: e.target.value })}
                />
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => setShowAddBookModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-teal btn-sm">
                  {editingBook ? 'Save Changes' : 'Add Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Loan Information Details Modal */}
      {editingLoan && (
        <div className="modal-overlay" onClick={() => setEditingLoan(null)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="p-4 border-bottom d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <Edit2 size={18} className="text-teal-600" />
                <h5 className="fw-bold text-navy-900 mb-0">Edit Loan Information Details</h5>
              </div>
              <button type="button" className="btn-close" onClick={() => setEditingLoan(null)}></button>
            </div>

            <form onSubmit={handleSaveLoanDetails} className="p-4">
              <div className="p-3 mb-3 rounded-3 bg-light border small">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Transaction ID:</span>
                  <strong className="text-navy-900">#{editingLoan.transaction_id}</strong>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Student Borrower:</span>
                  <span className="fw-semibold text-navy-900">{editingLoan.student_name} ({editingLoan.student_id})</span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Book Title:</span>
                  <span className="fw-semibold text-navy-900">{editingLoan.title}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Issued Date:</span>
                  <span>{editingLoan.issue_date}</span>
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold text-secondary">Return Due Date</label>
                  <input
                    type="date"
                    className="form-control small"
                    required
                    value={loanEditForm.due_date}
                    onChange={e => setLoanEditForm({ ...loanEditForm, due_date: e.target.value })}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold text-secondary">Accrued / Adjusted Fine ($)</label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    className="form-control small"
                    value={loanEditForm.fine_amount}
                    onChange={e => setLoanEditForm({ ...loanEditForm, fine_amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">Circulation Loan Status</label>
                <select
                  className="form-select small"
                  value={loanEditForm.status}
                  onChange={e => setLoanEditForm({ ...loanEditForm, status: e.target.value })}
                >
                  <option value="Issued">Issued (Active Loan)</option>
                  <option value="Returned">Returned (Back in Library Stacks)</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold text-secondary">Circulation Remarks & Notes</label>
                <textarea
                  className="form-control small"
                  rows={3}
                  placeholder="Reason for extension, condition upon check-in, fine waiver notes..."
                  value={loanEditForm.notes}
                  onChange={e => setLoanEditForm({ ...loanEditForm, notes: e.target.value })}
                />
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => setEditingLoan(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-teal btn-sm"
                  disabled={savingLoan}
                >
                  {savingLoan ? 'Saving...' : 'Save Loan Information'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
