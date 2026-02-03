import React, { Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Home from './components/Home';
import { ProfileProvider } from './context/ProfileContext';
import ErrorBoundary from './components/ErrorBoundary';
import VersionCheck from './components/VersionCheck';

// Lazy load heavy components
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const ProfileEditor = React.lazy(() => import('./components/ProfileEditor'));
const PublicProfile = React.lazy(() => import('./components/PublicProfile'));
const ForgotPassword = React.lazy(() => import('./components/ForgotPassword'));
const UpdatePassword = React.lazy(() => import('./components/UpdatePassword'));
const CardDesignerPage = React.lazy(() => import('./card_desinger/App'));
const QrCodeGeneratorPage = React.lazy(() => import('./custom_qr/App'));
const PaymentPage = React.lazy(() => import('./components/PaymentPage'));

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-zinc-950">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
  </div>
);

function App() {
  return (
    <HashRouter>
      <VersionCheck />
      <ErrorBoundary>
        <ProfileProvider>
          <Layout>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Public Routes - Keep Home fast but Auth is fast enough */}
                <Route path="/" element={<Home />} />
                <Route path="/p/:slug" element={<PublicProfile />} />

                {/* Auth Routes */}
                <Route path="/login" element={<Auth type="login" />} />
                <Route path="/signup" element={<Auth type="signup" />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/update-password" element={<UpdatePassword />} />

                {/* App Routes - Protected & Heavy */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile/new" element={<ProfileEditor />} />
                <Route path="/profile/:id/edit" element={<ProfileEditor />} />
                <Route path="/dashboard/qrcode" element={<QrCodeGeneratorPage />} />
                <Route path="/dashboard/carddesign" element={<CardDesignerPage />} />
                <Route path="/payment" element={<PaymentPage />} />
              </Routes>
            </Suspense>
          </Layout>
        </ProfileProvider>
      </ErrorBoundary>
    </HashRouter>
  );
}

export default App;

