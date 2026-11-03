import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, getCurrentUser } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('smart_library_token') || null);
  const [loading, setLoading] = useState(true);
  const [authTransition, setAuthTransition] = useState(null); // null | { mode: 'login-transition', role } | { mode: 'logout-transition' }

  // Check if saved session exists in localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('smart_library_token');
      if (savedToken) {
        try {
          const res = await getCurrentUser();
          setUser(res.user);
        } catch (err) {
          console.warn('Session expired or invalid:', err.message);
          localStorage.removeItem('smart_library_token');
          setToken(null);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username, password, role) => {
    setLoading(true);
    try {
      const res = await loginUser(username, password, role);
      localStorage.setItem('smart_library_token', res.token);
      setToken(res.token);
      setUser(res.user);
      // FEATURE 5: Cinematic intro triggers ONLY for successful student login
      // Librarian and Admin logins flow immediately into their dashboards without intro
      if (res.user && res.user.role === 'student') {
        setAuthTransition({ mode: 'login-transition', role: 'student' });
      } else {
        setAuthTransition(null);
      }
      return { success: true, user: res.user, message: res.message };
    } catch (err) {
      return { 
        success: false, 
        message: err.response?.data?.message || 'Invalid username or password' 
      };
    } finally {
      setLoading(false);
    }
  };

  const quickLoginAs = async (roleName, specificIdentifier) => {
    let identifier = specificIdentifier;
    let pwd = '12345';

    if (roleName === 'student') {
      if (!identifier || identifier === 'santhoshkrishna@gmail.com') {
        identifier = 'santhoshkrishna@gmail.com';
        pwd = '1234';
      } else {
        pwd = '12345';
      }
    } else if (roleName === 'librarian') {
      identifier = 'shankarlibarian46@gmail.vom';
      pwd = 'Kct.libarian';
    } else if (roleName === 'admin') {
      identifier = 'arun444@gamil.com';
      pwd = 'KCT.admin';
    }

    return await login(identifier, pwd, roleName);
  };

  const logout = () => {
    // Invalidate session immediately before transition runs
    localStorage.removeItem('smart_library_token');
    setToken(null);
    setUser(null);
    setAuthTransition({ mode: 'logout-transition' });
  };

  const updateUserData = (updatedUser) => {
    setUser(prev => ({ ...prev, ...updatedUser }));
  };

  const role = user?.role || null;
  const isStudent = role === 'student';
  const isLibrarian = role === 'librarian';
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      role,
      isAuthenticated: Boolean(user && token),
      isStudent,
      isLibrarian,
      isAdmin,
      authTransition,
      setAuthTransition,
      login, 
      quickLoginAs,
      updateUserData,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
