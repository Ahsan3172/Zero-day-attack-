import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user account is pending approval
  if (user?.status === 'pending') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-6xl">⏳</div>
          <h1 className="text-2xl font-bold text-foreground">Account Pending</h1>
          <p className="text-muted-foreground">
            Your account is currently pending admin approval. You'll receive an email 
            notification once your account has been approved and you can access the system.
          </p>
          <div className="pt-4">
            <button
              onClick={() => window.location.reload()}
              className="text-primary hover:underline"
            >
              Check Status Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if user account was rejected
  if (user?.status === 'rejected') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-6xl">❌</div>
          <h1 className="text-2xl font-bold text-foreground">Account Rejected</h1>
          <p className="text-muted-foreground">
            Unfortunately, your account application has been rejected. 
            Please contact the administrator if you believe this is an error.
          </p>
          <div className="pt-4 space-y-2">
            <button
              onClick={() => {
                // Logout and redirect to home
                window.location.href = '/';
              }}
              className="text-primary hover:underline block"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check role-based access
  if (requiredRole && user?.role !== requiredRole) {
    const accessType = requiredRole === 'admin' ? 'Admin' : 'Special';
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-6xl">🚫</div>
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page. {accessType} access is required.
          </p>
          <div className="pt-4">
            <Navigate to="/dashboard" replace />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
