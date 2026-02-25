import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProgressProvider } from './context/ProgressContext';
import { ThemeProvider } from './context/ThemeContext';
import { MainLayout } from './components/layout';
import {
  Auth,
  Dashboard,
  CourseView,
  LessonView,
  QuizView,
  Certificates,
  Profile,
  CoursesList,
  MyCourses
} from './pages';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import FinalEvaluationView from './pages/FinalEvaluationView';
import CertificateVerify from './pages/CertificateVerify';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import CourseManagement from './pages/admin/CourseManagement';
import InstructorDashboard from './pages/instructor/InstructorDashboard';
import InstructorMyCourses from './pages/instructor/MyCourses';
import QnAPanel from './pages/instructor/QnAPanel';
import BlogManagement from './pages/instructor/BlogManagement';
import CourseBuilder from './pages/instructor/CourseBuilder';
import InstructorEvaluationsPanel from './pages/instructor/InstructorEvaluationsPanel';

// Loading spinner
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-maily border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-500 dark:text-gray-400">Cargando...</p>
    </div>
  </div>
);

// Protected route – redirects to login if not authenticated
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return children;
};

// Public route – redirects to dashboard if already authenticated
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading, getDashboardPath } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to={getDashboardPath()} replace />;
  return children;
};

// Role-based route guard
const RoleRoute = ({ roles, children }) => {
  const { user, getDashboardPath } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to={getDashboardPath()} replace />;
  }
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public – Login / Register */}
      <Route
        path="/"
        element={
          <PublicRoute>
            <Auth />
          </PublicRoute>
        }
      />
      <Route path="/auth" element={<Navigate to="/" replace />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* ── Admin routes ─────────────────────────────────────────── */}
      <Route
        element={
          <ProtectedRoute>
            <RoleRoute roles={['admin']}>
              <MainLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/courses" element={<CourseManagement />} />
      </Route>

      {/* ── Instructor routes ────────────────────────────────────── */}
      <Route
        element={
          <ProtectedRoute>
            <RoleRoute roles={['instructor']}>
              <MainLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/instructor/dashboard" element={<InstructorDashboard />} />
        <Route path="/instructor/courses" element={<InstructorMyCourses />} />
        <Route path="/instructor/qna" element={<QnAPanel />} />
        <Route path="/instructor/evaluations" element={<InstructorEvaluationsPanel />} />
        <Route path="/instructor/blog" element={<BlogManagement />} />
      </Route>

      {/* ── Instructor: Course Builder (full-screen, no navbar) ──── */}
      <Route
        path="/instructor/courses/:courseId/edit"
        element={
          <ProtectedRoute>
            <RoleRoute roles={['instructor', 'admin']}>
              <CourseBuilder />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* ── Student routes (with layout) ─────────────────────────── */}
      <Route
        element={
          <ProtectedRoute>
            <RoleRoute roles={['student']}>
              <MainLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/my-courses" element={<MyCourses />} />
        <Route path="/courses" element={<CoursesList />} />
        <Route path="/course/:courseId" element={<CourseView />} />
        <Route path="/certificates" element={<Certificates />} />
      </Route>

      {/* ── Shared routes (all roles, with layout) ───────────────── */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* ── Immersive routes (no navbar) ─────────────────────────── */}
      <Route
        path="/course/:courseId/lesson/:moduleId/:lessonId"
        element={
          <ProtectedRoute>
            <LessonView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/course/:courseId/quiz/:moduleId"
        element={
          <ProtectedRoute>
            <QuizView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/course/:courseId/evaluation"
        element={
          <ProtectedRoute>
            <FinalEvaluationView />
          </ProtectedRoute>
        }
      />

      {/* Verificación pública de certificados (sin auth) */}
      <Route path="/verify/:code" element={<CertificateVerify />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <ProgressProvider>
            <AppRoutes />
          </ProgressProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
