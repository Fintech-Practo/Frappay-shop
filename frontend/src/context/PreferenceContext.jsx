import { createContext, useContext, useState, useEffect } from 'react';
import api from '@/config/api';
import { useAuth } from './AuthContext';

const PreferenceContext = createContext(null);

export function PreferenceProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch preferences when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchPreferences();
    } else {
      setPreferences(null);
    }
  }, [isAuthenticated, user?.id]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/api/preferences/me');
      if (res.data.success) {
        setPreferences(res.data.data);
      }
    } catch (err) {
      // If no preferences exist yet, backend may return 404 — treat as empty
      if (err.response?.status === 404) {
        setPreferences(null);
      } else {
        console.error('Error fetching preferences:', err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (newPrefs) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.put('/api/preferences/me', {
        preferences: newPrefs
      });
      if (res.data.success) {
        setPreferences(res.data.data);
        return true;
      }
    } catch (err) {
      console.error('Error updating preferences:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <PreferenceContext.Provider value={{ 
      preferences, 
      loading, 
      error, 
      fetchPreferences, 
      updatePreferences 
    }}>
      {children}
    </PreferenceContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferenceContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferenceProvider');
  }
  return context;
}