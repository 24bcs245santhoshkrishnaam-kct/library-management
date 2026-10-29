import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import StudentDashboard from './components/StudentDashboard';
import LibrarianDashboard from './components/LibrarianDashboard';
import AdminDashboard from './components/AdminDashboard';
import Chatbot from './components/Chatbot';
import './App.css';

function MainApp() {
  const { isAuthenticated, isStudent, isLibrarian, isAdmin, user, loading } = useAuth();
  const [chatbotTrigger, setChatbotTrigger] = useState(null);

  const handleAskChatbotCustom = (promptText) => {
    setChatbotTrigger(promptText);
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center" style={{ background: '#f8fafc' }}>
        <div className="spinner-border text-teal-600" role="status" style={{ width: '2.5rem', height: '2.5rem' }}></div>
        <div className="mt-3 text-secondary small fw-medium">Connecting to Smart College Library...</div>
      </div>
    );
  }

  // FIRST PAGE MUST BE LOGIN (Section 2)
  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ background: '#f8fafc' }}>
      {/* Role-Based Portal Workspace */}
      <div className="flex-grow-1">
        {isStudent && (
          <StudentDashboard onAskChatbot={handleAskChatbotCustom} />
        )}

        {isLibrarian && (
          <LibrarianDashboard />
        )}

        {isAdmin && (
          <AdminDashboard />
        )}
      </div>

      {/* Grounded Floating AI Academic Assistant */}
      <Chatbot
        externalTriggerMessage={chatbotTrigger}
        onClearExternalTrigger={() => setChatbotTrigger(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
