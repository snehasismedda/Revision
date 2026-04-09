import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext.jsx';
import { SubjectProvider } from './context/SubjectContext.jsx';
import { TestSeriesProvider } from './context/TestSeriesContext.jsx';
import { TopicProvider } from './context/TopicContext.jsx';
import { AnalyticsProvider } from './context/AnalyticsContext.jsx';
import { FileProvider } from './context/FileContext.jsx';
import Layout from './components/Layout.jsx';

// Lazy load pages
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Subjects = lazy(() => import('./pages/Subjects.jsx'));
const SubjectDetail = lazy(() => import('./pages/SubjectDetail.jsx'));
const NewSession = lazy(() => import('./pages/NewSession.jsx'));
const SessionDetail = lazy(() => import('./pages/SessionDetail.jsx'));
const TagTopics = lazy(() => import('./pages/TagTopics.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Library = lazy(() => import('./pages/Library.jsx'));
const TestSeriesList = lazy(() => import('./pages/TestSeriesList.jsx'));
const TestSeriesDetail = lazy(() => import('./pages/TestSeriesDetail.jsx'));
const TestDetail = lazy(() => import('./pages/TestDetail.jsx'));
const TestAnalytics = lazy(() => import('./pages/TestAnalytics.jsx'));
const TestSeriesInsights = lazy(() => import('./pages/TestSeriesInsights.jsx'));

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
  <Suspense fallback={null}>
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Protected — inside Layout */}
      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
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
        <Route path="tests/:seriesId/insights" element={<TestSeriesInsights />} />
        <Route path="library" element={<Library />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

import { Toaster } from 'react-hot-toast';
import { QuickViewProvider } from './context/QuickViewContext.jsx';
import QuickViewBar from './components/QuickViewBar.jsx';
import GlobalQuickViewModal from './components/GlobalQuickViewModal.jsx';

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <QuickViewProvider>
        <SubjectProvider>
          <TestSeriesProvider>
            <TopicProvider>
              <AnalyticsProvider>
                <FileProvider>
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
                <GlobalQuickViewModal />
                <QuickViewBar />
              </FileProvider>
            </AnalyticsProvider>
            </TopicProvider>
          </TestSeriesProvider>
        </SubjectProvider>
      </QuickViewProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
