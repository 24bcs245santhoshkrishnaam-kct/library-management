import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import BookCard from './BookCard';
import BookDetailModal from './BookDetailModal';
import { 
  getMyLoans, 
  getMyLoanStatus, 
  getBooks, 
  getDepartments,
  getRecommendations, 
  getPersonalizedBooks,
  borrowBookOnline,
  renewBookLoan,
  updateProfile
} from '../services/api';
import { 
  LayoutDashboard, 
  BookOpen, 
  Sparkles, 
  Bookmark, 
  Calendar, 
  History, 
  User, 
  Bell, 
  LogOut, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowRight, 
  RefreshCw, 
  Library, 
  ChevronRight, 
  Filter, 
  Layers, 
  GraduationCap,
  Edit2,
  X,
  ShieldCheck,
  CheckCircle
} from 'lucide-react';

export default function StudentDashboard({ onAskChatbot }) {
  const { user, logout, updateUserData } = useAuth();

  // Active navigation view: 'dashboard' | 'browse' | 'ai' | 'loans' | 'due' | 'history' | 'profile' | 'notifications'
  const [activeNav, setActiveNav] = useState('dashboard');

  // Loans and stats
  const [loans, setLoans] = useState([]);
  const [loanSummary, setLoanSummary] = useState(null);
  const [loadingLoans, setLoadingLoans] = useState(true);

  // Books catalogue
  const [catalogBooks, setCatalogBooks] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [departments, setDepartments] = useState(['All']);
  const [availableOnly, setAvailableOnly] = useState(false);

  // Selected book for Details Modal
  const [selectedBook, setSelectedBook] = useState(null);
  const [borrowingBookId, setBorrowingBookId] = useState(null);
  const [notification, setNotification] = useState(null);

  // AI Personalized recommendations
  const [aiPicks, setAiPicks] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);

  // History Filter: 'all' | 'unoverdue' | 'overdue'
  const [historyFilter, setHistoryFilter] = useState('all');

  // Profile Edit Modal State
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    department: user?.department || 'CSE',
    contact_number: user?.contact_number || '+91 98765 43210'
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Load Loans & Summary
  const fetchLoans = async () => {
    setLoadingLoans(true);
    try {
      const [loansRes, summaryRes] = await Promise.all([
        getMyLoans(),
        getMyLoanStatus()
      ]);
      setLoans(loansRes.loans || []);
      setLoanSummary(summaryRes);
    } catch (err) {
      console.error('Failed to load student loans:', err);
    } finally {
      setLoadingLoans(false);
    }
  };

  // Load Catalog Books
  const fetchBooks = async (query = searchQuery, dept = selectedDept, avail = availableOnly) => {
    setLoadingCatalog(true);
    try {
      const res = await getBooks({
        query: query.trim() || undefined,
        department: dept !== 'All' ? dept : undefined,
        available: avail ? 'true' : undefined
      });
      setCatalogBooks(res.books || []);
    } catch (err) {
      console.error('Failed to load books catalogue:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  // Load Departments
  const fetchDepts = async () => {
    try {
      const res = await getDepartments();
      if (res.departments) {
        setDepartments(['All', ...res.departments]);
      }
    } catch (err) {
      console.warn('Depts fetch notice:', err.message);
    }
  };

  // Load AI Recommendations
  const fetchAiPicks = async () => {
    setLoadingAI(true);
    try {
      const res = await getPersonalizedBooks();
      setAiPicks(res.recommendations || []);
    } catch (err) {
      console.error('Failed to load AI recommendations:', err);
    } finally {
      setLoadingAI(false);
    }
  };

  useEffect(() => {
    fetchLoans();
    fetchBooks();
    fetchDepts();
    fetchAiPicks();
  }, [user]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        department: user.department || 'CSE',
        contact_number: user.contact_number || '+91 98765 43210'
      });
    }
  }, [user]);

  // Online Borrow Action
  const handleBorrow = async (book) => {
    setBorrowingBookId(book.id);
    try {
      const res = await borrowBookOnline(book.id);
      setNotification({
        type: 'success',
        message: res.message || `Successfully borrowed "${book.title}"! Due date: 11 November 2026.`
      });
      setSelectedBook(null);
      await Promise.all([fetchLoans(), fetchBooks()]);
    } catch (err) {
      setNotification({
        type: 'danger',
        message: err.response?.data?.message || err.message || 'Borrow failed'
      });
    } finally {
      setBorrowingBookId(null);
    }
  };

  // Renew Loan Action
  const handleRenew = async (loanId, title) => {
    try {
      const res = await renewBookLoan(loanId);
      setNotification({
        type: 'success',
        message: res.message || `Loan for "${title}" extended by 14 days!`
      });
      await fetchLoans();
    } catch (err) {
      setNotification({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to renew loan'
      });
    }
  };

  // Handle Profile Update
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await updateProfile(profileForm);
      if (updateUserData && res.user) {
        updateUserData(res.user);
      }
      setNotification({
        type: 'success',
        message: 'Your profile details were updated successfully in the college database.'
      });
      setShowEditProfileModal(false);
    } catch (err) {
      setNotification({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to update profile details'
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const activeLoans = loans.filter(l => l.status === 'Issued');
  const pastLoans = loans.filter(l => l.status === 'Returned');
  const overdueLoans = activeLoans.filter(l => l.is_overdue);
  const dueSoonLoans = activeLoans.filter(l => l.status_label === 'Due Soon');

  // Filtered History
  const filteredHistory = pastLoans.filter(p => {
    if (historyFilter === 'unoverdue') {
      return !p.was_overdue && p.status_label !== 'Returned Overdue';
    }
    if (historyFilter === 'overdue') {
      return p.was_overdue || p.status_label === 'Returned Overdue';
    }
    return true;
  });

  return (
    <div className="portal-layout">
      {/* Student Left Sidebar */}
      <aside className="portal-sidebar">
        <div className="portal-sidebar-header">
          <div 
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'var(--navy-900)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Library size={22} className="text-white" />
          </div>
          <div>
            <h6 className="fw-bold mb-0 text-navy-900" style={{ fontSize: '0.94rem' }}>Smart Library</h6>
            <span className="text-muted" style={{ fontSize: '0.72rem' }}>Student Portal</span>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="portal-sidebar-nav">
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveNav('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'browse' ? 'active' : ''}`}
            onClick={() => setActiveNav('browse')}
          >
            <BookOpen size={18} />
            <span>Browse Books</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveNav('ai')}
          >
            <Sparkles size={18} />
            <span>AI Recommendations</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'loans' ? 'active' : ''}`}
            onClick={() => setActiveNav('loans')}
          >
            <Bookmark size={18} />
            <span>My Borrowed Books</span>
            {activeLoans.length > 0 && (
              <span className="badge bg-secondary-subtle text-dark ms-auto small">
                {activeLoans.length}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'due' ? 'active' : ''}`}
            onClick={() => setActiveNav('due')}
          >
            <Calendar size={18} />
            <span>Due Dates</span>
            {overdueLoans.length > 0 && (
              <span className="badge bg-danger ms-auto small">
                {overdueLoans.length}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'history' ? 'active' : ''}`}
            onClick={() => setActiveNav('history')}
          >
            <History size={18} />
            <span>Borrowing History</span>
            {pastLoans.length > 0 && (
              <span className="badge bg-light text-secondary border ms-auto small">
                {pastLoans.length}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveNav('profile')}
          >
            <User size={18} />
            <span>My Profile</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveNav('notifications')}
          >
            <Bell size={18} />
            <span>Notifications</span>
          </button>
        </nav>

        {/* Sidebar Footer with Student Badge & Logout */}
        <div className="portal-sidebar-footer">
          <div className="d-flex align-items-center gap-2 mb-3">
            <div 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--teal-50)',
                color: 'var(--teal-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}
            >
              {user?.name ? user.name.charAt(0) : 'S'}
            </div>
            <div className="overflow-hidden">
              <div className="fw-semibold text-navy-900 text-truncate" style={{ fontSize: '0.82rem' }}>
                {user?.name}
              </div>
              <div className="text-muted text-truncate" style={{ fontSize: '0.7rem' }}>
                {user?.student_id || user?.email}
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
        {/* Top bar header */}
        <header className="portal-topbar">
          <div className="d-flex align-items-center gap-2">
            <span className="badge-active-teal px-2.5 py-1 rounded-pill small fw-semibold">
              Student Workspace
            </span>
            <span className="text-muted small">
              Department: <strong>{user?.department || 'CSE'}</strong>
            </span>
          </div>

          <div className="d-flex align-items-center gap-3">
            <button
              type="button"
              className="btn btn-sm btn-outline-navy d-flex align-items-center gap-1.5"
              onClick={() => {
                setProfileForm({
                  name: user?.name || '',
                  department: user?.department || 'CSE',
                  contact_number: user?.contact_number || '+91 98765 43210'
                });
                setShowEditProfileModal(true);
              }}
            >
              <Edit2 size={13} />
              <span>Edit Details</span>
            </button>
            <div 
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'var(--navy-900)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            >
              {user?.name ? user.name.charAt(0) : 'S'}
            </div>
          </div>
        </header>

        {/* Global Toast Notification */}
        {notification && (
          <div className="px-4 pt-3">
            <div className={`alert alert-${notification.type} alert-dismissible fade show rounded-3 py-2.5 px-3 small d-flex align-items-center gap-2 shadow-sm mb-0`} role="alert">
              {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{notification.message}</span>
              <button type="button" className="btn-close py-2" onClick={() => setNotification(null)}></button>
            </div>
          </div>
        )}

        {/* Main Body per Active View */}
        <div className="portal-main-body">

          {/* ==============================================================
              VIEW 1: DASHBOARD OVERVIEW
             ============================================================== */}
          {activeNav === 'dashboard' && (
            <div>
              {/* Welcome Banner */}
              <div className="p-4 rounded-4 mb-4 bg-white border shadow-xs d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <h2 className="fw-bold text-navy-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
                    Welcome back, {user?.name}!
                  </h2>
                  <p className="text-secondary small mb-0">
                    Welcome to the Smart College Library. Explore 500+ engineering titles, track return deadlines, and borrow books online.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-teal d-flex align-items-center gap-2"
                  onClick={() => setActiveNav('browse')}
                >
                  <BookOpen size={16} />
                  <span>Browse 500+ Books</span>
                </button>
              </div>

              {/* 5 KPI Metric Cards */}
              <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl">
                  <div className="stat-card">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-muted small fw-semibold">Currently Borrowed</span>
                      <div className="stat-card-icon" style={{ background: '#dbeafe', color: '#1e40af' }}>
                        <Bookmark size={20} />
                      </div>
                    </div>
                    <h3 className="fw-bold text-navy-900 mb-0">{activeLoans.length}</h3>
                    <span className="text-muted" style={{ fontSize: '0.74rem' }}>Active loans on your ID</span>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-xl">
                  <div className="stat-card">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-muted small fw-semibold">Available in Library</span>
                      <div className="stat-card-icon" style={{ background: 'var(--teal-50)', color: 'var(--teal-600)' }}>
                        <BookOpen size={20} />
                      </div>
                    </div>
                    <h3 className="fw-bold text-navy-900 mb-0">525+</h3>
                    <span className="text-muted" style={{ fontSize: '0.74rem' }}>Physical textbook titles</span>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-xl">
                  <div className="stat-card">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-muted small fw-semibold">Books Due Soon</span>
                      <div className="stat-card-icon" style={{ background: '#ffedd5', color: '#c2410c' }}>
                        <Clock size={20} />
                      </div>
                    </div>
                    <h3 className="fw-bold text-navy-900 mb-0">{dueSoonLoans.length}</h3>
                    <span className="text-muted" style={{ fontSize: '0.74rem' }}>Within next 3 days</span>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-xl">
                  <div className="stat-card">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-muted small fw-semibold">Overdue Books</span>
                      <div className="stat-card-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                        <AlertTriangle size={20} />
                      </div>
                    </div>
                    <h3 className={`fw-bold mb-0 ${overdueLoans.length > 0 ? 'text-danger' : 'text-navy-900'}`}>
                      {overdueLoans.length}
                    </h3>
                    <span className="text-muted" style={{ fontSize: '0.74rem' }}>Immediate action required</span>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-xl">
                  <div className="stat-card">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-muted small fw-semibold">Recommended</span>
                      <div className="stat-card-icon" style={{ background: '#f3e8ff', color: '#7e22ce' }}>
                        <Sparkles size={20} />
                      </div>
                    </div>
                    <h3 className="fw-bold text-navy-900 mb-0">{aiPicks.length || 8}</h3>
                    <span className="text-muted" style={{ fontSize: '0.74rem' }}>Tailored for your syllabus</span>
                  </div>
                </div>
              </div>

              {/* Overdue Warning Alert if any */}
              {overdueLoans.length > 0 && (
                <div className="p-3 mb-4 rounded-3 border border-danger bg-danger bg-opacity-10 d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <AlertTriangle size={20} className="text-danger flex-shrink-0" />
                    <div>
                      <strong className="text-danger small">Attention: You have {overdueLoans.length} overdue book(s)!</strong>
                      <div className="text-secondary small">Please return them to the library counter to stop accruing late fines.</div>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-danger px-3 rounded-pill"
                    onClick={() => setActiveNav('due')}
                  >
                    View Due Dates
                  </button>
                </div>
              )}

              {/* Active Loans Preview */}
              <div className="bg-white rounded-4 border p-4 mb-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h5 className="fw-bold text-navy-900 mb-0">My Currently Borrowed Books</h5>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-navy"
                    onClick={() => setActiveNav('loans')}
                  >
                    View All Loans
                  </button>
                </div>

                {loadingLoans ? (
                  <div className="text-center py-4 text-muted small">Loading borrowing records...</div>
                ) : activeLoans.length === 0 ? (
                  <div className="text-center py-5 bg-light rounded-3">
                    <BookOpen size={32} className="text-muted mb-2 opacity-50" />
                    <p className="text-secondary small mb-2">You currently have no active borrowed books.</p>
                    <button 
                      type="button" 
                      className="btn btn-teal btn-sm"
                      onClick={() => setActiveNav('browse')}
                    >
                      Browse Catalogue to Borrow
                    </button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table-clean">
                      <thead>
                        <tr>
                          <th>Book Title</th>
                          <th>Department</th>
                          <th>Issue Date</th>
                          <th>Due Date</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeLoans.map(loan => (
                          <tr key={loan.transaction_id}>
                            <td>
                              <div className="fw-semibold text-navy-900">{loan.title}</div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>By {loan.author}</div>
                            </td>
                            <td><span className="badge-active-teal px-2 py-0.5 rounded-pill small">{loan.book_department || 'CSE'}</span></td>
                            <td>{loan.issue_date}</td>
                            <td><strong className={loan.is_overdue ? 'text-danger' : 'text-navy-900'}>{loan.due_date}</strong></td>
                            <td>
                              {loan.is_overdue ? (
                                <span className={`badge-overdue badge-overdue-${loan.overdue_color}`}>
                                  Overdue ({loan.days_overdue}d)
                                </span>
                              ) : (
                                <span className="badge-issued-blue px-2.5 py-1 rounded-pill small fw-semibold">
                                  Active Unoverdue ({loan.days_left}d left)
                                </span>
                              )}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-navy rounded-pill py-1 px-3"
                                onClick={() => handleRenew(loan.transaction_id, loan.title)}
                              >
                                Renew (+14d)
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Curated AI Recommendations Preview */}
              <div className="bg-white rounded-4 border p-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="d-flex align-items-center gap-2">
                    <Sparkles size={18} className="text-teal-600" />
                    <h5 className="fw-bold text-navy-900 mb-0">Curated AI Recommendations for You</h5>
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-teal"
                    onClick={() => setActiveNav('ai')}
                  >
                    View All Picks
                  </button>
                </div>

                <div className="row g-3">
                  {aiPicks.slice(0, 4).map(book => (
                    <div key={book.id} className="col-12 col-sm-6 col-lg-3">
                      <div 
                        className="book-cover-card h-100"
                        onClick={() => setSelectedBook(book)}
                      >
                        <div className="book-cover-wrapper">
                          <img 
                            src={book.cover_image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'} 
                            alt={book.title}
                            className="book-cover-image"
                          />
                        </div>
                        <div className="book-title-box">
                          <h6 className="book-card-name">{book.title}</h6>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              VIEW 2: BROWSE BOOKS (STRICT: PICTURE AND BOOK NAME ONLY)
             ============================================================== */}
          {activeNav === 'browse' && (
            <div>
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
                <div>
                  <h3 className="fw-bold text-navy-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
                    Library Catalog ({catalogBooks.length} Books)
                  </h3>
                  <p className="text-secondary small mb-0">
                    Showing curated textbook covers. Click any book to view complete metadata, syllabus info, and borrow online.
                  </p>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className={`filter-pill ${availableOnly ? 'active' : ''}`}
                    onClick={() => {
                      const next = !availableOnly;
                      setAvailableOnly(next);
                      fetchBooks(searchQuery, selectedDept, next);
                    }}
                  >
                    Available Copies Only
                  </button>
                </div>
              </div>

              {/* Large Search Bar */}
              <div className="p-2 bg-white rounded-4 border shadow-xs mb-3 d-flex align-items-center gap-2">
                <div className="ps-3 text-muted">
                  <Search size={20} />
                </div>
                <input
                  type="text"
                  className="form-control border-0 shadow-none px-2"
                  placeholder="Search 525+ books by title, topic, algorithm, author..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    fetchBooks(e.target.value, selectedDept, availableOnly);
                  }}
                />
                {searchQuery && (
                  <button 
                    type="button" 
                    className="btn btn-sm btn-light border-0 me-2"
                    onClick={() => {
                      setSearchQuery('');
                      fetchBooks('', selectedDept, availableOnly);
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Department Filters Pills */}
              <div className="d-flex align-items-center gap-2 overflow-auto pb-2 mb-3">
                <span className="small text-muted fw-semibold me-1 d-flex align-items-center gap-1">
                  <Filter size={14} /> Dept:
                </span>
                {departments.map(dept => (
                  <button
                    key={dept}
                    type="button"
                    className={`filter-pill ${selectedDept === dept ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedDept(dept);
                      fetchBooks(searchQuery, dept, availableOnly);
                    }}
                  >
                    {dept}
                  </button>
                ))}
              </div>

              {/* Books Grid — Picture + Book Name Only */}
              {loadingCatalog ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-teal-600" role="status"></div>
                  <div className="mt-2 text-muted small">Loading library books...</div>
                </div>
              ) : catalogBooks.length === 0 ? (
                <div className="text-center py-5 bg-white rounded-4 border">
                  <BookOpen size={36} className="text-muted mb-2 opacity-50" />
                  <h6 className="fw-bold text-navy-900 mb-1">No Books Matched</h6>
                  <p className="text-muted small">Try searching for different keywords or select "All" departments.</p>
                </div>
              ) : (
                <div className="student-book-grid">
                  {catalogBooks.map(book => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onSelectBook={(b) => setSelectedBook(b)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==============================================================
              VIEW 3: AI RECOMMENDATIONS
             ============================================================== */}
          {activeNav === 'ai' && (
            <div>
              <div className="p-4 rounded-4 bg-white border mb-4">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <Sparkles size={22} className="text-teal-600" />
                  <h3 className="fw-bold text-navy-900 mb-0" style={{ letterSpacing: '-0.02em' }}>
                    AI Recommendations Engine
                  </h3>
                </div>
                <p className="text-secondary small mb-0">
                  Powered by TF-IDF similarity vectors, student curriculum graphing, and syllabus cross-recommendation.
                </p>
              </div>

              {loadingAI ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-teal-600" role="status"></div>
                  <div className="mt-2 text-muted small">Computing personalized recommendations...</div>
                </div>
              ) : (
                <div>
                  <h5 className="fw-bold text-navy-900 mb-3">Recommended For Your Academic Journey</h5>
                  <div className="student-book-grid">
                    {aiPicks.map(book => (
                      <div key={book.id} className="d-flex flex-column">
                        <BookCard
                          book={book}
                          onSelectBook={(b) => setSelectedBook(b)}
                        />
                        <div className="mt-1 px-1">
                          <span className="text-muted" style={{ fontSize: '0.72rem', lineHeight: '1.2' }}>
                            💡 {book.recommendation_reason || 'Highly relevant to your degree.'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==============================================================
              VIEW 4: MY BORROWED BOOKS
             ============================================================== */}
          {activeNav === 'loans' && (
            <div>
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                  <h3 className="fw-bold text-navy-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
                    My Borrowed Books ({activeLoans.length})
                  </h3>
                  <p className="text-secondary small mb-0">
                    Active books issued to your college ID: <strong>{user?.student_id}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-teal btn-sm"
                  onClick={() => setActiveNav('browse')}
                >
                  Borrow More Books
                </button>
              </div>

              {activeLoans.length === 0 ? (
                <div className="text-center py-5 bg-white rounded-4 border">
                  <Bookmark size={36} className="text-muted mb-2 opacity-50" />
                  <h6 className="fw-bold text-navy-900 mb-1">No Active Loans</h6>
                  <p className="text-secondary small">You currently have no checked-out books.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table-clean">
                    <thead>
                      <tr>
                        <th>Book</th>
                        <th>Department</th>
                        <th>Issue Date</th>
                        <th>Due Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeLoans.map(loan => (
                        <tr key={loan.transaction_id}>
                          <td>
                            <div className="fw-semibold text-navy-900">{loan.title}</div>
                            <div className="text-muted" style={{ fontSize: '0.74rem' }}>{loan.author} • Shelf {loan.shelf_location || 'A1'}</div>
                          </td>
                          <td><span className="badge-active-teal px-2 py-0.5 rounded-pill small">{loan.book_department || 'CSE'}</span></td>
                          <td>{loan.issue_date}</td>
                          <td><strong className={loan.is_overdue ? 'text-danger' : 'text-navy-900'}>{loan.due_date}</strong></td>
                          <td>
                            {loan.is_overdue ? (
                              <span className={`badge-overdue badge-overdue-${loan.overdue_color}`}>
                                Active Overdue ({loan.days_overdue}d)
                              </span>
                            ) : (
                              <span className="badge-issued-blue px-2.5 py-1 rounded-pill small fw-semibold">
                                Active Unoverdue ({loan.days_left}d left)
                              </span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-navy rounded-pill py-1 px-3"
                              onClick={() => handleRenew(loan.transaction_id, loan.title)}
                            >
                              Renew (+14d)
                            </button>
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
              VIEW 5: DUE DATES (Deadlines & Countdown)
             ============================================================== */}
          {activeNav === 'due' && (
            <div>
              <div className="mb-4">
                <h3 className="fw-bold text-navy-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
                  Return Due Dates & Deadlines
                </h3>
                <p className="text-secondary small mb-0">
                  Track upcoming return dates to avoid library suspension or late fine fees.
                </p>
              </div>

              {activeLoans.length === 0 ? (
                <div className="text-center py-5 bg-white rounded-4 border">
                  <Calendar size={36} className="text-muted mb-2 opacity-50" />
                  <h6 className="fw-bold text-navy-900 mb-1">No Upcoming Deadlines</h6>
                  <p className="text-secondary small">All your borrowing records are up to date.</p>
                </div>
              ) : (
                <div className="row g-3">
                  {activeLoans.map(loan => (
                    <div key={loan.transaction_id} className="col-12 col-md-6">
                      <div className={`p-4 rounded-4 bg-white border ${loan.is_overdue ? 'border-danger' : ''} shadow-xs`}>
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="badge-active-teal px-2 py-0.5 rounded-pill small">
                            {loan.book_department || 'Engineering'}
                          </span>
                          {loan.is_overdue ? (
                            <span className={`badge-overdue badge-overdue-${loan.overdue_color}`}>
                              {loan.days_overdue} Days Overdue
                            </span>
                          ) : (
                            <span className="badge-issued-blue px-2.5 py-0.5 rounded-pill small fw-semibold">
                              {loan.days_left} Days Remaining (Unoverdue)
                            </span>
                          )}
                        </div>

                        <h5 className="fw-bold text-navy-900 mb-1">{loan.title}</h5>
                        <p className="text-muted small mb-3">By {loan.author}</p>

                        <div className="p-2.5 rounded-3 bg-light border d-flex justify-content-between text-secondary small mb-3">
                          <span>Issued: <strong>{loan.issue_date}</strong></span>
                          <span>Due: <strong className={loan.is_overdue ? 'text-danger' : 'text-navy-900'}>{loan.due_date}</strong></span>
                        </div>

                        {loan.is_overdue && (
                          <div className="text-danger small fw-semibold mb-3">
                            ⚠️ Late fine accrued: ${loan.accrued_fine.toFixed(2)} ($5.00/day)
                          </div>
                        )}

                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-navy flex-grow-1 rounded-pill"
                            onClick={() => handleRenew(loan.transaction_id, loan.title)}
                          >
                            Renew Loan (+14 Days)
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==============================================================
              VIEW 6: BORROWING HISTORY (OVERDUE & UNOVERDUE RETURN STATUS)
             ============================================================== */}
          {activeNav === 'history' && (
            <div>
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
                <div>
                  <h3 className="fw-bold text-navy-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
                    Borrowing & Return History ({pastLoans.length} Returned Books)
                  </h3>
                  <p className="text-secondary small mb-0">
                    Comprehensive historical record of returned books, tracking <strong>On-Time (Unoverdue)</strong> returns vs <strong>Overdue (Late)</strong> returns.
                  </p>
                </div>

                {/* History Filter Pills */}
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className={`filter-pill ${historyFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setHistoryFilter('all')}
                  >
                    All Returned ({pastLoans.length})
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${historyFilter === 'unoverdue' ? 'active' : ''}`}
                    onClick={() => setHistoryFilter('unoverdue')}
                  >
                    Returned On-Time (Unoverdue)
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${historyFilter === 'overdue' ? 'active' : ''}`}
                    onClick={() => setHistoryFilter('overdue')}
                  >
                    Returned Overdue (Late)
                  </button>
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="text-center py-5 bg-white rounded-4 border">
                  <History size={36} className="text-muted mb-2 opacity-50" />
                  <h6 className="fw-bold text-navy-900 mb-1">No Records Found for Filter</h6>
                  <p className="text-secondary small">Try selecting "All Returned" to view full historical records.</p>
                </div>
              ) : (
                <div className="table-responsive bg-white rounded-4 border shadow-xs">
                  <table className="table-clean">
                    <thead>
                      <tr>
                        <th>Book Title & Author</th>
                        <th>Department</th>
                        <th>Issue Date</th>
                        <th>Return Due Date</th>
                        <th>Actual Return Date</th>
                        <th>Return Status & Overdue History</th>
                        <th>Late Fine Settled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.map(p => {
                        const isLateReturn = p.was_overdue || p.status_label === 'Returned Overdue' || p.days_late > 0;
                        return (
                          <tr key={p.transaction_id}>
                            <td>
                              <div className="fw-semibold text-navy-900">{p.title}</div>
                              <div className="text-muted" style={{ fontSize: '0.74rem' }}>{p.author} • Tx #{p.transaction_id}</div>
                            </td>
                            <td><span className="badge-active-teal px-2 py-0.5 rounded-pill small">{p.book_department || 'CSE'}</span></td>
                            <td>{p.issue_date}</td>
                            <td><strong>{p.due_date}</strong></td>
                            <td>
                              <strong className="text-teal-600">{p.return_date || 'Returned'}</strong>
                            </td>
                            <td>
                              {isLateReturn ? (
                                <div>
                                  <span className="badge-overdue badge-overdue-darkorange">
                                    <AlertTriangle size={12} /> Returned Overdue ({p.days_late || p.days_overdue}d Late)
                                  </span>
                                  <div className="text-muted" style={{ fontSize: '0.72rem', marginTop: '2px' }}>
                                    Returned after scheduled due date
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <span className="badge bg-success-subtle text-success px-2.5 py-1 rounded-pill small fw-bold d-inline-flex align-items-center gap-1">
                                    <CheckCircle size={13} /> Returned On-Time (Unoverdue)
                                  </span>
                                  <div className="text-muted" style={{ fontSize: '0.72rem', marginTop: '2px' }}>
                                    Returned on or before due date
                                  </div>
                                </div>
                              )}
                            </td>
                            <td>
                              {isLateReturn ? (
                                <strong className="text-danger">
                                  ${(parseFloat(p.fine_amount) || (p.days_late * 5.00) || 25.00).toFixed(2)}
                                </strong>
                              ) : (
                                <span className="text-muted small">$0.00 (No Fine)</span>
                              )}
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
              VIEW 7: MY PROFILE (WITH EDIT INFORMATION DETAILS OPTION)
             ============================================================== */}
          {activeNav === 'profile' && (
            <div>
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                  <h3 className="fw-bold text-navy-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
                    Student Institutional Profile
                  </h3>
                  <p className="text-secondary small mb-0">
                    Official identity records registered in the college library database.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-navy btn-sm d-flex align-items-center gap-1.5"
                  onClick={() => setShowEditProfileModal(true)}
                >
                  <Edit2 size={15} />
                  <span>Edit Profile Details</span>
                </button>
              </div>

              <div className="row g-4">
                <div className="col-12 col-md-5">
                  <div className="p-4 rounded-4 bg-white border text-center">
                    <div 
                      className="mx-auto mb-3"
                      style={{
                        width: '84px',
                        height: '84px',
                        borderRadius: '24px',
                        background: 'linear-gradient(135deg, var(--navy-900) 0%, var(--teal-600) 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        fontWeight: 700
                      }}
                    >
                      {user?.name ? user.name.charAt(0) : 'S'}
                    </div>
                    <h5 className="fw-bold text-navy-900 mb-1">{user?.name}</h5>
                    <p className="text-muted small mb-3">{user?.email}</p>

                    <div className="badge-active-teal px-3 py-1 rounded-pill small fw-semibold">
                      Account Status: {user?.account_status ? user.account_status.toUpperCase() : 'ACTIVE'}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-7">
                  <div className="p-4 rounded-4 bg-white border">
                    <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                      <h5 className="fw-bold text-navy-900 mb-0">Academic & Contact Information</h5>
                      <button
                        type="button"
                        className="btn btn-sm btn-link text-teal-600 p-0 text-decoration-none fw-semibold d-flex align-items-center gap-1"
                        onClick={() => setShowEditProfileModal(true)}
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>
                    </div>
                    <div className="row g-3">
                      <div className="col-6">
                        <label className="text-muted small">Student Roll / ID</label>
                        <div className="fw-semibold text-navy-900">{user?.student_id || 'STU101'}</div>
                      </div>
                      <div className="col-6">
                        <label className="text-muted small">Academic Department</label>
                        <div className="fw-semibold text-navy-900">{user?.department || 'Computer Science & Engineering'}</div>
                      </div>
                      <div className="col-6">
                        <label className="text-muted small">Contact Phone</label>
                        <div className="fw-semibold text-navy-900">{user?.contact_number || '+91 98765 43210'}</div>
                      </div>
                      <div className="col-6">
                        <label className="text-muted small">Total Loans To Date</label>
                        <div className="fw-semibold text-navy-900">{loans.length} books</div>
                      </div>
                      <div className="col-6">
                        <label className="text-muted small">Active Borrowed Books</label>
                        <div className="fw-semibold text-teal-600">{activeLoans.length} books</div>
                      </div>
                      <div className="col-6">
                        <label className="text-muted small">Overdue Items</label>
                        <div className={`fw-semibold ${overdueLoans.length > 0 ? 'text-danger' : 'text-success'}`}>
                          {overdueLoans.length} books
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              VIEW 8: NOTIFICATIONS
             ============================================================== */}
          {activeNav === 'notifications' && (
            <div>
              <div className="mb-4">
                <h3 className="fw-bold text-navy-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
                  Library Notifications & SMS History
                </h3>
                <p className="text-secondary small mb-0">
                  Automated notifications dispatched to your registered mobile number: <strong>{user?.contact_number || '+91 98765 43210'}</strong>
                </p>
              </div>

              <div className="d-flex flex-column gap-3">
                {overdueLoans.length > 0 && (
                  <div className="p-3 rounded-3 border border-danger bg-danger bg-opacity-10 d-flex align-items-center gap-3">
                    <AlertTriangle size={24} className="text-danger flex-shrink-0" />
                    <div>
                      <div className="fw-bold text-danger small">Overdue Notice Dispatched</div>
                      <div className="text-secondary small">
                        Automated SMS alert was triggered for {overdueLoans.length} unreturned book(s). Please return before fine accumulation.
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-3 border bg-white d-flex align-items-center gap-3">
                  <CheckCircle2 size={24} className="text-teal-600 flex-shrink-0" />
                  <div>
                    <div className="fw-bold text-navy-900 small">Account Connected</div>
                    <div className="text-muted small">
                      Your student library borrower account is synchronized with the college central database.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Book Details Modal */}
      {selectedBook && (
        <BookDetailModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onBorrowBook={handleBorrow}
          isBorrowing={borrowingBookId === selectedBook.id}
          onSelectBook={(b) => setSelectedBook(b)}
          onAskBot={onAskChatbot}
        />
      )}

      {/* Edit Profile Details Modal */}
      {showEditProfileModal && (
        <div className="modal-overlay" onClick={() => setShowEditProfileModal(false)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="p-4 border-bottom d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <Edit2 size={18} className="text-teal-600" />
                <h5 className="fw-bold text-navy-900 mb-0">Edit Profile Information</h5>
              </div>
              <button type="button" className="btn-close" onClick={() => setShowEditProfileModal(false)}></button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-4">
              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">Full Name</label>
                <input
                  type="text"
                  className="form-control small"
                  required
                  value={profileForm.name}
                  onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">Academic Department</label>
                <select
                  className="form-select small"
                  value={profileForm.department}
                  onChange={e => setProfileForm({ ...profileForm, department: e.target.value })}
                >
                  <option value="CSE">Computer Science & Engineering (CSE)</option>
                  <option value="AI AND MACHINE LEARNING">Artificial Intelligence & Data Science</option>
                  <option value="ECE">Electronics & Communication Engineering (ECE)</option>
                  <option value="EEE">Electrical & Electronics Engineering (EEE)</option>
                  <option value="MECHANICAL">Mechanical Engineering</option>
                  <option value="CIVIL & BASIC SCIENCES">Civil & Basic Sciences</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold text-secondary">Contact Phone Number</label>
                <input
                  type="text"
                  className="form-control small"
                  required
                  placeholder="+91 98765 43210"
                  value={profileForm.contact_number}
                  onChange={e => setProfileForm({ ...profileForm, contact_number: e.target.value })}
                />
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => setShowEditProfileModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-teal btn-sm"
                  disabled={savingProfile}
                >
                  {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
