
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ProfileEditor from './components/ProfileEditor';
import PublicProfile from './components/PublicProfile';
import ForgotPassword from './components/ForgotPassword';
import UpdatePassword from './components/UpdatePassword';
import CardDesignerPage from './card_desinger/App';
import QrCodeGeneratorPage from './custom_qr/App';
import PaymentPage from './components/PaymentPage';
import Home from './components/Home';
import { ProfileProvider } from './context/ProfileContext';

function App() {
  return (
    <HashRouter>
      <ProfileProvider>
        <Layout>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/p/:slug" element={<PublicProfile />} />

            {/* Auth Routes */}
            <Route path="/login" element={<Auth type="login" />} />
            <Route path="/signup" element={<Auth type="signup" />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            
            {/* App Routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile/new" element={<ProfileEditor />} />
            <Route path="/profile/:id/edit" element={<ProfileEditor />} />
            <Route path="/dashboard/qrcode" element={<QrCodeGeneratorPage />} />
            <Route path="/dashboard/carddesign" element={<CardDesignerPage />} />
            <Route path="/payment" element={<PaymentPage />} />
          </Routes>
        </Layout>
      </ProfileProvider>
    </HashRouter>
  );
}

export default App;
