import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Subjects from './pages/Subjects.jsx';
import SubjectDetail from './pages/SubjectDetail.jsx';
import NewSession from './pages/NewSession.jsx';
import SessionDetail from './pages/SessionDetail.jsx';
import TagTopics from './pages/TagTopics.jsx';
import Reports from './pages/Reports.jsx';
import Images from './pages/Images.jsx';
import TestSeriesList from './pages/TestSeriesList.jsx';
import TestSeriesDetail from './pages/TestSeriesDetail.jsx';
import TestDetail from './pages/TestDetail.jsx';
import TestAnalytics from './pages/TestAnalytics.jsx';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
      <div className="text-purple-400 text-sm">Loading…</div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
};

const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

    {/* Protected — inside Layout */}
    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
      <Route index element={<Dashboard />} />
      <Route path="subjects" element={<Subjects />} />
      <Route path="subjects/:id" element={<SubjectDetail />} />
      <Route path="subjects/:subjectId/sessions/new" element={<NewSession />} />
      <Route path="subjects/:subjectId/reports" element={<Reports />} />
      <Route path="subjects/:subjectId/sessions/:id" element={<SessionDetail />} />
      <Route path="subjects/:subjectId/sessions/:id/tag" element={<TagTopics />} />
      <Route path="tests" element={<TestSeriesList />} />
      <Route path="tests/:seriesId" element={<TestSeriesDetail />} />
      <Route path="tests/:seriesId/test/:testId" element={<TestDetail />} />
      <Route path="tests/:seriesId/test/:testId/analytics" element={<TestAnalytics />} />
      <Route path="images" element={<Images />} />
    </Route>

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

import { Toaster } from 'react-hot-toast';

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1a2e',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '14px',
            padding: '12px 16px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
        }}
      />
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
