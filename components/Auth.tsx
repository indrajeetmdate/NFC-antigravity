
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';
import { useProfile } from '../context/ProfileContext';

interface AuthProps {
  type: 'login' | 'signup';
  onSuccess?: () => void;
  disableRedirect?: boolean;
}

const Auth: React.FC<AuthProps> = ({ type, onSuccess, disableRedirect = false }) => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const navigate = useNavigate();
  const { session, loading: profileLoading } = useProfile();

  // Detect magic link verification state immediately on mount
  useEffect(() => {
    if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('type=recovery'))) {
      setIsVerifying(true);
    }
  }, []);

  // Use centralized profile context to redirect faster (unless disabled)
  useEffect(() => {
    if (session && !disableRedirect) {
      onSuccess?.();
      navigate('/dashboard');
    } else if (session && disableRedirect) {
      onSuccess?.();
    }
  }, [session, navigate, disableRedirect, onSuccess]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (type === 'signup') {
        if (!fullName.trim()) throw new Error("Full Name is required.");
        if (!phone.trim()) throw new Error("Phone Number is required.");
      }
      if (!email.trim()) throw new Error("Email address is required.");

      const { error } = await getSupabase().auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
          data: type === 'signup' ? {
            full_name: fullName,
            phone: phone
          } : undefined
        }
      });

      if (error) throw error;

      setMessage('Check your email for the login link!');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await getSupabase().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
      // User will be redirected, no need to stop loading usually, but safely:
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const inputClass = "appearance-none block w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md shadow-sm placeholder-zinc-500 text-white focus:outline-none focus:ring-gold focus:border-gold sm:text-sm";
  const labelClass = "block text-sm font-medium text-zinc-300";

  // Show verifying state only on actual verification
  if (isVerifying) {
    return (
      <div className="flex flex-col items-center justify-center py-6 sm:px-6 lg:px-8 min-h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mb-4"></div>
        <p className="text-zinc-400 animate-pulse">Verifying secure login...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-6 sm:px-6 lg:px-8 min-h-[80vh]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-2 text-center text-3xl font-extrabold text-white">
          {type === 'login' ? 'Sign in to your account' : 'Create a new account'}
        </h2>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-zinc-900 border border-zinc-800 py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">

          {message ? (
            <div className="rounded-md bg-green-900/30 border border-green-600 p-4 mb-6 animate-fade-in">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-400">
                    Success!
                  </h3>
                  <div className="mt-2 text-sm text-green-300">
                    <p>{message}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleAuth}>
              {error && (
                <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm p-3 rounded">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-3 py-2.5 px-4 border border-zinc-700 rounded-md shadow-sm text-sm font-bold text-white bg-zinc-800 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-600 transition-colors disabled:opacity-50"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  {loading ? 'Connecting...' : 'Continue with Google'}
                </button>

                <div className="relative flex items-center justify-center py-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-700"></span></div>
                  <span className="relative bg-zinc-900 px-2 text-xs text-zinc-500 uppercase tracking-wider">Or with email</span>
                </div>
              </div>

              {type === 'signup' && (
                <>
                  <div>
                    <label htmlFor="fullName" className={labelClass}>
                      Full Name
                    </label>
                    <div className="mt-1">
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="phone" className={labelClass}>
                      Phone Number
                    </label>
                    <div className="mt-1">
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="email" className={labelClass}>
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-black bg-gold hover:bg-gold-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Sending Link...' : (type === 'login' ? 'Sign In' : 'Sign Up')}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-700" />
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-zinc-400">
                {type === 'login' ? "Don't have an account? " : "Already have an account? "}
                <Link to={type === 'login' ? '/signup' : '/login'} className="font-medium text-gold hover:text-gold-500 transition-colors">
                  {type === 'login' ? 'Create a new account' : 'Log in'}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
