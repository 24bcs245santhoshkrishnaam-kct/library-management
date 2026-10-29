import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import SearchBar from './SearchBar';
import BookCard from './BookCard';
import BookDetailModal from './BookDetailModal';
import { getMyLoans, getMyLoanStatus, searchBooks, getCatalogueFilters, borrowBookOnline } from '../services/api';
import { 
  BookOpen, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw, 
  MessageSquare,
  Search,
  Calendar,
  Layers,
  MapPin,
  AlertCircle
} from 'lucide-react';

export default function BorrowerDashboard({ onAskChatbot }) {
  const { user } = useAuth();
  
  // Borrower Sub-Tabs: 'loans' | 'explore'
  const [activeSubTab, setActiveSubTab] = useState('loans');

  // Loans state
  const [loans, setLoans] = useState([]);
  const [loanSummary, setLoanSummary] = useState(null);
  const [loansLoading, setLoansLoading] = useState(true);

  // Online borrow state & notification
  const [notification, setNotification] = useState(null);
  const [borrowingBookId, setBorrowingBookId] = useState(null);

  // Catalogue Search state
  const [books, setBooks] = useState([]);
  const [searchLoading, setSearchLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAuthor, setSelectedAuthor] = useState('All');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [categories, setCategories] = useState(['All']);
  const [authors, setAuthors] = useState(['All']);
  const [selectedBook, setSelectedBook] = useState(null);

  const loadLoans = async () => {
    setLoansLoading(true);
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
      setLoansLoading(false);
    }
  };

  const loadCatalogue = async (q = searchQuery, cat = selectedCategory, auth = selectedAuthor, avail = availableOnly) => {
    setSearchLoading(true);
    try {
      const res = await searchBooks({
        query: q,
        category: cat !== 'All' ? cat : undefined,
        author: auth !== 'All' ? auth : undefined,
        available: avail ? 'true' : undefined
      });
      setBooks(res.books || []);
    } catch (err) {
      console.error('Failed to load catalogue:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const loadFilters = async () => {
    try {
      const res = await getCatalogueFilters();
      if (res.categories) setCategories(res.categories);
      if (res.authors) setAuthors(res.authors);
    } catch (err) {
      console.warn('Filter load notice:', err.message);
    }
  };

  useEffect(() => {
    loadLoans();
    loadCatalogue();
    loadFilters();
  }, [user]);

  const handleBorrowBook = async (book) => {
    setBorrowingBookId(book.id);
    try {
      const res = await borrowBookOnline(book.id);
      setNotification({
        type: 'success',
        message: res.message || `Book "${book.title}" borrowed successfully! Added to your loans.`
      });
      setSelectedBook(null);
      await Promise.all([loadLoans(), loadCatalogue()]);
      // Seamlessly switch to loans sub-tab after 1.2s to show newly borrowed book
      setTimeout(() => {
        setActiveSubTab('loans');
      }, 1200);
    } catch (err) {
      setNotification({
        type: 'danger',
        message: err.response?.data?.message || err.message || 'Failed to borrow book'
      });
    } finally {
      setBorrowingBookId(null);
    }
  };

  const getStatusBadge = (loan) => {
    switch (loan.status_label) {
      case 'Overdue':
        return <span className="apple-badge apple-badge-red"><AlertTriangle size={12} /> Overdue ({loan.days_overdue}d)</span>;
      case 'Due Soon':
        return <span className="apple-badge apple-badge-orange"><Clock size={12} /> Due Today / Soon</span>;
      case 'Returned':
        return <span className="apple-badge apple-badge-green"><CheckCircle2 size={12} /> Returned</span>;
      default:
        return <span className="apple-badge apple-badge-blue"><Clock size={12} /> Issued ({loan.days_left}d left)</span>;
    }
  };

  return (
    <div className="container py-4">
      {/* Apple Hero Welcome Header */}
      <div className="apple-hero mb-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div>
            <span className="apple-badge apple-badge-blue mb-2">BORROWER DASHBOARD</span>
            <h1 className="fw-bold text-dark display-6 mb-1" style={{ letterSpacing: '-0.03em' }}>
              Welcome back, {user?.name}
            </h1>
            <p className="text-muted mb-0">
              Student ID: <strong>{user?.student_id || 'N/A'}</strong> • Institutional Date: <strong>28 October 2026</strong>
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-apple-subtle d-flex align-items-center gap-2"
              onClick={() => { loadLoans(); loadCatalogue(); }}
            >
              <RefreshCw size={14} className={loansLoading || searchLoading ? 'spin' : ''} />
              <span>Sync Records</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`alert alert-${notification.type} rounded-4 shadow-sm mb-4 d-flex align-items-center justify-content-between animate-fade-in`} role="alert">
          <div className="d-flex align-items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="fw-medium">{notification.message}</span>
          </div>
          <button type="button" className="btn-close" onClick={() => setNotification(null)}></button>
        </div>
      )}

      {/* KPI Overview Metrics */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="apple-kpi-card">
            <span className="text-muted small fw-medium text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>Active Loans</span>
            <h2 className="fw-bold text-dark mt-2 mb-0 display-6" style={{ letterSpacing: '-0.03em' }}>
              {loanSummary?.active_loans_count ?? 0}
            </h2>
            <span className="text-secondary small mt-1 d-block">Currently in possession</span>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="apple-kpi-card">
            <span className="text-muted small fw-medium text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>Overdue Items</span>
            <h2 className={`fw-bold mt-2 mb-0 display-6 ${(loanSummary?.overdue_count ?? 0) > 0 ? 'text-danger' : 'text-success'}`} style={{ letterSpacing: '-0.03em' }}>
              {loanSummary?.overdue_count ?? 0}
            </h2>
            <span className="text-secondary small mt-1 d-block">Return required promptly</span>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="apple-kpi-card">
            <span className="text-muted small fw-medium text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>Due Soon</span>
            <h2 className="fw-bold text-warning mt-2 mb-0 display-6" style={{ letterSpacing: '-0.03em' }}>
              {loanSummary?.due_soon_count ?? 0}
            </h2>
            <span className="text-secondary small mt-1 d-block">Due within 3 days</span>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="apple-kpi-card">
            <span className="text-muted small fw-medium text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>Return History</span>
            <h2 className="fw-bold text-success mt-2 mb-0 display-6" style={{ letterSpacing: '-0.03em' }}>
              {loanSummary?.returned_count ?? 0}
            </h2>
            <span className="text-secondary small mt-1 d-block">Returned safely</span>
          </div>
        </div>
      </div>

      {/* Segmented Navigation between Loans and Catalogue */}
      <div className="d-flex align-items-center justify-content-center mb-4">
        <div className="apple-segmented-control shadow-sm">
          <button
            type="button"
            className={`apple-segment-btn px-4 py-2 ${activeSubTab === 'loans' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('loans')}
          >
            <Clock size={16} />
            <span>My Borrowed Books ({loans.length})</span>
          </button>

          <button
            type="button"
            className={`apple-segment-btn px-4 py-2 ${activeSubTab === 'explore' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('explore')}
          >
            <Search size={16} />
            <span>Search Catalogue & AI ({books.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: My Borrowed Books */}
      {activeSubTab === 'loans' && (
        <div className="animate-fade-in">

          {/* Active Loans & Due Date Highlight Cards */}
          {loans.filter(l => l.status === 'Issued').length > 0 && (
            <div className="mb-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h5 className="fw-bold text-dark mb-0">Active Books & Due Date Deadlines</h5>
                  <span className="text-secondary small">Keep track of your return deadlines to avoid overdue penalties</span>
                </div>
                <span className="apple-badge apple-badge-blue">
                  {loans.filter(l => l.status === 'Issued').length} Active Book(s)
                </span>
              </div>

              <div className="row g-3">
                {loans.filter(l => l.status === 'Issued').map((loan) => (
                  <div key={loan.transaction_id} className="col-12 col-md-6">
                    <div className="deadline-hero-box h-100 flex-column align-items-start">
                      <div className="w-100 d-flex align-items-start justify-content-between gap-2 mb-2">
                        <div>
                          <span className="apple-badge apple-badge-blue py-0 px-2 mb-1" style={{ fontSize: '0.66rem' }}>
                            {loan.category} • Shelf: {loan.shelf_location || 'A1'}
                          </span>
                          <h6 className="fw-bold text-dark mb-0" style={{ fontSize: '1rem' }}>
                            {loan.title}
                          </h6>
                          <span className="text-muted small">By {loan.author}</span>
                        </div>
                        <span className="badge bg-light text-secondary border small">#{loan.transaction_id}</span>
                      </div>

                      {/* LAST DATE DUE HERO DISPLAY */}
                      <div className="w-100 p-3 rounded-4 bg-light border mt-2">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span className="text-muted fw-bold small text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.04em' }}>
                            LAST DATE DUE:
                          </span>
                          {loan.is_overdue ? (
                            <span className="due-date-pill due-date-pill-danger">
                              <AlertTriangle size={13} />
                              <span>{loan.days_overdue} Days Overdue!</span>
                            </span>
                          ) : loan.status_label === 'Due Soon' ? (
                            <span className="due-date-pill due-date-pill-warning">
                              <Clock size={13} />
                              <span>Due Today / Soon</span>
                            </span>
                          ) : (
                            <span className="due-date-pill due-date-pill-primary">
                              <Calendar size={13} />
                              <span>{loan.days_left} Days Left</span>
                            </span>
                          )}
                        </div>

                        <div className="d-flex align-items-baseline gap-2">
                          <span className={`display-6 fw-bold ${loan.is_overdue ? 'text-danger' : 'text-dark'}`} style={{ fontSize: '1.45rem', letterSpacing: '-0.02em' }}>
                            {loan.due_date}
                          </span>
                          <span className="text-muted small">
                            (Borrowed on {loan.issue_date})
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="due-progress-bar">
                          <div 
                            className="due-progress-fill"
                            style={{
                              width: loan.is_overdue ? '100%' : `${Math.min(100, Math.max(10, ((14 - (loan.days_left || 0)) / 14) * 100))}%`,
                              background: loan.is_overdue ? '#ff3b30' : loan.status_label === 'Due Soon' ? '#ff9500' : '#0071e3'
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="w-100 d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                        <span className="text-secondary small" style={{ fontSize: '0.74rem' }}>
                          Physical check-in at library desk
                        </span>
                        <button
                          type="button"
                          className="btn btn-apple-subtle btn-sm d-flex align-items-center gap-1.5"
                          style={{ fontSize: '0.76rem' }}
                          onClick={() => {
                            if (onAskChatbot) {
                              onAskChatbot(`When is my "${loan.title}" due, and have I returned it?`);
                            }
                          }}
                        >
                          <MessageSquare size={13} />
                          <span>Ask Assistant</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="apple-card p-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="fw-bold text-dark mb-0">All Borrowing Transactions</h5>
              <span className="text-muted small">Retrieved securely from MySQL</span>
            </div>

            {loansLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="text-muted small mt-2">Loading verified borrowing records...</p>
              </div>
            ) : loans.length === 0 ? (
              <div className="text-center py-5">
                <BookOpen size={44} className="text-secondary opacity-40 mb-2" />
                <h6 className="fw-semibold text-dark">No Active Loans</h6>
                <p className="text-muted small mb-3">You do not have any borrowed books in your account right now.</p>
                <button className="btn btn-apple-primary btn-sm" onClick={() => setActiveSubTab('explore')}>
                  Explore Library Catalogue
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-borderless align-middle mb-0">
                  <thead className="border-bottom text-muted small text-uppercase" style={{ fontSize: '0.72rem' }}>
                    <tr>
                      <th className="ps-3">Tx ID</th>
                      <th>Book & Details</th>
                      <th>Issue Date</th>
                      <th>LAST DATE DUE</th>
                      <th>Return Date</th>
                      <th>Status</th>
                      <th className="text-end pe-3">AI Inquiries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map((loan) => (
                      <tr key={loan.transaction_id} className="border-bottom">
                        <td className="ps-3 fw-semibold text-secondary">#{loan.transaction_id}</td>
                        <td>
                          <div className="fw-bold text-dark">{loan.title}</div>
                          <div className="text-muted small" style={{ fontSize: '0.78rem' }}>
                            Author: {loan.author} • Category: {loan.category} • Shelf: {loan.shelf_location || 'A1'}
                          </div>
                        </td>
                        <td className="small text-secondary">{loan.issue_date}</td>
                        <td>
                          {loan.status === 'Returned' ? (
                            <span className="due-date-pill due-date-pill-success">
                              <CheckCircle2 size={12} />
                              <span>{loan.due_date}</span>
                            </span>
                          ) : loan.is_overdue ? (
                            <span className="due-date-pill due-date-pill-danger">
                              <AlertTriangle size={12} />
                              <span>{loan.due_date} ({loan.days_overdue}d Overdue)</span>
                            </span>
                          ) : loan.status_label === 'Due Soon' ? (
                            <span className="due-date-pill due-date-pill-warning">
                              <Clock size={12} />
                              <span>{loan.due_date} (Due Today)</span>
                            </span>
                          ) : (
                            <span className="due-date-pill due-date-pill-primary">
                              <Calendar size={12} />
                              <span>{loan.due_date} ({loan.days_left}d left)</span>
                            </span>
                          )}
                        </td>
                        <td className="small text-secondary">
                          {loan.return_date ? (
                            <span className="text-success fw-semibold">{loan.return_date}</span>
                          ) : (
                            <span className="text-muted italic">—</span>
                          )}
                        </td>
                        <td>
                          {getStatusBadge(loan)}
                        </td>
                        <td className="text-end pe-3">
                          <button
                            type="button"
                            className="btn btn-apple-subtle btn-sm d-inline-flex align-items-center gap-1.5"
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
                            <span>Ask AI</span>
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
      )}

      {/* TAB 2: Explore Catalogue */}
      {activeSubTab === 'explore' && (
        <div className="animate-fade-in">
          {/* Apple-style Search Bar */}
          <SearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedAuthor={selectedAuthor}
            setSelectedAuthor={setSelectedAuthor}
            availableOnly={availableOnly}
            setAvailableOnly={setAvailableOnly}
            categories={categories}
            authors={authors}
            onSearch={loadCatalogue}
            totalResults={books.length}
            loading={searchLoading}
          />

          {searchLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="text-muted small mt-2">Searching live MySQL collection...</p>
            </div>
          ) : books.length === 0 ? (
            <div className="apple-card p-5 text-center">
              <BookOpen size={48} className="text-secondary opacity-40 mx-auto mb-3" />
              <h5 className="fw-bold text-dark">No Books Found</h5>
              <p className="text-muted small mb-3">
                Try searching for topics like "Python", "Java", "AI", or reset your filters.
              </p>
              <button 
                className="btn btn-apple-primary btn-sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedAuthor('All');
                  setAvailableOnly(false);
                  loadCatalogue('', 'All', 'All', false);
                }}
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="row g-4">
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onSelectBook={setSelectedBook}
                  onBorrowBook={handleBorrowBook}
                  isBorrowing={borrowingBookId === book.id}
                  onAskBotAboutBook={(b) => {
                    if (onAskChatbot) {
                      onAskChatbot(`Is "${b.title}" available to borrow, and where is it located?`);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Book Detail Modal */}
      <BookDetailModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onBorrowBook={handleBorrowBook}
        isBorrowing={borrowingBookId === selectedBook?.id}
        onAskBot={(b) => {
          if (onAskChatbot) {
            onAskChatbot(`Is "${b.title}" available to borrow, and where is it located?`);
          }
        }}
      />
    </div>
  );
}

