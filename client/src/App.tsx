import { Routes, Route, Navigate } from 'react-router';
import { useSelector } from 'react-redux';
import type { RootState } from './store/store';
import LoginPage from './pages/auth/LoginPage';
import AppLayout from './components/layout/AppLayout';
import MasterDashboard from './pages/dashboard/MasterDashboard';
import CandidateForm from './pages/data-entry/CandidateForm';
import CandidateList from './pages/data-entry/CandidateList';
import IncompleteQueue from './pages/data-entry/IncompleteQueue';
import MastersConfig from './pages/admin/MastersConfig';
import UserManagement from './pages/admin/UserManagement';
import AuditLog from './pages/admin/AuditLog';
import MessageTemplates from './pages/admin/MessageTemplates';
import Notifications from './pages/admin/Notifications';
// RecruiterDashboard removed — merged into MasterDashboard
import CompanyList from './pages/recruitment/CompanyList';
import JobList from './pages/recruitment/JobList';
import JobDetail from './pages/recruitment/JobDetail';
import Pipeline from './pages/recruitment/Pipeline';
import CandidateProcess from './pages/process/CandidateProcess';
import InterviewEvents from './pages/recruitment/InterviewEvents';
import InterviewEventDetail from './pages/recruitment/InterviewEventDetail';
import FinanceOverview from './pages/finance/FinanceOverview';
import AllPayments from './pages/finance/AllPayments';
import FinanceReports from './pages/finance/FinanceReports';
import AssociateList from './pages/associates/AssociateList';
import AssociateDetail from './pages/associates/AssociateDetail';
import AnalyticsDashboard from './pages/analytics/AnalyticsDashboard';
import DeployedCandidates from './pages/deployed/DeployedCandidates';
import ProcessModule from './pages/process-module/ProcessModule';
import VendorList from './pages/admin/VendorList';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, token } = useSelector((state: RootState) => state.auth);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function getDefaultRoute(_role: string) {
  return '/dashboard';
}

export default function App() {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={user ? getDefaultRoute(user.role) : '/login'} replace />} />

        {/* Master Dashboard */}
        <Route path="dashboard" element={<MasterDashboard />} />
        <Route path="data-entry/register" element={<CandidateForm />} />
        <Route path="data-entry/candidates" element={<CandidateList />} />
        <Route path="data-entry/candidates/:id/edit" element={<CandidateForm />} />
        <Route path="data-entry/incomplete" element={<IncompleteQueue />} />

        {/* Recruitment */}
        <Route
          path="recruitment/companies"
          element={
            <ProtectedRoute allowedRoles={['recruiter', 'process_manager', 'manager', 'admin']}>
              <CompanyList />
            </ProtectedRoute>
          }
        />
        <Route
          path="recruitment/jobs"
          element={<Navigate to="/recruitment/interviews" replace />}
        />
        <Route
          path="recruitment/jobs/:id"
          element={
            <ProtectedRoute allowedRoles={['recruiter', 'process_manager', 'manager', 'admin']}>
              <JobDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="recruitment/pipeline"
          element={
            <ProtectedRoute allowedRoles={['recruiter', 'process_manager', 'manager', 'admin']}>
              <Pipeline />
            </ProtectedRoute>
          }
        />
        <Route
          path="recruitment/interviews"
          element={
            <ProtectedRoute allowedRoles={['recruiter', 'process_manager', 'manager', 'admin']}>
              <InterviewEvents />
            </ProtectedRoute>
          }
        />
        <Route
          path="recruitment/interviews/:id"
          element={
            <ProtectedRoute allowedRoles={['recruiter', 'process_manager', 'manager', 'admin']}>
              <InterviewEventDetail />
            </ProtectedRoute>
          }
        />

        {/* Process */}
        <Route
          path="process/:candidateJobId"
          element={
            <ProtectedRoute allowedRoles={['process_manager', 'manager', 'admin']}>
              <CandidateProcess />
            </ProtectedRoute>
          }
        />

        {/* Process Module */}
        <Route
          path="process-module"
          element={
            <ProtectedRoute allowedRoles={['process_manager', 'manager', 'admin']}>
              <ProcessModule />
            </ProtectedRoute>
          }
        />

        {/* Finance */}
        <Route
          path="finance/overview"
          element={
            <ProtectedRoute allowedRoles={['process_manager', 'manager', 'admin']}>
              <FinanceOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/payments"
          element={
            <ProtectedRoute allowedRoles={['process_manager', 'manager', 'admin']}>
              <AllPayments />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance/reports"
          element={
            <ProtectedRoute allowedRoles={['manager', 'admin']}>
              <FinanceReports />
            </ProtectedRoute>
          }
        />

        {/* Associates */}
        <Route
          path="associates"
          element={
            <ProtectedRoute allowedRoles={['manager', 'admin']}>
              <AssociateList />
            </ProtectedRoute>
          }
        />
        <Route
          path="associates/:id"
          element={
            <ProtectedRoute allowedRoles={['manager', 'admin']}>
              <AssociateDetail />
            </ProtectedRoute>
          }
        />

        {/* Analytics */}
        <Route
          path="analytics"
          element={
            <ProtectedRoute allowedRoles={['manager', 'admin']}>
              <AnalyticsDashboard />
            </ProtectedRoute>
          }
        />

        {/* Deployed */}
        <Route
          path="deployed"
          element={
            <ProtectedRoute allowedRoles={['process_manager', 'manager', 'admin']}>
              <DeployedCandidates />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route
          path="admin/masters"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MastersConfig />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/vendors"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <VendorList />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/audit-log"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AuditLog />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/message-templates"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MessageTemplates />
            </ProtectedRoute>
          }
        />
        <Route
          path="notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
