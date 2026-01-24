
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useProfile } from '../context/ProfileContext';

interface AuthProps {
  type: 'login' | 'signup';
}

const Auth: React.FC<AuthProps> = ({ type }) => {
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

  // Use centralized profile context to redirect faster
  useEffect(() => {
    if (session) {
      navigate('/dashboard');
    }
  }, [session, navigate]);

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

      const { error } = await supabase.auth.signInWithOtp({
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
