import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user?.role !== role) {
    // Redirect based on user role
    if (user?.role === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    } else if (user?.role === 'SELLER') {
      return <Navigate to="/seller" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}

