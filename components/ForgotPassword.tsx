
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // We use window.location.origin to ensure we send the base domain (e.g. https://your-app.com)
      // This must match one of the URLs in your Supabase Dashboard > Authentication > URL Configuration > Redirect URLs
      const redirectTo = window.location.origin;

      console.log('Sending password reset with redirect URL:', redirectTo);

      const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) throw error;

      setMessage('Check your email for the password reset link.');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 sm:px-6 lg:px-8 min-h-[80vh]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-zinc-900 border border-zinc-800 py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleReset}>
            {error && (
              <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm p-3 rounded">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-green-900/30 border border-green-800 text-green-300 text-sm p-3 rounded">
                {message}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
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
                  className="appearance-none block w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md shadow-sm placeholder-zinc-500 text-white focus:outline-none focus:ring-gold focus:border-gold sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-black bg-gold hover:bg-gold-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-zinc-900 text-zinc-500">
                  Or
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <Link
                to="/login"
                className="w-full flex justify-center py-2 px-4 border border-zinc-700 rounded-md shadow-sm bg-zinc-800 text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
