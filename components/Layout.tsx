
import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ProgressTracker from './ProgressTracker';
import FeedbackForm from './FeedbackForm';
import { usePreview } from '../context/PreviewContext';
import { useProfile } from '../context/ProfileContext';

interface LayoutProps {
  children: React.ReactNode;
}

// Strictly ordered: Card Design (1) -> NFC link (2) -> Pay (3)
const workflowSteps: { [key: string]: { step: number; path: (id?: string) => string; next?: string } } = {
  '/dashboard/carddesign': { step: 1, path: () => '/dashboard/carddesign', next: '/profile' },
  '/profile': { step: 2, path: (id) => id ? `/profile/${id}/edit` : '/profile/new', next: '/payment' },
  '/payment': { step: 3, path: () => '/payment' },
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { profile, session, loading, signOut } = useProfile(); // Use centralized auth/profile state
  const { previewSlug, setPreviewSlug } = usePreview();
  const navigate = useNavigate();
  const location = useLocation();

  // Listen for Password Recovery specifically if needed, otherwise AuthProvider handles state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/update-password');
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const pathPrefix = location.pathname.startsWith('/profile') ? '/profile' : location.pathname;
  const currentStepDetails = workflowSteps[pathPrefix];
  const currentStep = currentStepDetails?.step || 0;
  const isWorkflowPage = currentStep > 0;

  const completedSteps: { [key: number]: boolean } = {
    1: !!profile?.front_side && !!profile?.back_side,
    2: !!profile?.full_name,
    3: !!profile?.upi_transaction_id,
  };

  const getStepPath = (step: number) => {
    const targetKey = Object.keys(workflowSteps).find(key => workflowSteps[key].step === step);
    return targetKey ? workflowSteps[targetKey].path(profile?.id) : '#';
  };

  const isPublicPage = location.pathname.startsWith('/p/');
  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      <header className="bg-black border-b border-zinc-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to={session ? "/dashboard" : "/"} className="block hover:opacity-90 transition-opacity" aria-label="Home">
              <svg className="h-10 md:h-14 w-auto" viewBox="0 0 677.3 677.3" xmlns="http://www.w3.org/2000/svg">
                <circle cx="338.65" cy="338.65" r="331.15" fill="#231f20" stroke="#d6ba52" strokeWidth="15" strokeMiterlimit="10" />
                <path d="M471.74,521.17c-101.8,71.25-242.09,46.48-313.34-55.32-71.25-101.8-46.48-242.09,55.32-313.34" fill="none" stroke="#d9be44" strokeWidth="80" strokeMiterlimit="10" />
                <path d="M590.12,185.67c-34.72,40.91-87.52,63.93-153.7,65.65-133.45,3.47-221.77-93.3-306.02-72.77,70.92-96.51,168.85-104.3,223.52-100.34,125.44,9.09,143.97,99.79,236.2,107.46Z" fill="#ca9e2a" />
                <path d="M565.22,194c-2.56,1.69,2.75-1.51,0,0-81.63 13.92-121.54-6.92-230.57-44.66-43.85-15.18-120.34-24.29-201.12,25.04,82.56-55.09,163.53-45.62,208.79-29.95,109.15,37.78,138.01,56.3,222.9,49.57Z" fill="#d7e6a0" opacity="0.6" />
                <path d="M469.6,522.71c16.83-14.15-7.11,6.64,7.73-6.07" fill="#d9be44" stroke="#d9be42" strokeLinecap="round" strokeWidth="80" strokeMiterlimit="10" />
              </svg>
            </Link>
            <Link to={session ? "/dashboard" : "/"} className="text-sm sm:text-base font-bold text-gold tracking-tight">
              NFC cards <span className="hidden sm:inline text-white font-light">by CanopyCorp</span>
            </Link>
          </div>
          <nav className="flex items-center gap-2 sm:gap-4">
            {/* Show nothing while loading auth state to prevent flicker */}
            {loading ? (
              <div className="h-5 w-20 bg-zinc-800 rounded animate-pulse"></div>
            ) : session ? (
              <>
                <Link to="/dashboard" className="text-sm font-medium text-zinc-300 hover:text-gold transition-colors">
                  Dashboard
                </Link>

                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-zinc-300 hover:text-red-500 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              // Only show 'Create Card' (which acts as a CTA to signup) if definitely logged out
              <Link to="/signup" className="text-sm font-medium text-zinc-300 hover:text-gold transition-colors">
                Create Card
              </Link>
            )}
          </nav>
        </div>
      </header>

      {isWorkflowPage && (
        <div className="sticky top-[64px] md:top-[80px] z-40 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800 shadow-md">
          <div className="max-w-5xl mx-auto flex items-center justify-between px-2 sm:px-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-zinc-800 disabled:opacity-30 text-zinc-400 hover:text-white flex-shrink-0"
              aria-label="Previous Step"
              disabled={currentStep <= 1}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex-grow px-2 sm:px-4">
              <ProgressTracker
                currentStep={currentStep}
                completedSteps={completedSteps}
                getStepPath={getStepPath}
              />
            </div>
            <button
              onClick={() => {
                const nextPath = currentStep === 1 ? (profile?.id ? `/profile/${profile.id}/edit` : '/profile/new') : currentStepDetails?.next;
                if (nextPath) navigate(nextPath);
              }}
              className="p-2 rounded-full hover:bg-zinc-800 disabled:opacity-30 text-zinc-400 hover:text-white flex-shrink-0"
              aria-label="Next Step"
              disabled={!currentStepDetails?.next || !completedSteps[currentStep]}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      )}

      <main className="flex-grow">
        {children}
      </main>

      <footer className="bg-black border-t border-zinc-800 py-8 mt-auto">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left text-sm text-zinc-500">
              <p>© {new Date().getFullYear()} CanopyCorp. All rights reserved.</p>
              <p className="mt-2">Mail us: info@canopycorp.in Call us: 8390940980</p>
            </div>

            <div className="w-full max-w-xs">
              <FeedbackForm variant="footer" />
            </div>
          </div>
        </div>
      </footer>

      {previewSlug && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setPreviewSlug(null)}>
          <div className="relative w-full max-w-sm md:max-w-4xl h-[90vh] bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-zinc-800 p-2 flex items-center gap-2 border-b border-zinc-700">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 block rounded-full bg-red-500/80 cursor-pointer hover:bg-red-500" onClick={() => setPreviewSlug(null)}></span>
                <span className="w-3 h-3 block rounded-full bg-yellow-500/80"></span>
                <span className="w-3 h-3 block rounded-full bg-green-500/80"></span>
              </div>
              <div className="flex-1 bg-zinc-900/80 text-zinc-400 text-xs rounded px-3 py-1 text-center truncate">
                {profile?.full_name ? `${profile.full_name}'s Profile` : 'Preview'}
              </div>
              <button onClick={() => setPreviewSlug(null)} className="p-1 bg-zinc-700 text-white rounded-full hover:bg-red-600/80 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
            <div className="flex-grow bg-white overflow-hidden">
              <iframe src={`/#/p/${previewSlug}`} title="Profile Preview" className="w-full h-full border-0" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
