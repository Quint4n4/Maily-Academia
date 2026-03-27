import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SectionContextProvider, useSection } from './context/SectionContext';
import { ProgressProvider } from './context/ProgressContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
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
  MyCourses,
  MailyDashboard,
  LongevityDashboard,
  CorporativoDashboard,
  MailyCourses,
  LongevityCourses,
  CorporativoCourses,
  Survey,
} from './pages';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import FinalEvaluationView from './pages/FinalEvaluationView';
import CertificateVerify from './pages/CertificateVerify';
import MailyPresentacion from './pages/MailyPresentacion';
import ChooseSection from './pages/ChooseSection';
import LandingHub from './pages/landing/LandingHub';
import AcademyLanding from './pages/landing/AcademyLanding';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import CourseManagement from './pages/admin/CourseManagement';
import PromoVideosManagement from './pages/admin/PromoVideosManagement';
import CouponManagement from './pages/admin/CouponManagement';
import InstructorDashboard from './pages/instructor/InstructorDashboard';
import InstructorMyCourses from './pages/instructor/MyCourses';
import QnAPanel from './pages/instructor/QnAPanel';
import BlogManagement from './pages/instructor/BlogManagement';
import CourseBuilder from './pages/instructor/CourseBuilder';
import InstructorEvaluationsPanel from './pages/instructor/InstructorEvaluationsPanel';
import StudentManagement from './pages/instructor/StudentManagement';
import StudentDetail from './pages/instructor/StudentDetail';
import CourseAnalytics from './pages/instructor/CourseAnalytics';
import DropoutAnalysis from './pages/instructor/DropoutAnalysis';
import PaymentHistory from './pages/PaymentHistory';
// Páginas corporativas
import CorporativoProfile from './pages/corporativo/CorporativoProfile';
import CorporativoBenefits from './pages/corporativo/CorporativoBenefits';
import CorporativoBooking from './pages/corporativo/CorporativoBooking';
import CorporativoCalendar from './pages/corporativo/CorporativoCalendar';
import CorporativoReservations from './pages/corporativo/CorporativoReservations';
// Páginas admin corporativo
import BenefitManagement from './pages/admin/BenefitManagement';
import ScheduleManagement from './pages/admin/ScheduleManagement';
import ReservationManagement from './pages/admin/ReservationManagement';

// Redirige estudiantes de /dashboard a su dashboard por sección
const StudentDashboardRedirect = ({ children }) => {
  const { user } = useAuth();
  const { currentSection } = useSection();
  if (user?.role !== 'student') return children;
  const slug = currentSection || 'longevity-360';
  const path = slug === 'corporativo-camsa' ? '/corporativo/dashboard' : slug === 'maily-academia' ? '/maily/dashboard' : '/longevity/dashboard';
  return <Navigate to={path} replace />;
};

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
  const { isAuthenticated, isLoading, getDashboardPath, user } = useAuth();
  const { getSectionDashboardPath } = useSection();
  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) {
    const target =
      user?.role === 'student'
        ? getSectionDashboardPath(user.role)
        : getDashboardPath();
    return <Navigate to={target} replace />;
  }
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

// Super-admin only (en la práctica, cualquier admin global)
const SuperAdminRoute = ({ children }) => {
  const { user, getDashboardPath } = useAuth();
  // Reutilizamos el rol `admin` global; no es necesario marcar un flag especial.
  if (!user || user.role !== 'admin') {
    return <Navigate to={getDashboardPath()} replace />;
  }
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public – Landing pages */}
      <Route path="/" element={<LandingHub />} />
      <Route path="/academia/:slug" element={<AcademyLanding />} />

      {/* Auth */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Auth />
          </PublicRoute>
        }
      />
      <Route path="/auth" element={<Navigate to="/login" replace />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/choose-section" element={<ProtectedRoute><ChooseSection /></ProtectedRoute>} />

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
        <Route path="/admin/promo-videos" element={<SuperAdminRoute><PromoVideosManagement /></SuperAdminRoute>} />
        <Route path="/admin/coupons" element={<CouponManagement />} />
        <Route path="/admin/corporate/benefits" element={<BenefitManagement />} />
        <Route path="/admin/corporate/schedules" element={<ScheduleManagement />} />
        <Route path="/admin/corporate/reservations" element={<ReservationManagement />} />
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
        <Route path="/instructor/students" element={<StudentManagement />} />
        <Route path="/instructor/students/:id" element={<StudentDetail />} />
        <Route path="/instructor/courses/:courseId/analytics" element={<CourseAnalytics />} />
        <Route path="/instructor/dropout" element={<DropoutAnalysis />} />
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
        {/* /dashboard redirige a la sección correcta para estudiantes */}
        <Route
          path="/dashboard"
          element={
            <StudentDashboardRedirect>
              <Dashboard />
            </StudentDashboardRedirect>
          }
        />
        {/* Dashboards por sección (por ahora reutilizan Dashboard base) */}
        <Route path="/maily/dashboard" element={<MailyDashboard />} />
        <Route path="/longevity/dashboard" element={<LongevityDashboard />} />
        <Route path="/corporativo/dashboard" element={<CorporativoDashboard />} />
        <Route path="/my-courses" element={<MyCourses />} />
        <Route path="/courses" element={<CoursesList />} />
        {/* Rutas seccionales de cursos (estructura inicial) */}
        <Route path="/maily/courses" element={<MailyCourses />} />
        <Route path="/longevity/courses" element={<LongevityCourses />} />
        <Route path="/corporativo/courses" element={<CorporativoCourses />} />
        <Route path="/corporativo/profile" element={<CorporativoProfile />} />
        <Route path="/corporativo/benefits" element={<CorporativoBenefits />} />
        <Route path="/corporativo/benefits/:slug/book" element={<CorporativoBooking />} />
        <Route path="/corporativo/calendar" element={<CorporativoCalendar />} />
        <Route path="/corporativo/reservations" element={<CorporativoReservations />} />
        <Route path="/course/:courseId" element={<CourseView />} />
        <Route path="/certificates" element={<Certificates />} />
        <Route path="/survey" element={<Survey />} />
        <Route path="/maily-academia/presentacion" element={<MailyPresentacion />} />
        <Route path="/mis-pagos" element={<PaymentHistory />} />
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
      <ToastProvider>
        <Router>
          <AuthProvider>
            <SectionContextProvider>
              <ProgressProvider>
                <AppRoutes />
              </ProgressProvider>
            </SectionContextProvider>
          </AuthProvider>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
