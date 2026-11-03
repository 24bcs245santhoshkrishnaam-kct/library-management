import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import BookCard from './BookCard';
import BookDetailModal from './BookDetailModal';
import { 
  getMyLoans, 
  getMyLoanStatus, 
  getBooks, 
  getDepartments,
  getCatalogueFilters,
  getRecommendations, 
  getPersonalizedBooks,
  getCareerGuidance,
  getCareerRoadmap,
  borrowBookOnline,
  renewBookLoan,
  returnBookLoan,
  getBorrowingMode,
  updateProfile,
  getStudentNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../services/api';
import CountdownTimer from './CountdownTimer';
import { formatINR } from '../utils/currencyFormatter';
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
  CheckCircle,
  Briefcase,
  TrendingUp,
  DollarSign,
  Award,
  Compass,
  Globe,
  Menu
} from 'lucide-react';

export default function StudentDashboard({ onAskChatbot }) {
  const { user, logout, updateUserData } = useAuth();

  // Active navigation view: 'dashboard' | 'browse' | 'ai' | 'loans' | 'due' | 'history' | 'profile' | 'notifications'
  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  const [selectedCollection, setSelectedCollection] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [availableOnly, setAvailableOnly] = useState(false);

  // Selected book for Details Modal
  const [selectedBook, setSelectedBook] = useState(null);
  const [borrowingBookId, setBorrowingBookId] = useState(null);
  const [notification, setNotification] = useState(null);

  // AI Recommendations State
  const [aiPicks, setAiPicks] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiSubTab, setAiSubTab] = useState('picks'); // 'picks' | 'career' | 'goal'
  
  // AI Dynamic Search in Recommendations
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearchResults, setAiSearchResults] = useState(null);
  const [loadingAiSearch, setLoadingAiSearch] = useState(false);

  // Career Guidance State
  const [careerSearchInput, setCareerSearchInput] = useState('Machine Learning');
  const [careerData, setCareerData] = useState(null);
  const [loadingCareer, setLoadingCareer] = useState(false);
  const [careerCurrency, setCareerCurrency] = useState('india'); // 'india' | 'global'

  // Career Goal Roadmap State
  const [selectedGoal, setSelectedGoal] = useState('aiml_engineer');
  const [roadmapData, setRoadmapData] = useState(null);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);

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

  // Student Notifications State (Feature 2 & 5)
  const [notificationsList, setNotificationsList] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const unreadNotificationsCount = notificationsList.filter(n => !n.is_read).length;

  const fetchNotifications = async (silent = false) => {
    if (!silent) setLoadingNotifications(true);
    try {
      const res = await getStudentNotifications();
      setNotificationsList(res.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      if (!silent) setLoadingNotifications(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotificationsList(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotificationsList(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  // Load Loans & Summary
  const fetchLoans = async (silent = false) => {
    if (!silent) setLoadingLoans(true);
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
      if (!silent) setLoadingLoans(false);
    }
  };

  // Real-time polling for student loans and notifications every 4 seconds
  useEffect(() => {
    const pollTimer = setInterval(() => {
      fetchLoans(true);
      fetchNotifications(true);
    }, 4000);
    return () => clearInterval(pollTimer);
  }, []);

  // Load Catalog Books with collection & category support
  const fetchBooks = async (
    query = searchQuery, 
    dept = selectedDept, 
    avail = availableOnly,
    collection = selectedCollection,
    category = selectedCategory
  ) => {
    setLoadingCatalog(true);
    try {
      const res = await getBooks({
        query: query.trim() || undefined,
        department: (dept && dept !== 'All') ? dept : undefined,
        available: avail ? 'true' : undefined,
        collection: (collection && collection !== 'All') ? collection : undefined,
        category: (category && category !== 'All') ? category : undefined
      });
      setCatalogBooks(res.books || []);
    } catch (err) {
      console.error('Failed to load books catalogue:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  // Load Departments and Filters
  const fetchDepts = async () => {
    try {
      const res = await getCatalogueFilters();
      if (res && res.departments) {
        setDepartments(res.departments);
      }
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  // Fetch Career Guidance
  const fetchCareerInfo = async (term = careerSearchInput) => {
    setLoadingCareer(true);
    try {
      const res = await getCareerGuidance({ q: term });
      setCareerData(res);
    } catch (err) {
      console.error('Failed to load career guidance:', err);
    } finally {
      setLoadingCareer(false);
    }
  };

  // Fetch Career Roadmap
  const fetchRoadmap = async (goal = selectedGoal) => {
    setLoadingRoadmap(true);
    try {
      const res = await getCareerRoadmap(goal);
      setRoadmapData(res);
    } catch (err) {
      console.error('Failed to load career roadmap:', err);
    } finally {
      setLoadingRoadmap(false);
    }
  };

  // Run AI Search
  const runAiSearch = async (term = aiSearchQuery) => {
    if (!term || !term.trim()) {
      setAiSearchResults(null);
      return;
    }
    setLoadingAiSearch(true);
    try {
      const res = await getRecommendations({ q: term.trim() });
      setAiSearchResults(res);
    } catch (err) {
      console.error('Failed to run AI search:', err);
    } finally {
      setLoadingAiSearch(false);
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
    fetchCareerInfo('Machine Learning');
    fetchRoadmap('aiml_engineer');
    fetchNotifications();
  }, [user]);

  useEffect(() => {
    if (activeNav === 'notifications') {
      fetchNotifications();
    }
  }, [activeNav]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        department: user.department || 'CSE',
        contact_number: user.contact_number || '+91 98765 43210'
      });
    }
  }, [user]);

  // Online Borrow Action (Feature 1, 2, 3: Live Countdown & Immediate Display)
  const handleBorrow = async (book) => {
    setBorrowingBookId(book.id);
    try {
      const res = await borrowBookOnline(book.id);
      setNotification({
        type: 'success',
        message: res.message || `Successfully borrowed "${book.title}"!`
      });
      setSelectedBook(null);
      // Immediately fetch latest borrowing records and notifications from DB
      await Promise.all([fetchLoans(), fetchBooks(), fetchNotifications(true)]);
      // FEATURE 1: Immediately switch to Borrowed Books section so student sees it right away
      setActiveNav('loans');
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Borrow failed';
      setNotification({
        type: 'danger',
        message: msg
      });
      return { success: false, message: msg };
    } finally {
      setBorrowingBookId(null);
    }
  };

  // Student Self-Service Return Action (Feature 1)
  const handleReturn = async (loanId, title) => {
    try {
      const res = await returnBookLoan(loanId);
      setNotification({
        type: 'success',
        message: res.message || `Book "${title}" successfully returned! Library copies restored.`
      });
      await Promise.all([fetchLoans(), fetchBooks(), fetchNotifications(true)]);
    } catch (err) {
      setNotification({
        type: 'danger',
        message: err.response?.data?.message || err.message || 'Failed to return book'
      });
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
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="portal-sidebar-backdrop d-lg-none"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Student Left Sidebar */}
      <aside className={`portal-sidebar ${sidebarOpen ? 'open' : ''}`}>
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
          <div className="flex-grow-1">
            <h6 className="fw-bold mb-0 text-navy-900" style={{ fontSize: '0.94rem' }}>KCT AI Smart Library</h6>
            <span className="text-muted" style={{ fontSize: '0.72rem' }}>Student Portal</span>
          </div>
          <button 
            type="button" 
            className="btn btn-sm btn-light border d-lg-none p-1 rounded-2"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close Sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="portal-sidebar-nav">
          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveNav('dashboard'); setSidebarOpen(false); }}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'browse' ? 'active' : ''}`}
            onClick={() => { setActiveNav('browse'); setSidebarOpen(false); }}
          >
            <BookOpen size={18} />
            <span>Browse Books</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'ai' ? 'active' : ''}`}
            onClick={() => { setActiveNav('ai'); setSidebarOpen(false); }}
          >
            <Sparkles size={18} />
            <span>AI Recommendations</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'loans' ? 'active' : ''}`}
            onClick={() => { setActiveNav('loans'); setSidebarOpen(false); }}
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
            onClick={() => { setActiveNav('due'); setSidebarOpen(false); }}
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
            onClick={() => { setActiveNav('history'); setSidebarOpen(false); }}
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
            onClick={() => { setActiveNav('profile'); setSidebarOpen(false); }}
          >
            <User size={18} />
            <span>My Profile</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeNav === 'notifications' ? 'active' : ''} d-flex align-items-center justify-content-between`}
            onClick={() => { setActiveNav('notifications'); setSidebarOpen(false); }}
          >
            <div className="d-flex align-items-center gap-2.5">
              <Bell size={18} />
              <span>Notifications</span>
            </div>
            {unreadNotificationsCount > 0 && (
              <span className="badge bg-danger rounded-pill px-2 py-0.5 small shadow-xs" style={{ fontSize: '0.72rem' }}>
                {unreadNotificationsCount}
              </span>
            )}
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
            <button
              type="button"
              className="btn btn-sm btn-light border d-lg-none d-flex align-items-center justify-content-center p-2 rounded-3"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle Navigation Menu"
              title="Toggle Menu"
            >
              <Menu size={18} className="text-dark" />
            </button>
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
              className="btn btn-sm btn-light border position-relative d-flex align-items-center justify-content-center p-2 rounded-circle"
              title="Notifications & Overdue Reminders"
              onClick={() => setActiveNav('notifications')}
              style={{ width: '36px', height: '36px' }}
            >
              <Bell size={16} className={unreadNotificationsCount > 0 ? "text-danger" : "text-secondary"} />
              {unreadNotificationsCount > 0 && (
                <span 
                  className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white"
                  style={{ fontSize: '0.62rem', padding: '0.25em 0.45em' }}
                >
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

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
                    Welcome to KCT AI Smart Library — Autonomous Academic Knowledge Center. Explore 600+ catalog titles, track return deadlines, and borrow books online.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-teal d-flex align-items-center gap-2"
                  onClick={() => setActiveNav('browse')}
                >
                  <BookOpen size={16} />
                  <span>Browse 600+ Books</span>
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
                    <h3 className="fw-bold text-navy-900 mb-0">
                      {catalogBooks.length > 0 ? `${catalogBooks.length}+` : '625+'}
                    </h3>
                    <span className="text-muted" style={{ fontSize: '0.74rem' }}>Engineering, Shakespeare & Tamil</span>
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
                    Curated engineering, Shakespeare, and Tamil literature catalog. Click any book cover to view full details and borrow online.
                  </p>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className={`filter-pill ${availableOnly ? 'active' : ''}`}
                    onClick={() => {
                      const next = !availableOnly;
                      setAvailableOnly(next);
                      fetchBooks(searchQuery, selectedDept, next, selectedCollection, selectedCategory);
                    }}
                  >
                    Available Copies Only
                  </button>
                </div>
              </div>

              {/* Large Search Bar supporting English and Tamil script */}
              <div className="p-2 bg-white rounded-4 border shadow-xs mb-3 d-flex align-items-center gap-2">
                <div className="ps-3 text-muted">
                  <Search size={20} />
                </div>
                <input
                  type="text"
                  className="form-control border-0 shadow-none px-2"
                  placeholder="Search 625+ books in English, தமிழ் (e.g. Thirukkural / திருக்குறள், Hamlet, AI, DSA, Kalki)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    fetchBooks(e.target.value, selectedDept, availableOnly, selectedCollection, selectedCategory);
                  }}
                />
                {searchQuery && (
                  <button 
                    type="button" 
                    className="btn btn-sm btn-light border-0 me-2"
                    onClick={() => {
                      setSearchQuery('');
                      fetchBooks('', selectedDept, availableOnly, selectedCollection, selectedCategory);
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Collection Tabs */}
              <div className="d-flex align-items-center gap-2 overflow-auto pb-2 mb-2">
                <span className="small text-muted fw-semibold me-1 d-flex align-items-center gap-1">
                  <Library size={14} /> Collection:
                </span>
                {[
                  { id: 'All', label: 'All Collections' },
                  { id: 'Engineering', label: 'Engineering (500+ Books)' },
                  { id: 'Shakespeare Collection', label: 'Shakespeare Collection (50+ Works)' },
                  { id: 'Tamil Literature', label: 'Tamil Literature (50+ தமிழ் நூல்கள்)' }
                ].map(col => (
                  <button
                    key={col.id}
                    type="button"
                    className={`filter-pill ${selectedCollection === col.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCollection(col.id);
                      setSelectedCategory('All');
                      setSelectedDept('All');
                      fetchBooks(searchQuery, 'All', availableOnly, col.id, 'All');
                    }}
                  >
                    {col.label}
                  </button>
                ))}
              </div>

              {/* Sub-Filters based on active collection */}
              {selectedCollection === 'Shakespeare Collection' && (
                <div className="d-flex align-items-center gap-2 overflow-auto pb-2 mb-3 bg-light p-2 rounded-3 border">
                  <span className="small text-navy-900 fw-bold me-1">Shakespeare Genres:</span>
                  {[
                    'All',
                    'Shakespeare — Tragedies',
                    'Shakespeare — Comedies',
                    'Shakespeare — Histories',
                    'Shakespeare — Plays',
                    'Shakespeare — Poetry',
                    'Shakespeare — Literary Analysis',
                    'Shakespeare — Biography and Criticism'
                  ].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`btn btn-xs py-1 px-2.5 rounded-pill small ${selectedCategory === cat ? 'btn-navy text-white fw-semibold' : 'btn-white bg-white border text-secondary'}`}
                      style={{ fontSize: '0.78rem' }}
                      onClick={() => {
                        setSelectedCategory(cat);
                        fetchBooks(searchQuery, selectedDept, availableOnly, selectedCollection, cat);
                      }}
                    >
                      {cat.replace('Shakespeare — ', '')}
                    </button>
                  ))}
                </div>
              )}

              {selectedCollection === 'Tamil Literature' && (
                <div className="d-flex align-items-center gap-2 overflow-auto pb-2 mb-3 bg-light p-2 rounded-3 border">
                  <span className="small text-navy-900 fw-bold me-1">தமிழ் பிரிவுகள்:</span>
                  {[
                    'All',
                    'Tamil Classics',
                    'Tamil Literature',
                    'Tamil Novels',
                    'Tamil Poetry',
                    'Tamil History',
                    'Tamil Grammar',
                    'Tamil Short Stories',
                    'Tamil Language and Culture'
                  ].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`btn btn-xs py-1 px-2.5 rounded-pill small ${selectedCategory === cat ? 'btn-teal text-white fw-semibold' : 'btn-white bg-white border text-secondary'}`}
                      style={{ fontSize: '0.78rem' }}
                      onClick={() => {
                        setSelectedCategory(cat);
                        fetchBooks(searchQuery, selectedDept, availableOnly, selectedCollection, cat);
                      }}
                    >
                      {cat.replace('Tamil ', '')}
                    </button>
                  ))}
                </div>
              )}

              {selectedCollection === 'Engineering' && (
                <div className="d-flex align-items-center gap-2 overflow-auto pb-2 mb-3">
                  <span className="small text-muted fw-semibold me-1 d-flex align-items-center gap-1">
                    <Filter size={14} /> Dept:
                  </span>
                  {departments.filter(d => d !== 'ENGLISH LITERATURE' && d !== 'TAMIL LITERATURE').map(dept => (
                    <button
                      key={dept}
                      type="button"
                      className={`filter-pill ${selectedDept === dept ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedDept(dept);
                        fetchBooks(searchQuery, dept, availableOnly, selectedCollection, selectedCategory);
                      }}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              )}

              {/* Books Grid — Picture + Book Name Only (STRICT REQUIREMENT) */}
              {loadingCatalog ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-teal-600" role="status"></div>
                  <div className="mt-2 text-muted small">Loading library books...</div>
                </div>
              ) : catalogBooks.length === 0 ? (
                <div className="text-center py-5 bg-white rounded-4 border">
                  <BookOpen size={36} className="text-muted mb-2 opacity-50" />
                  <h6 className="fw-bold text-navy-900 mb-1">No Books Matched</h6>
                  <p className="text-muted small">Try searching with English or Tamil keywords or select "All Collections".</p>
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
              VIEW 3: AI RECOMMENDATIONS & CAREER GUIDANCE
             ============================================================== */}
          {activeNav === 'ai' && (
            <div>
              {/* Top Banner with 3 Sub-Tabs */}
              <div className="p-4 rounded-4 bg-white border mb-4">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
                  <div className="d-flex align-items-center gap-2">
                    <Sparkles size={24} className="text-teal-600" />
                    <div>
                      <h3 className="fw-bold text-navy-900 mb-0" style={{ letterSpacing: '-0.02em' }}>
                        AI Recommendations & Career Engine
                      </h3>
                      <p className="text-secondary small mb-0">
                        Contextual book recommendations, career mapping, and verified earning opportunities.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sub-Navigation Pills */}
                <div className="d-flex align-items-center gap-2 border-top pt-3 flex-wrap">
                  <button
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-1.5 ${
                      aiSubTab === 'picks' ? 'btn-teal' : 'btn-light border text-secondary'
                    }`}
                    onClick={() => setAiSubTab('picks')}
                  >
                    <Sparkles size={14} />
                    <span>Curated Recommendations</span>
                  </button>

                  <button
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-1.5 ${
                      aiSubTab === 'career' ? 'btn-teal' : 'btn-light border text-secondary'
                    }`}
                    onClick={() => setAiSubTab('career')}
                  >
                    <Briefcase size={14} />
                    <span>Career Paths & Earning Opportunities</span>
                  </button>

                  <button
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-1.5 ${
                      aiSubTab === 'goal' ? 'btn-teal' : 'btn-light border text-secondary'
                    }`}
                    onClick={() => setAiSubTab('goal')}
                  >
                    <Compass size={14} />
                    <span>Find Books for My Career Goal</span>
                  </button>
                </div>
              </div>

              {/* SUB-TAB 1: CURATED AI RECOMMENDATIONS & SEARCH */}
              {aiSubTab === 'picks' && (
                <div>
                  {/* Dynamic AI Search Bar */}
                  <div className="bg-white rounded-4 border p-3 mb-4 shadow-xs">
                    <label className="fw-bold text-navy-900 small mb-2 d-flex align-items-center gap-1.5">
                      <Search size={15} className="text-teal-600" />
                      Search Any Book or Topic for Contextual AI Recommendations:
                    </label>
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Try 'Operating Systems', 'Machine Learning', 'Hamlet', 'Thirukkural', 'Kalki'..."
                        value={aiSearchQuery}
                        onChange={(e) => setAiSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') runAiSearch(aiSearchQuery);
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-teal px-4 flex-shrink-0"
                        onClick={() => runAiSearch(aiSearchQuery)}
                        disabled={loadingAiSearch}
                      >
                        {loadingAiSearch ? 'Analyzing...' : 'Get AI Picks'}
                      </button>
                    </div>
                  </div>

                  {/* AI Search Results */}
                  {aiSearchResults && (
                    <div className="bg-white rounded-4 border p-4 mb-4">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <h5 className="fw-bold text-navy-900 mb-0">
                          AI Contextual Results for "{aiSearchResults.query}"
                        </h5>
                        <button
                          type="button"
                          className="btn btn-sm btn-link text-muted"
                          onClick={() => setAiSearchResults(null)}
                        >
                          Clear Results
                        </button>
                      </div>

                      {aiSearchResults.relatedSubjects && aiSearchResults.relatedSubjects.length > 0 && (
                        <div className="d-flex align-items-center gap-1.5 mb-3 flex-wrap">
                          <span className="small text-muted fw-semibold">Related Concepts:</span>
                          {aiSearchResults.relatedSubjects.map((sub, i) => (
                            <span key={i} className="badge bg-light text-navy-900 border rounded-pill px-2.5 py-1 small">
                              {sub}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="student-book-grid">
                        {[...(aiSearchResults.exactMatches || []), ...(aiSearchResults.recommendations || [])].slice(0, 8).map(book => (
                          <div key={book.id} className="d-flex flex-column">
                            <BookCard
                              book={book}
                              onSelectBook={(b) => setSelectedBook(b)}
                            />
                            <div className="mt-1 px-1">
                              <span className="text-muted" style={{ fontSize: '0.72rem', lineHeight: '1.2' }}>
                                💡 {book.recommendation_reason || `Recommended because this book covers themes related to "${aiSearchResults.query}".`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Personalized Recommendations */}
                  <div className="bg-white rounded-4 border p-4">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <div>
                        <h5 className="fw-bold text-navy-900 mb-0">Recommended For Your Academic Journey</h5>
                        <p className="text-secondary small mb-0">
                          Based on curriculum enrollment, student borrowing history, and degree requirements.
                        </p>
                      </div>
                    </div>

                    {loadingAI ? (
                      <div className="text-center py-5 text-muted small">
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Computing personalized recommendations...
                      </div>
                    ) : (
                      <div className="student-book-grid">
                        {aiPicks.map(book => (
                          <div key={book.id} className="d-flex flex-column">
                            <BookCard
                              book={book}
                              onSelectBook={(b) => setSelectedBook(b)}
                            />
                            <div className="mt-1 px-1">
                              <span className="text-muted" style={{ fontSize: '0.72rem', lineHeight: '1.2' }}>
                                💡 {book.recommendation_reason || 'Highly relevant to your curriculum.'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: CAREER PATHS & EARNING OPPORTUNITIES */}
              {aiSubTab === 'career' && (
                <div>
                  {/* Topic Selector & Presets */}
                  <div className="bg-white rounded-4 border p-4 mb-4">
                    <h5 className="fw-bold text-navy-900 mb-2 d-flex align-items-center gap-2">
                      <Briefcase size={20} className="text-teal-600" />
                      Explore Career Paths & Earning Opportunities By Subject
                    </h5>
                    <p className="text-secondary small mb-3">
                      Discover the exact skills books teach, industry careers they open up, and realistic earning benchmarks.
                    </p>

                    {/* Quick Presets */}
                    <div className="d-flex align-items-center gap-1.5 flex-wrap mb-3">
                      <span className="small text-muted fw-semibold me-1">Quick Select:</span>
                      {[
                        'Machine Learning',
                        'Web Development',
                        'Shakespeare',
                        'Tamil Literature',
                        'Cybersecurity',
                        'Operating Systems',
                        'Business'
                      ].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          className={`btn btn-xs py-1 px-2.5 rounded-pill small ${
                            careerSearchInput === preset ? 'btn-teal text-white fw-semibold' : 'btn-light border text-secondary'
                          }`}
                          style={{ fontSize: '0.78rem' }}
                          onClick={() => {
                            setCareerSearchInput(preset);
                            fetchCareerInfo(preset);
                          }}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    {/* Search Custom Subject */}
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Type any book title or field (e.g. Python, Algorithms, Thirukkural, Hamlet)..."
                        value={careerSearchInput}
                        onChange={(e) => setCareerSearchInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') fetchCareerInfo(careerSearchInput);
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-teal px-4 flex-shrink-0"
                        onClick={() => fetchCareerInfo(careerSearchInput)}
                        disabled={loadingCareer}
                      >
                        {loadingCareer ? 'Analyzing...' : 'Inspect Career'}
                      </button>
                    </div>
                  </div>

                  {/* Career & Earning Guidance Display */}
                  {loadingCareer ? (
                    <div className="text-center py-5 bg-white rounded-4 border">
                      <div className="spinner-border text-teal-600" role="status"></div>
                      <div className="mt-2 text-muted small">Synthesizing career opportunities and salary benchmarks...</div>
                    </div>
                  ) : careerData ? (
                    <div className="bg-white rounded-4 border p-4 mb-4">
                      {/* Domain Header */}
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 pb-3 mb-4 border-bottom">
                        <div>
                          <span className="badge-active-teal px-3 py-1 rounded-pill small fw-semibold mb-1 d-inline-block">
                            Subject Domain
                          </span>
                          <h4 className="fw-bold text-navy-900 mb-0">{careerData.domain}</h4>
                        </div>

                        {/* Currency Toggle */}
                        <div className="d-flex align-items-center gap-1.5 p-1 bg-light rounded-pill border">
                          <button
                            type="button"
                            className={`btn btn-sm rounded-pill px-3 py-1 small fw-semibold ${
                              careerCurrency === 'india' ? 'btn-navy text-white shadow-xs' : 'btn-light text-secondary border-0'
                            }`}
                            onClick={() => setCareerCurrency('india')}
                          >
                            India (₹ INR)
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm rounded-pill px-3 py-1 small fw-semibold ${
                              careerCurrency === 'global' ? 'btn-navy text-white shadow-xs' : 'btn-light text-secondary border-0'
                            }`}
                            onClick={() => setCareerCurrency('global')}
                          >
                            Global ($ USD)
                          </button>
                        </div>
                      </div>

                      {/* 2-Column Grid: Skills & Careers */}
                      <div className="row g-4 mb-4">
                        {/* Skills Learned */}
                        <div className="col-12 col-md-6">
                          <div className="p-3.5 rounded-3 bg-light border h-100">
                            <h6 className="fw-bold text-navy-900 mb-2.5 d-flex align-items-center gap-2">
                              <Award size={18} className="text-teal-600" />
                              Skills & Concepts You Can Learn
                            </h6>
                            <ul className="mb-0 ps-3 small text-secondary">
                              {careerData.skillsLearned.map((skill, i) => (
                                <li key={i} className="mb-1.5">{skill}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Possible Career Paths */}
                        <div className="col-12 col-md-6">
                          <div className="p-3.5 rounded-3 bg-light border h-100">
                            <h6 className="fw-bold text-navy-900 mb-2.5 d-flex align-items-center gap-2">
                              <Briefcase size={18} className="text-teal-600" />
                              Possible Career Paths
                            </h6>
                            <div className="d-flex flex-wrap gap-2 mb-2">
                              {careerData.careerPaths.map((role, i) => (
                                <span key={i} className="badge bg-white text-navy-900 border rounded-pill px-3 py-1.5 small fw-semibold shadow-xs">
                                  {role}
                                </span>
                              ))}
                            </div>
                            <div className="text-muted mt-2" style={{ fontSize: '0.74rem' }}>
                              *Roles generally require degree qualifications, portfolio projects, or certifications in addition to foundational reading.
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* How People Earn Money */}
                      <div className="mb-4 p-3.5 rounded-3 bg-light border">
                        <h6 className="fw-bold text-navy-900 mb-2 d-flex align-items-center gap-2">
                          <TrendingUp size={18} className="text-teal-600" />
                          How People Earn Money With These Skills
                        </h6>
                        <ul className="mb-0 ps-3 small text-secondary">
                          {careerData.realWorldApplications.map((app, i) => (
                            <li key={i} className="mb-1.5">{app}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Realistic Salary Benchmarks */}
                      {careerData.earningGuidance && (
                        <div className="p-4 rounded-4 border bg-white shadow-xs mb-4">
                          <div className="d-flex align-items-center justify-content-between mb-3">
                            <div className="d-flex align-items-center gap-2">
                              <DollarSign size={20} className="text-teal-600" />
                              <h5 className="fw-bold text-navy-900 mb-0">Realistic Compensation Benchmarks</h5>
                            </div>
                            <span className="badge bg-light text-muted border px-2.5 py-1 small">
                              Region: {careerCurrency === 'india' ? 'India (INR)' : 'Global / International (USD)'}
                            </span>
                          </div>

                          <div className="row g-3 mb-3">
                            <div className="col-12 col-md-4">
                              <div className="p-3 rounded-3 bg-light border text-center">
                                <div className="text-muted small fw-semibold mb-1">Entry-Level / Fresher</div>
                                <h4 className="fw-bold text-navy-900 mb-0">
                                  {careerCurrency === 'india'
                                    ? careerData.earningGuidance.india.entryLevel
                                    : careerData.earningGuidance.global.entryLevel}
                                </h4>
                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>First 0-2 years of career</div>
                              </div>
                            </div>

                            <div className="col-12 col-md-4">
                              <div className="p-3 rounded-3 bg-light border text-center">
                                <div className="text-muted small fw-semibold mb-1">Experienced Professional</div>
                                <h4 className="fw-bold text-teal-700 mb-0">
                                  {careerCurrency === 'india'
                                    ? careerData.earningGuidance.india.experienced
                                    : careerData.earningGuidance.global.experienced}
                                </h4>
                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>5+ years of verified industry work</div>
                              </div>
                            </div>

                            <div className="col-12 col-md-4">
                              <div className="p-3 rounded-3 bg-light border text-center">
                                <div className="text-muted small fw-semibold mb-1">Freelance / Contract Rates</div>
                                <h4 className="fw-bold text-navy-900 mb-0">
                                  {careerCurrency === 'india'
                                    ? careerData.earningGuidance.india.freelance
                                    : careerData.earningGuidance.global.freelance}
                                </h4>
                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>Per hour or client milestone</div>
                              </div>
                            </div>
                          </div>

                          {/* Source and Disclaimer */}
                          <div className="p-3 bg-light rounded-3 border">
                            <div className="small text-navy-900 fw-semibold mb-1 d-flex align-items-center gap-1.5">
                              <Globe size={14} className="text-teal-600" />
                              Data Source & Methodology:
                            </div>
                            <div className="text-muted small mb-2">
                              {careerData.earningGuidance.source}
                            </div>
                            <div className="text-muted small fst-italic" style={{ lineHeight: '1.4' }}>
                              ⚠️ <strong>Ethical Disclaimer:</strong> {careerData.earningGuidance.disclaimer}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Recommended Next Books From Catalog */}
                      {careerData.recommendedNextBooks && careerData.recommendedNextBooks.length > 0 && (
                        <div>
                          <div className="d-flex align-items-center justify-content-between mb-3">
                            <div className="d-flex align-items-center gap-2">
                              <BookOpen size={18} className="text-teal-600" />
                              <h5 className="fw-bold text-navy-900 mb-0">Recommended Library Books to Build These Skills</h5>
                            </div>
                            <span className="text-muted small">Available in College Library</span>
                          </div>

                          <div className="student-book-grid">
                            {careerData.recommendedNextBooks.map(book => (
                              <BookCard
                                key={book.id}
                                book={book}
                                onSelectBook={(b) => setSelectedBook(b)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {/* SUB-TAB 3: FIND BOOKS FOR MY CAREER GOAL */}
              {aiSubTab === 'goal' && (
                <div>
                  {/* Goal Selector */}
                  <div className="bg-white rounded-4 border p-4 mb-4">
                    <h5 className="fw-bold text-navy-900 mb-2 d-flex align-items-center gap-2">
                      <Compass size={20} className="text-teal-600" />
                      Find Books for My Career Goal
                    </h5>
                    <p className="text-secondary small mb-3">
                      Select your career target. The AI structures a 4-level textbook reading sequence using actual library books in stock.
                    </p>

                    {/* Goal Buttons Grid */}
                    <div className="row g-2">
                      {[
                        { id: 'aiml_engineer', label: '🤖 AI / ML Engineer' },
                        { id: 'software_developer', label: '💻 Software Developer' },
                        { id: 'web_developer', label: '🌐 Full-Stack Web Dev' },
                        { id: 'data_analyst', label: '📊 Data Analyst' },
                        { id: 'cybersecurity', label: '🛡️ Cybersecurity Defense' },
                        { id: 'english_literature', label: '🎭 English Literature & Drama' },
                        { id: 'tamil_scholar', label: '📜 Tamil Classical & Translation' },
                        { id: 'teaching_research', label: '🎓 Academic Teaching & Research' },
                        { id: 'business_entrepreneurship', label: '💼 Business & Startup' },
                        { id: 'personal_finance', label: '📈 Personal Finance & FinTech' }
                      ].map(g => (
                        <div key={g.id} className="col-12 col-sm-6 col-lg-4 col-xl">
                          <button
                            type="button"
                            className={`btn w-100 py-2.5 px-2 rounded-3 small fw-semibold text-truncate text-start ${
                              selectedGoal === g.id ? 'btn-teal' : 'btn-light border text-navy-900'
                            }`}
                            onClick={() => {
                              setSelectedGoal(g.id);
                              fetchRoadmap(g.id);
                            }}
                          >
                            {g.label}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Goal Stages Roadmap */}
                  {loadingRoadmap ? (
                    <div className="text-center py-5 bg-white rounded-4 border">
                      <div className="spinner-border text-teal-600" role="status"></div>
                      <div className="mt-2 text-muted small">Generating career progression path...</div>
                    </div>
                  ) : roadmapData ? (
                    <div>
                      {/* Goal Title Banner */}
                      <div className="p-3 bg-light rounded-3 border mb-4">
                        <h5 className="fw-bold text-navy-900 mb-1">{roadmapData.goalTitle}</h5>
                        <p className="text-secondary small mb-0">{roadmapData.description}</p>
                      </div>

                      {/* 4 Levels */}
                      <div className="d-flex flex-column gap-4">
                        {roadmapData.stages.map((stage, idx) => (
                          <div key={idx} className="bg-white rounded-4 border p-4 shadow-xs">
                            <div className="d-flex align-items-center gap-2 mb-3">
                              <span className="badge bg-teal-50 text-teal-700 border border-teal-200 rounded-pill px-3 py-1 small fw-bold">
                                Step {idx + 1}
                              </span>
                              <h5 className="fw-bold text-navy-900 mb-0">{stage.stageName}</h5>
                            </div>

                            <div className="student-book-grid">
                              {stage.books.map(b => (
                                <BookCard
                                  key={b.id}
                                  book={b}
                                  onSelectBook={(selected) => setSelectedBook(selected)}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
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
                <div className="table-responsive bg-white rounded-4 border shadow-xs">
                  <table className="table-clean">
                    <thead>
                      <tr>
                        <th>Book Details</th>
                        <th>Borrowed Date & Time</th>
                        <th>Return Due Date</th>
                        <th>Remaining Time (Live Countdown)</th>
                        <th>Borrowing Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeLoans.map(loan => (
                        <tr key={loan.transaction_id}>
                          <td>
                            <div className="d-flex align-items-center gap-2.5">
                              {loan.cover_image ? (
                                <img 
                                  src={loan.cover_image} 
                                  alt={loan.title} 
                                  className="rounded shadow-xs border flex-shrink-0"
                                  style={{ width: '42px', height: '58px', objectFit: 'cover' }}
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              ) : (
                                <div 
                                  className="rounded bg-light d-flex align-items-center justify-content-center text-muted border flex-shrink-0"
                                  style={{ width: '42px', height: '58px' }}
                                >
                                  <BookOpen size={20} />
                                </div>
                              )}
                              <div>
                                <div className="fw-bold text-navy-900 small">{loan.title}</div>
                                <div className="text-muted" style={{ fontSize: '0.74rem' }}>
                                  By {loan.author}
                                </div>
                                <div className="text-secondary" style={{ fontSize: '0.7rem' }}>
                                  Dept: <strong>{loan.book_department || 'CSE'}</strong> • Shelf: {loan.shelf_location || 'A1'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="text-navy-900 small fw-medium">{loan.issue_date}</div>
                            <span className="badge bg-light text-muted border rounded-pill" style={{ fontSize: '0.68rem' }}>
                              Duration: {loan.duration || '6 days'}
                            </span>
                          </td>
                          <td>
                            <strong className={loan.is_overdue ? 'text-danger' : 'text-navy-900'}>
                              {loan.due_date}
                            </strong>
                          </td>
                          <td>
                            <CountdownTimer 
                              dueDate={loan.due_date}
                              dueDateTimestamp={loan.due_date_timestamp}
                              status={loan.status}
                              isOverdue={loan.is_overdue}
                            />
                          </td>
                          <td>
                            {loan.is_overdue ? (
                              <span className={`badge-overdue badge-overdue-${loan.overdue_color}`}>
                                Active Overdue ({loan.days_overdue}d)
                              </span>
                            ) : (
                              <span className="badge-issued-blue px-2.5 py-1 rounded-pill small fw-semibold">
                                Active ({loan.days_left}d left)
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger rounded-pill py-1 px-2.5 small fw-semibold"
                                title="Return book to library"
                                onClick={() => handleReturn(loan.transaction_id, loan.title)}
                              >
                                Return Book
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-navy rounded-pill py-1 px-2.5 small"
                                onClick={() => handleRenew(loan.transaction_id, loan.title)}
                              >
                                Renew
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
                          <CountdownTimer 
                            dueDate={loan.due_date}
                            dueDateTimestamp={loan.due_date_timestamp}
                            status={loan.status}
                            isOverdue={loan.is_overdue}
                          />
                        </div>

                        <h5 className="fw-bold text-navy-900 mb-1">{loan.title}</h5>
                        <p className="text-muted small mb-3">By {loan.author}</p>

                        <div className="p-2.5 rounded-3 bg-light border d-flex justify-content-between text-secondary small mb-3">
                          <span>Issued: <strong>{loan.issue_date}</strong></span>
                          <span>Due: <strong className={loan.is_overdue ? 'text-danger' : 'text-navy-900'}>{loan.due_date}</strong></span>
                        </div>

                        {loan.is_overdue && (
                          <div className="text-danger small fw-semibold mb-3">
                            ⚠️ Late fine accrued: {formatINR(loan.accrued_fine)} (₹5.00/day)
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
                                  {formatINR(parseFloat(p.fine_amount) || (p.days_late * 5.00) || 25.00)}
                                </strong>
                              ) : (
                                <span className="text-muted small">₹0.00 (No Fine)</span>
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
              VIEW 8: NOTIFICATIONS (Feature 2 & 5)
             ============================================================== */}
          {activeNav === 'notifications' && (
            <div>
              <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <h3 className="fw-bold text-navy-900 mb-0" style={{ letterSpacing: '-0.02em' }}>
                      Library Notifications & Overdue Reminders
                    </h3>
                    {unreadNotificationsCount > 0 && (
                      <span className="badge bg-danger rounded-pill px-2.5 py-1 small fw-bold">
                        {unreadNotificationsCount} Unread
                      </span>
                    )}
                  </div>
                  <p className="text-secondary small mb-0 mt-1">
                    Notifications strictly scoped to your student account: <strong>{user?.contact_number || '+91 98765 43210'}</strong> ({user?.email})
                  </p>
                </div>
                <div className="d-flex align-items-center gap-2">
                  {unreadNotificationsCount > 0 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-teal d-flex align-items-center gap-1.5"
                      onClick={handleMarkAllAsRead}
                    >
                      <CheckCircle2 size={14} />
                      <span>Mark All as Read ({unreadNotificationsCount})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm btn-light border d-flex align-items-center gap-1.5"
                    onClick={() => fetchNotifications()}
                    disabled={loadingNotifications}
                  >
                    <Bell size={14} className="text-teal-600" />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {loadingNotifications ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-teal-600" role="status"></div>
                  <div className="mt-2 text-muted small">Loading your notifications...</div>
                </div>
              ) : notificationsList.length === 0 ? (
                <div className="text-center py-5 bg-white rounded-4 border">
                  <Bell size={36} className="text-muted mb-2 opacity-50" />
                  <h6 className="fw-bold text-navy-900 mb-1">No Active Alerts</h6>
                  <p className="text-secondary small mb-0">
                    You currently have no overdue reminder notices. Your borrowing records are clear.
                  </p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {notificationsList.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`notif-card p-3.5 rounded-3 border bg-white shadow-xs transition-all ${!notif.is_read ? 'border-teal' : ''}`}
                      style={{ 
                        borderLeft: notif.type === 'InApp' ? '4px solid #0d9488' : '4px solid #f59e0b',
                        backgroundColor: !notif.is_read ? '#f8fafc' : '#ffffff'
                      }}
                    >
                      <div className="notif-header-wrap d-flex align-items-start justify-content-between flex-wrap gap-2 mb-2">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <span className="fw-bold text-navy-900 small">
                            {notif.title || 'Library Book Overdue Reminder'}
                          </span>
                          <span className={`badge ${
                            notif.type === 'InApp' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-warning-subtle text-dark border border-warning'
                          } small px-2 py-0.5 rounded-pill fw-semibold`}>
                            {notif.type === 'InApp' ? 'In-App Notice' : 'Cellular SMS Alert'}
                          </span>
                          {!notif.is_read ? (
                            <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill small px-2 py-0.5">
                              ● Unread
                            </span>
                          ) : (
                            <span className="badge bg-light text-muted border rounded-pill small px-2 py-0.5">
                              Read
                            </span>
                          )}
                        </div>
                        <span className="text-muted" style={{ fontSize: '0.74rem' }}>
                          {notif.created_at}
                        </span>
                      </div>

                      {notif.book_title && (
                        <div className="text-teal-700 small fw-semibold mb-1">
                          📖 Book: {notif.book_title}
                        </div>
                      )}

                      <p className="small text-navy-900 mb-2 leading-relaxed" style={{ lineHeight: '1.55' }}>
                        {notif.message}
                      </p>

                      <div className="p-2.5 rounded bg-light border-start border-3 border-teal text-secondary small mb-2" style={{ fontSize: '0.76rem' }}>
                        📌 <strong>Action Instructions:</strong> {notif.return_instructions || 'Please return this book to the KCT AI Smart Library circulation desk or renewal kiosk immediately to prevent additional daily fines.'}
                      </div>

                      <div className="notif-footer-wrap d-flex align-items-center justify-content-between flex-wrap gap-2 pt-2 border-top text-secondary" style={{ fontSize: '0.74rem' }}>
                        <div className="d-flex align-items-center gap-3 flex-wrap">
                          {notif.due_date && (
                            <span>Due Date: <strong className="text-danger">{notif.due_date_formatted || notif.due_date}</strong></span>
                          )}
                          {notif.overdue_duration_text && notif.overdue_duration_text !== '0 minutes' && (
                            <span className="text-danger">Overdue: <strong>{notif.overdue_duration_text}</strong></span>
                          )}
                          <div>
                            SMS Status: <span className={`badge ${
                              notif.status === 'Delivered' || notif.status === 'Sent' 
                                ? 'bg-success-subtle text-success' 
                                : notif.status === 'Failed' 
                                ? 'bg-danger-subtle text-danger' 
                                : 'bg-secondary-subtle text-secondary'
                            } rounded-pill`}>{notif.status}</span>
                          </div>
                        </div>

                        <div>
                          {!notif.is_read ? (
                            <button
                              type="button"
                              className="btn btn-xs btn-outline-teal rounded-pill px-2.5 py-0.5 small fw-semibold"
                              onClick={() => handleMarkAsRead(notif.id)}
                            >
                              Mark as Read
                            </button>
                          ) : (
                            <span className="text-muted small">✓ Acknowledged</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
