import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to add Authorization Bearer token from localStorage
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('smart_library_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Book search & details API
export const getBooks = async (params = {}) => {
  const res = await API.get('/books', { params });
  return res.data;
};

export const searchBooks = async (params = {}) => {
  const res = await API.get('/books', { params });
  return res.data;
};

export const getBookDetails = async (id) => {
  const res = await API.get(`/books/${id}`);
  return res.data;
};

export const getRelatedBooks = async (id, limit = 6) => {
  const res = await API.get(`/books/${id}/related`, { params: { limit } });
  return res.data;
};

export const getCatalogueFilters = async () => {
  const res = await API.get('/books/filters');
  return res.data;
};

export const getDepartments = async () => {
  const res = await API.get('/books/departments');
  return res.data;
};

export const getRecommendations = async (params = {}) => {
  const res = await API.get('/books/recommendations', { params });
  return res.data;
};

export const getPersonalizedBooks = async () => {
  const res = await API.get('/books/personalized');
  return res.data;
};

export const getCareerGuidance = async (params = {}) => {
  const res = await API.get('/books/career-guidance', { params });
  return res.data;
};

export const getCareerRoadmap = async (goal = 'aiml_engineer') => {
  const res = await API.get('/books/career-roadmap', { params: { goal } });
  return res.data;
};

export const createBook = async (bookData) => {
  const res = await API.post('/books', bookData);
  return res.data;
};

export const updateBook = async (id, bookData) => {
  const res = await API.put(`/books/${id}`, bookData);
  return res.data;
};

export const deleteBook = async (id) => {
  const res = await API.delete(`/books/${id}`);
  return res.data;
};

// AI Chatbot API
export const sendChatMessage = async (message) => {
  const res = await API.post('/ai/chat', { message });
  return res.data;
};

// Borrowing & Loan APIs
export const getMyLoans = async () => {
  const res = await API.get('/loans/my');
  return res.data;
};

export const getMyLoanStatus = async () => {
  const res = await API.get('/loans/my/status');
  return res.data;
};

export const getStudentNotifications = async () => {
  const res = await API.get('/loans/my/notifications');
  return res.data;
};

export const markNotificationAsRead = async (id) => {
  const res = await API.put(`/loans/my/notifications/${id}/read`);
  return res.data;
};

export const markAllNotificationsAsRead = async () => {
  const res = await API.put('/loans/my/notifications/read-all');
  return res.data;
};

export const clearStudentNotifications = async () => {
  const res = await API.delete('/loans/my/notifications');
  return res.data;
};

export const clearSingleStudentNotification = async (id) => {
  const res = await API.delete(`/loans/my/notifications/${id}`);
  return res.data;
};

export const getBorrowingMode = async () => {
  const res = await API.get('/loans/borrowing-mode');
  return res.data;
};

export const updateBorrowingMode = async (mode) => {
  const res = await API.post('/loans/borrowing-mode', { mode });
  return res.data;
};

export const borrowBookOnline = async (bookId, duration = '6 days') => {
  const res = await API.post('/loans/borrow', { bookId, duration });
  return res.data;
};

export const renewBookLoan = async (loanId) => {
  const res = await API.post(`/loans/${loanId}/renew`);
  return res.data;
};

// Librarian circulation APIs
export const getAllLoans = async (params = {}) => {
  const res = await API.get('/loans', { params });
  return res.data;
};

export const returnBookLoan = async (loanId) => {
  const res = await API.post(`/loans/${loanId}/return`);
  return res.data;
};

export const updateLoanDetails = async (loanId, loanData) => {
  const res = await API.put(`/loans/${loanId}`, loanData);
  return res.data;
};

export const issueBookLoan = async (payload) => {
  const res = await API.post('/loans/issue', payload);
  return res.data;
};

export const getRegisteredStudents = async () => {
  const res = await API.get('/auth/students');
  return res.data;
};

// Dedicated Librarian Notifications APIs
export const getLibrarianNotifications = async () => {
  const res = await API.get('/loans/librarian-notifications');
  return res.data;
};

export const markLibrarianNotificationRead = async (id) => {
  const res = await API.put(`/loans/librarian-notifications/${id}/read`);
  return res.data;
};

export const markAllLibrarianNotificationsRead = async () => {
  const res = await API.put('/loans/librarian-notifications/read-all');
  return res.data;
};

export const clearLibrarianNotifications = async () => {
  const res = await API.delete('/loans/librarian-notifications/clear');
  return res.data;
};

// Dynamic Library Policies (All Users)
export const getActivePolicies = async () => {
  const res = await API.get('/loans/policies');
  return res.data;
};

// SMS Notifications APIs
export const previewOverdueSMS = async (loanId) => {
  const res = await API.get(`/sms/preview/${loanId}`);
  return res.data;
};

export const sendOverdueSMS = async (loanId, message) => {
  const res = await API.post(`/sms/send/${loanId}`, { message });
  return res.data;
};

export const sendBulkOverdueSMS = async (loanIds) => {
  const res = await API.post('/sms/send-bulk', { loanIds });
  return res.data;
};

export const getSMSLogs = async () => {
  const res = await API.get('/sms/logs');
  return res.data;
};

export const runAutoOverdueCheck = async () => {
  const res = await API.post('/sms/run-auto-check');
  return res.data;
};

export const getSchedulerStatus = async () => {
  const res = await API.get('/sms/scheduler-status');
  return res.data;
};

// Admin APIs
export const getAdminStats = async () => {
  const res = await API.get('/admin/stats');
  return res.data;
};

export const getAdminUsers = async (params = {}) => {
  const res = await API.get('/admin/users', { params });
  return res.data;
};

export const createAdminUser = async (userData) => {
  const res = await API.post('/admin/users', userData);
  return res.data;
};

export const updateAdminUser = async (userId, userData) => {
  const res = await API.put(`/admin/users/${userId}`, userData);
  return res.data;
};

export const deleteAdminUser = async (userId) => {
  const res = await API.delete(`/admin/users/${userId}`);
  return res.data;
};

export const importStudentsCSV = async (payload) => {
  const res = await API.post('/admin/students/import-csv', payload);
  return res.data;
};

export const getPolicies = async () => {
  const res = await API.get('/admin/policies');
  return res.data;
};

export const updatePolicy = async (key, value, description) => {
  const res = await API.put(`/admin/policies/${key}`, { value, description });
  return res.data;
};

export const getAuditLogs = async () => {
  const res = await API.get('/admin/audit-logs');
  return res.data;
};

// Authentication API
export const loginUser = async (username, password, role) => {
  const res = await API.post('/auth/login', { username, password, role });
  return res.data;
};

export const getCurrentUser = async () => {
  const res = await API.get('/auth/me');
  return res.data;
};

export const updateProfile = async (profileData) => {
  const res = await API.put('/auth/profile', profileData);
  return res.data;
};

export default API;
