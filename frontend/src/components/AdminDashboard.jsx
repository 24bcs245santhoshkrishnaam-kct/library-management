import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getAdminStats, 
  getAdminUsers, 
  createAdminUser, 
  updateAdminUser, 
  deleteAdminUser,
  importStudentsCSV,
  getPolicies,
  updatePolicy,
  getAuditLogs
} from '../services/api';
import { 
  Settings, 
  Users, 
  GraduationCap, 
  ShieldCheck, 
  BookOpen, 
  Database, 
  FileSpreadsheet, 
  Sliders, 
  Activity, 
  LogOut, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Phone, 
  Mail, 
  Trash2, 
  Edit2, 
  Send,
  Building2,
  Clock,
  Layers,
  BarChart3,
  Menu,
  X,
  Eye,
  EyeOff,
  Key,
  Lock
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  // Navigation: 'overview' | 'students' | 'librarians' | 'policies' | 'audit'
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Stats state
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Users state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [searchUser, setSearchUser] = useState('');

  // Policies state
  const [policies, setPolicies] = useState([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logSortOrder, setLogSortOrder] = useState('latest');
  const [userSortOrder, setUserSortOrder] = useState('latest');

  // Sorted users (Latest / Oldest / Name)
  const sortedUsers = useMemo(() => {
    const list = [...users];
    if (userSortOrder === 'latest') return list.sort((a, b) => (b.id || 0) - (a.id || 0));
    if (userSortOrder === 'oldest') return list.sort((a, b) => (a.id || 0) - (b.id || 0));
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [users, userSortOrder]);

  // Sorted audit logs (Latest / Oldest)
  const sortedAuditLogs = useMemo(() => {
    const list = [...auditLogs];
    if (logSortOrder === 'oldest') return list.sort((a, b) => (a.id || 0) - (b.id || 0));
    return list.sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [auditLogs, logSortOrder]);

  // Toast
  const [toast, setToast] = useState(null);

  // CSV Import Modal
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [csvText, setCsvText] = useState(`name,email,student_id,department,contact_number
Vikram Rathore,vikram@kct.ac.in,24BCS255,CSE,+91 98401 23456
Deepika Nair,deepika@kct.ac.in,24BAI180,AI AND MACHINE LEARNING,+91 98402 34567
Karthik Raja,karthik@kct.ac.in,24ECE110,ECE,+91 98403 45678`);
  const [importingCSV, setImportingCSV] = useState(false);

  // Add User Modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'student',
    student_id: '',
    department: 'CSE',
    year_semester: '1st Year (Sem 1)',
    contact_number: '+91 98765 43210'
  });
  const [submittingUser, setSubmittingUser] = useState(false);

  // Edit Student Details State
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentEditForm, setStudentEditForm] = useState({
    name: '',
    email: '',
    student_id: '',
    department: 'CSE',
    contact_number: '+91 98765 43210',
    account_status: 'active'
  });
  const [savingStudent, setSavingStudent] = useState(false);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await getAdminStats();
      setStats(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await getAdminUsers({
        role: activeTab === 'students' ? 'student' : activeTab === 'librarians' ? 'librarian' : userRoleFilter,
        search: searchUser.trim() || undefined
      });
      setUsers(res.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchPolicies = async () => {
    setLoadingPolicies(true);
    try {
      const res = await getPolicies();
      setPolicies(res.policies || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPolicies(false);
    }
  };

  const fetchAudit = async () => {
    setLoadingLogs(true);
    try {
      const res = await getAuditLogs();
      setAuditLogs(res.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'policies') {
      fetchPolicies();
    } else if (activeTab === 'audit') {
      fetchAudit();
    } else {
      fetchUsers();
    }
  }, [activeTab, userRoleFilter, searchUser]);

  // Toggle user account status
  const handleToggleStatus = async (targetUser) => {
    const nextStatus = targetUser.account_status === 'active' ? 'suspended' : 'active';
    // Immediate UI update
    setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, account_status: nextStatus } : u));
    try {
      await updateAdminUser(targetUser.id, { account_status: nextStatus });
      setToast({ type: 'success', message: `Account for ${targetUser.name} set to ${nextStatus.toUpperCase()}.` });
      await fetchUsers();
    } catch (err) {
      setToast({ type: 'danger', message: err.response?.data?.message || 'Failed to update status' });
      await fetchUsers();
    }
  };

  // Delete user
  const handleDeleteUser = async (targetUser) => {
    if (!window.confirm(`Permanently remove ${targetUser.name} from library users?`)) return;
    // Immediate UI update
    setUsers(prev => prev.filter(u => u.id !== targetUser.id));
    try {
      await deleteAdminUser(targetUser.id);
      setToast({ type: 'success', message: `User ${targetUser.name} removed from system.` });
      await Promise.all([fetchUsers(), fetchStats()]);
    } catch (err) {
      setToast({ type: 'danger', message: err.response?.data?.message || 'Failed to delete user' });
      await fetchUsers();
    }
  };

  // Open Edit Student Details Modal
  const handleOpenEditStudent = (student) => {
    setEditingStudent(student);
    setStudentEditForm({
      name: student.name || '',
      email: student.email || '',
      student_id: student.student_id || '',
      department: student.department || 'CSE',
      contact_number: student.contact_number || '+91 98765 43210',
      account_status: student.account_status || 'active'
    });
  };

  // Save Student Details
  const handleSaveStudentDetails = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSavingStudent(true);

    // 1. Instantly reflect the change on the screen (0ms optimistic update)
    const updatedDetails = {
      ...editingStudent,
      name: studentEditForm.name,
      email: studentEditForm.email,
      student_id: studentEditForm.student_id,
      department: studentEditForm.department,
      contact_number: studentEditForm.contact_number,
      account_status: studentEditForm.account_status
    };
    setUsers(prev => prev.map(u => u.id === editingStudent.id ? updatedDetails : u));

    try {
      await updateAdminUser(editingStudent.id, studentEditForm);
      setToast({
        type: 'success',
        message: `Student "${studentEditForm.name}" details updated successfully.`
      });
      setEditingStudent(null);
      await fetchUsers();
    } catch (err) {
      setToast({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to update student details'
      });
      await fetchUsers();
    } finally {
      setSavingStudent(false);
    }
  };

  // Add User Submit
  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    if (!newUserForm.name?.trim() || !newUserForm.email?.trim()) {
      setToast({ type: 'danger', message: 'Student Name and Personal Email ID are required.' });
      return;
    }
    if (!newUserForm.password || newUserForm.password.trim().length < 4) {
      setToast({ type: 'danger', message: 'Password must be at least 4 characters long.' });
      return;
    }
    if (newUserForm.role === 'student' && !newUserForm.student_id?.trim()) {
      setToast({ type: 'danger', message: 'Register Number / Roll No is required for students.' });
      return;
    }

    setSubmittingUser(true);
    try {
      const res = await createAdminUser(newUserForm);
      setToast({ type: 'success', message: res.message || 'Student account created successfully with active credentials!' });
      setShowAddUserModal(false);
      setShowPassword(false);
      // Immediately reflect new user in state
      const optimisticUser = {
        id: res.user_id || Date.now(),
        username: newUserForm.username || newUserForm.email.split('@')[0],
        name: newUserForm.name,
        email: newUserForm.email,
        role: newUserForm.role || 'student',
        student_id: newUserForm.student_id,
        department: newUserForm.department || 'CSE',
        contact_number: newUserForm.contact_number,
        account_status: 'active',
        total_loans: 0,
        active_loans: 0,
        created_at: new Date().toISOString().split('T')[0]
      };
      setUsers(prev => [optimisticUser, ...prev]);
      setNewUserForm({
        name: '',
        email: '',
        username: '',
        password: '',
        role: 'student',
        student_id: '',
        department: 'CSE',
        year_semester: '1st Year (Sem 1)',
        contact_number: '+91 98765 43210'
      });
      await Promise.all([fetchUsers(), fetchStats()]);
    } catch (err) {
      setToast({ type: 'danger', message: err.response?.data?.message || err.message || 'Failed to create student account' });
    } finally {
      setSubmittingUser(false);
    }
  };

  // Handle CSV Import
  const handleImportCSVSubmit = async (e) => {
    e.preventDefault();
    setImportingCSV(true);
    try {
      const res = await importStudentsCSV({ csv_data: csvText });
      setToast({ type: 'success', message: res.message || `Successfully imported ${res.importedCount} student records!` });
      setShowCSVModal(false);
      await Promise.all([fetchUsers(), fetchStats()]);
    } catch (err) {
      setToast({ type: 'danger', message: err.response?.data?.message || 'CSV Import failed' });
    } finally {
      setImportingCSV(false);
    }
  };

  // Handle Policy Update
  const handleSavePolicy = async (key, value) => {
    try {
      await updatePolicy(key, value);
      setToast({ type: 'success', message: `Policy "${key}" updated to ${value}.` });
      await fetchPolicies();
    } catch (err) {
      setToast({ type: 'danger', message: 'Failed to update policy' });
    }
  };

  return (
    <div className="portal-layout">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="portal-sidebar-backdrop d-lg-none"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Admin Sidebar */}
      <aside className={`portal-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="portal-sidebar-header">
          <div 
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Settings size={22} className="text-white" />
          </div>
          <div className="flex-grow-1">
            <h6 className="fw-bold mb-0 text-navy-900" style={{ fontSize: '0.94rem' }}>KCT AI Smart Library</h6>
            <span className="text-muted" style={{ fontSize: '0.72rem' }}>Chief Administrator</span>
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

        <nav className="portal-sidebar-nav">
          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }}
          >
            <BarChart3 size={18} />
            <span>Overview & Analytics</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => { setActiveTab('students'); setSidebarOpen(false); }}
          >
            <GraduationCap size={18} />
            <span>Manage Students (20)</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === 'librarians' ? 'active' : ''}`}
            onClick={() => { setActiveTab('librarians'); setSidebarOpen(false); }}
          >
            <ShieldCheck size={18} />
            <span>Manage Librarians</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === 'policies' ? 'active' : ''}`}
            onClick={() => { setActiveTab('policies'); setSidebarOpen(false); }}
          >
            <Sliders size={18} />
            <span>Library Policies</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => { setActiveTab('audit'); setSidebarOpen(false); }}
          >
            <Activity size={18} />
            <span>Audit Activity Trail</span>
          </button>
        </nav>

        <div className="portal-sidebar-footer">
          <div className="d-flex align-items-center gap-2 mb-3">
            <div 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#e0e7ff',
                color: '#3730a3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}
            >
              A
            </div>
            <div className="overflow-hidden">
              <div className="fw-semibold text-navy-900 text-truncate" style={{ fontSize: '0.82rem' }}>
                {user?.name || 'Dr. Arun'}
              </div>
              <div className="text-muted text-truncate" style={{ fontSize: '0.7rem' }}>
                Chief Administrator
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
            <button
              type="button"
              className="btn btn-sm btn-light border d-lg-none d-flex align-items-center justify-content-center p-2 rounded-3"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle Navigation Menu"
              title="Toggle Menu"
            >
              <Menu size={18} className="text-dark" />
            </button>
            <span className="badge bg-primary-subtle text-primary px-2.5 py-1 rounded-pill small fw-semibold">
              Administrator Console
            </span>
            <span className="text-muted small">
              Institutional Governance & Security
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-teal btn-sm d-flex align-items-center gap-1.5"
              onClick={() => setShowCSVModal(true)}
            >
              <FileSpreadsheet size={15} />
              <span>Import Students CSV</span>
            </button>
            <button
              type="button"
              className="btn btn-navy btn-sm d-flex align-items-center gap-1.5"
              onClick={() => {
                setNewUserForm({
                  name: '',
                  email: '',
                  username: '',
                  password: 'Welcome@2026',
                  role: activeTab === 'librarians' ? 'librarian' : 'student',
                  student_id: '',
                  department: 'CSE',
                  contact_number: '+91 98765 43210'
                });
                setShowAddUserModal(true);
              }}
            >
              <Plus size={15} />
              <span>Add User</span>
            </button>
          </div>
        </header>

        {/* Toast */}
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
              VIEW 1: OVERVIEW & ANALYTICS
             ============================================================== */}
          {activeTab === 'overview' && (
            <div>
              <div className="mb-4">
                <h3 className="fw-bold text-navy-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
                  Institutional System Health & Metrics
                </h3>
                <p className="text-secondary small mb-0">Live MySQL 9.4 database synchronization across books, students, and circulation records.</p>
              </div>

              {/* KPI Stat Cards */}
              <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl">
                  <div className="stat-card">
                    <span className="text-muted small fw-semibold">Total Catalog Titles</span>
                    <h3 className="fw-bold text-navy-900 mb-0 mt-1">{stats?.books?.total_titles || 525}</h3>
                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>Physical titles indexed</span>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-xl">
                  <div className="stat-card">
                    <span className="text-muted small fw-semibold">Total Physical Copies</span>
                    <h3 className="fw-bold text-navy-900 mb-0 mt-1">{stats?.books?.total_copies || 2500}</h3>
                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>{stats?.books?.available_copies || 2480} currently in stacks</span>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-xl">
                  <div className="stat-card">
                    <span className="text-muted small fw-semibold">Active Student Loans</span>
                    <h3 className="fw-bold text-navy-900 mb-0 mt-1">{stats?.transactions?.active_loans_count || 10}</h3>
                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>Across departments</span>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-xl">
                  <div className="stat-card">
                    <span className="text-muted small fw-semibold">Overdue Books</span>
                    <h3 className="fw-bold text-danger mb-0 mt-1">{stats?.transactions?.overdue_count || 4}</h3>
                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>Prioritized for recovery</span>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-xl">
                  <div className="stat-card">
                    <span className="text-muted small fw-semibold">Registered Students</span>
                    <h3 className="fw-bold text-navy-900 mb-0 mt-1">{stats?.users?.students_count || 20}</h3>
                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>Seeded demo accounts</span>
                  </div>
                </div>
              </div>

              {/* Department Catalog Distribution */}
              <div className="row g-4">
                <div className="col-12 col-md-6">
                  <div className="p-4 rounded-4 bg-white border">
                    <h5 className="fw-bold text-navy-900 mb-3">Department Textbook Distribution</h5>
                    <div className="d-flex flex-column gap-2">
                      {stats?.departments?.map(d => (
                        <div key={d.department} className="d-flex align-items-center justify-content-between p-2 rounded-3 bg-light border-bottom">
                          <span className="fw-semibold small text-navy-900">{d.department}</span>
                          <span className="badge-active-teal px-2 py-0.5 rounded-pill small fw-bold">{d.count} Books</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="p-4 rounded-4 bg-white border">
                    <h5 className="fw-bold text-navy-900 mb-3">Institutional Governance Summary</h5>
                    <div className="p-3 rounded-3 bg-light border mb-3">
                      <div className="d-flex justify-content-between text-secondary small mb-2">
                        <span>Database Engine:</span>
                        <strong className="text-navy-900">MySQL 9.4 Community Server</strong>
                      </div>
                      <div className="d-flex justify-content-between text-secondary small mb-2">
                        <span>Database Name:</span>
                        <strong className="text-navy-900">smart_library</strong>
                      </div>
                      <div className="d-flex justify-content-between text-secondary small mb-2">
                        <span>AI Recommendation Engine:</span>
                        <strong className="text-teal-600">TF-IDF Vector + Curriculum Graph</strong>
                      </div>
                      <div className="d-flex justify-content-between text-secondary small">
                        <span>Total SMS Notifications Sent:</span>
                        <strong className="text-navy-900">{stats?.transactions?.total_sms_sent || 0} alerts</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              VIEW 2: MANAGE STUDENTS (20 SEEDED STUDENTS + REAL CSV)
             ============================================================== */}
          {activeTab === 'students' && (
            <div>
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
                <div>
                  <h3 className="fw-bold text-navy-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
                    Student Management ({users.length} Registered)
                  </h3>
                  <p className="text-secondary small mb-0">
                    Includes 20 distinct seeded student demo accounts (Santhosh Krishna, Parthipan, Rupak, Prawin, Paramasivam, etc.)
                  </p>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <select
                    className="form-select form-select-sm rounded-pill px-3"
                    value={userSortOrder}
                    onChange={e => setUserSortOrder(e.target.value)}
                    style={{ width: '155px' }}
                  >
                    <option value="latest">Sort: Latest First</option>
                    <option value="oldest">Sort: Oldest First</option>
                    <option value="name">Sort: Name (A-Z)</option>
                  </select>
                  <input
                    type="text"
                    className="form-control form-control-sm rounded-pill px-3"
                    placeholder="Search by name, email, roll no..."
                    value={searchUser}
                    onChange={e => setSearchUser(e.target.value)}
                    style={{ width: '220px' }}
                  />
                  <button
                    type="button"
                    className="btn btn-navy btn-sm d-flex align-items-center gap-1.5"
                    onClick={() => {
                      setNewUserForm({
                        name: '',
                        email: '',
                        username: '',
                        password: '',
                        role: 'student',
                        student_id: '',
                        department: 'CSE',
                        year_semester: '1st Year (Sem 1)',
                        contact_number: '+91 98765 43210'
                      });
                      setShowPassword(false);
                      setShowAddUserModal(true);
                    }}
                  >
                    <Plus size={15} />
                    <span>Add Student</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-teal btn-sm"
                    onClick={() => setShowCSVModal(true)}
                  >
                    <FileSpreadsheet size={15} />
                    <span>CSV Ingestion</span>
                  </button>
                </div>
              </div>

              {loadingUsers ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-navy-900" role="status"></div>
                </div>
              ) : (
                <div className="table-responsive bg-white rounded-4 border shadow-xs">
                  <table className="table-clean">
                    <thead>
                      <tr>
                        <th>Student Name & Roll No</th>
                        <th>College Email</th>
                        <th>Department</th>
                        <th>Contact Number</th>
                        <th>Status</th>
                        <th>Active Loans</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedUsers.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div className="fw-bold text-navy-900">{u.name}</div>
                            <div className="text-muted" style={{ fontSize: '0.74rem' }}>
                              Roll: <strong>{u.student_id || 'STU' + u.id}</strong> {u.is_demo ? '• Demo Account' : ''}
                            </div>
                          </td>
                          <td><code>{u.email}</code></td>
                          <td><span className="badge-active-teal px-2 py-0.5 rounded-pill small">{u.department || 'CSE'}</span></td>
                          <td>
                            <div className="small text-secondary">{u.contact_number || '+91 98765 43210'}</div>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`btn btn-sm py-0.5 px-2.5 rounded-pill small fw-semibold ${
                                u.account_status === 'active' 
                                  ? 'btn-outline-success' 
                                  : 'btn-outline-danger'
                              }`}
                              onClick={() => handleToggleStatus(u)}
                            >
                              {u.account_status === 'active' ? 'Active' : 'Suspended'}
                            </button>
                          </td>
                          <td>
                            <strong className={u.active_loans > 0 ? 'text-primary' : 'text-muted'}>
                              {u.active_loans || 0}
                            </strong>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-light border text-secondary p-1.5"
                                title="Edit Student Information Details"
                                onClick={() => handleOpenEditStudent(u)}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-light border text-danger p-1.5"
                                title="Delete Student"
                                onClick={() => handleDeleteUser(u)}
                              >
                                <Trash2 size={13} />
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
              VIEW 3: MANAGE LIBRARIANS
             ============================================================== */}
          {activeTab === 'librarians' && (
            <div>
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                  <h3 className="fw-bold text-navy-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
                    Librarian Staff Accounts
                  </h3>
                  <p className="text-secondary small mb-0">Authorized personnel for circulation desks and catalog maintenance.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-navy btn-sm"
                  onClick={() => {
                    setNewUserForm({
                      name: '',
                      email: '',
                      username: '',
                      password: 'Welcome@2026',
                      role: 'librarian',
                      student_id: '',
                      department: 'Library Department',
                      contact_number: '+91 98765 43210'
                    });
                    setShowAddUserModal(true);
                  }}
                >
                  <Plus size={15} />
                  <span>Add Librarian</span>
                </button>
              </div>

              {loadingUsers ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-navy-900" role="status"></div>
                </div>
              ) : (
                <div className="table-responsive bg-white rounded-4 border shadow-xs">
                  <table className="table-clean">
                    <thead>
                      <tr>
                        <th>Librarian Name</th>
                        <th>Email</th>
                        <th>Department</th>
                        <th>Contact</th>
                        <th>Role</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div className="fw-bold text-navy-900">{u.name}</div>
                          </td>
                          <td><code>{u.email}</code></td>
                          <td>{u.department || 'Library Staff'}</td>
                          <td>{u.contact_number}</td>
                          <td><span className="badge bg-primary px-2.5 py-1 rounded-pill small">Librarian</span></td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-light border text-danger p-1.5"
                              title="Delete"
                              onClick={() => handleDeleteUser(u)}
                            >
                              <Trash2 size={13} />
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
              VIEW 4: LIBRARY POLICIES
             ============================================================== */}
          {activeTab === 'policies' && (
            <div>
              <div className="mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div>
                  <h3 className="fw-bold text-navy-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
                    Institutional Library Policies & Limits
                  </h3>
                  <p className="text-secondary small mb-0">
                    Changes take effect immediately on both Student and Circulation desks without server restart.
                  </p>
                </div>
                <div className="badge-active-teal px-3 py-1.5 rounded-pill small fw-semibold">
                  ⚡ Live Dynamic Synchronization Active
                </div>
              </div>

              {loadingPolicies ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-navy-900" role="status"></div>
                </div>
              ) : (
                <div className="row g-4">
                  {policies.map(p => {
                    const policyTitles = {
                      loan_period_days: 'Standard Loan Period (Days)',
                      max_books_per_student: 'Maximum Active Books per Student',
                      fine_per_day: 'Daily Overdue Fine Rate (₹)',
                      grace_period_days: 'Grace Period (Days)',
                      sms_notifications_enabled: 'SMS & Email Notifications Enabled'
                    };
                    const title = policyTitles[p.policy_key] || p.policy_key;
                    return (
                      <div key={p.policy_key} className="col-12 col-md-6">
                        <div className="p-4 rounded-4 bg-white border shadow-xs h-100 d-flex flex-column justify-content-between">
                          <div>
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <span className="fw-bold text-navy-900">{title}</span>
                              <code className="text-secondary small">{p.policy_key}</code>
                            </div>
                            <p className="text-secondary small mb-3">{p.description}</p>
                          </div>
                          <div className="input-group">
                            <input
                              type="text"
                              className="form-control form-control-sm font-monospace"
                              defaultValue={p.policy_value}
                              id={`policy_val_${p.policy_key}`}
                            />
                            <button
                              type="button"
                              className="btn btn-navy btn-sm"
                              onClick={() => {
                                const el = document.getElementById(`policy_val_${p.policy_key}`);
                                if (el) handleSavePolicy(p.policy_key, el.value);
                              }}
                            >
                              Update Policy
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==============================================================
              VIEW 5: AUDIT ACTIVITY TRAIL
             ============================================================== */}
          {activeTab === 'audit' && (
            <div>
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
                <div>
                  <h3 className="fw-bold text-navy-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
                    Institutional Audit Trail ({auditLogs.length} Events)
                  </h3>
                  <p className="text-secondary small mb-0">Tamper-evident system activity log for administrative auditing.</p>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <select
                    className="form-select form-select-sm rounded-pill px-3"
                    value={logSortOrder}
                    onChange={e => setLogSortOrder(e.target.value)}
                    style={{ width: '165px' }}
                  >
                    <option value="latest">Sort: Latest Events</option>
                    <option value="oldest">Sort: Oldest Events</option>
                  </select>
                </div>
              </div>

              {loadingLogs ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-navy-900" role="status"></div>
                </div>
              ) : (
                <div className="table-responsive bg-white rounded-4 border shadow-xs">
                  <table className="table-clean">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Action</th>
                        <th>Target</th>
                        <th>Actor</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAuditLogs.map(log => (
                        <tr key={log.id}>
                          <td><span className="text-muted small">{log.created_at}</span></td>
                          <td><span className="badge bg-secondary px-2.5 py-1 rounded-pill small">{log.action}</span></td>
                          <td><code>{log.target_type}</code></td>
                          <td>
                            <strong className="text-navy-900 small">{log.actor_name || 'System'}</strong>
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>{log.actor_role}</div>
                          </td>
                          <td><span className="text-secondary small">{log.details}</span></td>
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

      {/* CSV Import Modal */}
      {showCSVModal && (
        <div className="modal-overlay" onClick={() => setShowCSVModal(false)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            <div className="p-4 border-bottom d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <FileSpreadsheet size={18} className="text-teal-600" />
                <h5 className="fw-bold text-navy-900 mb-0">Import Students via CSV</h5>
              </div>
              <button type="button" className="btn-close" onClick={() => setShowCSVModal(false)}></button>
            </div>

            <form onSubmit={handleImportCSVSubmit} className="p-4">
              <p className="text-secondary small mb-2">
                Paste student records with columns: <code>name,email,student_id,department,contact_number</code>
              </p>
              <textarea
                className="form-control font-monospace small mb-3"
                rows={7}
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                required
              />

              <div className="alert alert-info py-2 px-3 small rounded-3 mb-3">
                💡 Imported students will automatically have hashed initial credentials created with account status Active.
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => setShowCSVModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-teal btn-sm"
                  disabled={importingCSV}
                >
                  {importingCSV ? 'Importing Records...' : 'Import Students'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="p-4 border-bottom d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <div 
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Plus size={16} className="text-white" />
                </div>
                <div>
                  <h5 className="fw-bold text-navy-900 mb-0">
                    Add New {newUserForm.role === 'librarian' ? 'Librarian' : 'Student'}
                  </h5>
                  <span className="text-secondary" style={{ fontSize: '0.75rem' }}>
                    Create login credentials and student registration details
                  </span>
                </div>
              </div>
              <button type="button" className="btn-close" onClick={() => setShowAddUserModal(false)}></button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="p-4">
              {/* Name & Register No */}
              <div className="row g-3 mb-3">
                <div className="col-12 col-sm-7">
                  <label className="form-label small fw-semibold text-secondary mb-1">
                    Student Full Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control small"
                    placeholder="e.g. Santhosh Krishna"
                    required
                    value={newUserForm.name}
                    onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  />
                </div>
                <div className="col-12 col-sm-5">
                  <label className="form-label small fw-semibold text-secondary mb-1">
                    Register No / Roll No {newUserForm.role === 'student' && <span className="text-danger">*</span>}
                  </label>
                  <input
                    type="text"
                    className="form-control small font-monospace"
                    placeholder="e.g. 24BCS245"
                    required={newUserForm.role === 'student'}
                    value={newUserForm.student_id}
                    onChange={e => setNewUserForm({ ...newUserForm, student_id: e.target.value })}
                  />
                </div>
              </div>

              {/* Personal Email ID */}
              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary mb-1">
                  Personal / College Email ID <span className="text-danger">*</span>
                  <span className="text-muted fw-normal ms-1">(Used to log into portal)</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-secondary">
                    <Mail size={14} />
                  </span>
                  <input
                    type="email"
                    className="form-control small"
                    placeholder="student@kct.ac.in"
                    required
                    value={newUserForm.email}
                    onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Password with Show/Hide toggle */}
              <div className="mb-3">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <label className="form-label small fw-semibold text-secondary mb-0">
                    Account Password <span className="text-danger">*</span>
                  </label>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-primary small text-decoration-none"
                    style={{ fontSize: '0.74rem' }}
                    onClick={() => {
                      const randomPass = 'Pass@' + Math.floor(1000 + Math.random() * 9000);
                      setNewUserForm({ ...newUserForm, password: randomPass });
                      setShowPassword(true);
                    }}
                  >
                    Generate Random
                  </button>
                </div>
                <div className="input-group">
                  <span className="input-group-text bg-light text-secondary">
                    <Lock size={14} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control small font-monospace"
                    placeholder="Enter secure password (min 4 chars)"
                    required
                    value={newUserForm.password}
                    onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn btn-light border text-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                  Passwords are securely hashed with bcrypt (salt rounds: 10) before saving.
                </div>
              </div>

              {/* Department & Year/Semester */}
              <div className="row g-3 mb-3">
                <div className="col-12 col-sm-6">
                  <label className="form-label small fw-semibold text-secondary mb-1">Department</label>
                  <select
                    className="form-select small"
                    value={newUserForm.department}
                    onChange={e => setNewUserForm({ ...newUserForm, department: e.target.value })}
                  >
                    <option value="CSE">CSE (Computer Science)</option>
                    <option value="AI AND MACHINE LEARNING">AI & Data Science / ML</option>
                    <option value="ECE">ECE (Electronics & Comm)</option>
                    <option value="EEE">EEE (Electrical & Electronics)</option>
                    <option value="MECHANICAL">Mechanical Engineering</option>
                    <option value="CIVIL & BASIC SCIENCES">Civil & Basic Sciences</option>
                  </select>
                </div>
                <div className="col-12 col-sm-6">
                  <label className="form-label small fw-semibold text-secondary mb-1">Year / Semester</label>
                  <select
                    className="form-select small"
                    value={newUserForm.year_semester || '1st Year (Sem 1)'}
                    onChange={e => setNewUserForm({ ...newUserForm, year_semester: e.target.value })}
                  >
                    <option value="1st Year (Sem 1)">1st Year (Sem 1)</option>
                    <option value="1st Year (Sem 2)">1st Year (Sem 2)</option>
                    <option value="2nd Year (Sem 3)">2nd Year (Sem 3)</option>
                    <option value="2nd Year (Sem 4)">2nd Year (Sem 4)</option>
                    <option value="3rd Year (Sem 5)">3rd Year (Sem 5)</option>
                    <option value="3rd Year (Sem 6)">3rd Year (Sem 6)</option>
                    <option value="4th Year (Sem 7)">4th Year (Sem 7)</option>
                    <option value="4th Year (Sem 8)">4th Year (Sem 8)</option>
                  </select>
                </div>
              </div>

              {/* Contact Phone */}
              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary mb-1">Contact Phone Number</label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-secondary">
                    <Phone size={14} />
                  </span>
                  <input
                    type="text"
                    className="form-control small"
                    placeholder="+91 98765 43210"
                    value={newUserForm.contact_number}
                    onChange={e => setNewUserForm({ ...newUserForm, contact_number: e.target.value })}
                  />
                </div>
              </div>

              {/* Security info card */}
              <div className="p-2.5 rounded-3 bg-light border mb-4 d-flex align-items-start gap-2">
                <CheckCircle2 size={16} className="text-success mt-0.5 flex-shrink-0" />
                <div className="small text-secondary" style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                  <strong>Instant Student Portal Access:</strong> The student can log in right away using this <strong>Email ID</strong> and <strong>Password</strong>.
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => setShowAddUserModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-navy btn-sm" disabled={submittingUser}>
                  {submittingUser ? 'Registering Student...' : 'Register Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Information Details Modal */}
      {editingStudent && (
        <div className="modal-overlay" onClick={() => setEditingStudent(null)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="p-4 border-bottom d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <Edit2 size={18} className="text-teal-600" />
                <h5 className="fw-bold text-navy-900 mb-0">Edit Student Information Details</h5>
              </div>
              <button type="button" className="btn-close" onClick={() => setEditingStudent(null)}></button>
            </div>

            <form onSubmit={handleSaveStudentDetails} className="p-4">
              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">Student Full Name</label>
                <input
                  type="text"
                  className="form-control small"
                  required
                  value={studentEditForm.name}
                  onChange={e => setStudentEditForm({ ...studentEditForm, name: e.target.value })}
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">College Email Address</label>
                <input
                  type="email"
                  className="form-control small"
                  required
                  value={studentEditForm.email}
                  onChange={e => setStudentEditForm({ ...studentEditForm, email: e.target.value })}
                />
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold text-secondary">Roll Number / Student ID</label>
                  <input
                    type="text"
                    className="form-control small"
                    value={studentEditForm.student_id}
                    onChange={e => setStudentEditForm({ ...studentEditForm, student_id: e.target.value })}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold text-secondary">Academic Department</label>
                  <select
                    className="form-select small"
                    value={studentEditForm.department}
                    onChange={e => setStudentEditForm({ ...studentEditForm, department: e.target.value })}
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

              <div className="row g-2 mb-4">
                <div className="col-6">
                  <label className="form-label small fw-semibold text-secondary">Contact Phone Number</label>
                  <input
                    type="text"
                    className="form-control small"
                    value={studentEditForm.contact_number}
                    onChange={e => setStudentEditForm({ ...studentEditForm, contact_number: e.target.value })}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold text-secondary">Account Status</label>
                  <select
                    className="form-select small"
                    value={studentEditForm.account_status}
                    onChange={e => setStudentEditForm({ ...studentEditForm, account_status: e.target.value })}
                  >
                    <option value="active">Active (Full Borrowing Privileges)</option>
                    <option value="suspended">Suspended (Borrowing Blocked)</option>
                  </select>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => setEditingStudent(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-teal btn-sm"
                  disabled={savingStudent}
                >
                  {savingStudent ? 'Saving...' : 'Save Student Information'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
