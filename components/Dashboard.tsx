
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';

const Dashboard: React.FC = () => {
  const { profile, loading, error, refreshProfile, signOut } = useProfile();
  const navigate = useNavigate();

  // If user is not logged in, ProfileProvider handles fetching, 
  // but we might want to redirect if not found after loading.
  // Although `Layout` handles auth state mostly, let's be safe.

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-900/20 mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Failed to load profile</h2>
        <p className="text-zinc-400 mb-8 max-w-sm">We encountered an issue loading your data. Please try again or sign out.</p>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <button
            onClick={() => refreshProfile()}
            className="w-full sm:w-auto bg-gold text-black px-8 py-2.5 rounded-full font-bold hover:bg-gold-600 transition-colors shadow-lg shadow-gold/10"
          >
            Retry
          </button>
          <button
            onClick={() => { signOut(); navigate('/login'); }}
            className="w-full sm:w-auto bg-zinc-800 text-white px-8 py-2.5 rounded-full font-bold hover:bg-zinc-700 transition-colors border border-zinc-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const getCacheBuster = () => profile?.updated_at ? `?v=${new Date(profile.updated_at).getTime()}` : '';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Dashboard</h1>

        {!profile && (
          <Link
            to="/dashboard/carddesign"
            className="bg-gold text-black px-6 py-2.5 rounded-full text-sm font-bold hover:bg-gold-600 transition-all shadow-lg shadow-gold/20"
          >
            + Create New Card
          </Link>
        )}
      </div>

      {!profile ? (
        <div className="text-center py-20 bg-zinc-900/50 rounded-3xl border border-zinc-800 border-dashed">
          <div className="mb-6 mx-auto w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">No Profile Found</h2>
          <p className="text-zinc-400 mb-8 text-lg max-w-md mx-auto">Start by designing your unique NFC card to unlock your networking potential.</p>
          <Link
            to="/dashboard/carddesign"
            className="inline-flex items-center gap-2 bg-gold text-black px-8 py-3 rounded-full font-bold hover:bg-gold-600 transition-all transform hover:scale-105"
          >
            Start Designing &rarr;
          </Link>

          <div className="mt-8 flex items-center justify-center gap-6">
            <button
              onClick={() => refreshProfile()}
              className="text-sm text-zinc-400 hover:text-gold transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Reload
            </button>
            <span className="text-zinc-700">|</span>
            <button
              onClick={() => { signOut(); navigate('/login'); }}
              className="text-sm text-zinc-500 hover:text-white underline decoration-zinc-700 underline-offset-4 transition-colors"
            >
              Not you? Sign Out
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Redesigned Profile Card */}
          <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl relative group">
            {/* Banner */}
            <div className="h-32 w-full relative bg-zinc-800">
              {profile.background_photo_url && (
                <img
                  src={profile.background_photo_url}
                  alt="Background"
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-80 transition-opacity duration-500"
                  style={{
                    transform: `scale(${profile.background_settings?.zoom || 1})`,
                    objectPosition: `${profile.background_settings?.offsetX || 50}% ${profile.background_settings?.offsetY || 50}%`
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-zinc-900"></div>

              {/* Type Badge */}
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-gold text-[10px] uppercase font-bold tracking-widest rounded-full border border-white/10 shadow-lg">
                  {profile.card_type === 'standie' ? 'Standie' : 'NFC Card'}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 relative -mt-14 flex flex-col items-center text-center z-10">
              {/* Profile Image */}
              <div className="relative mb-3 group-hover:-translate-y-1 transition-transform duration-300">
                <img
                  src={profile.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=random`}
                  className={`w-28 h-28 object-cover border-[5px] border-zinc-900 shadow-2xl ${profile.card_shape} bg-zinc-800`}
                  alt={profile.full_name}
                />
                {!profile.upi_transaction_id && (
                  <div className="absolute bottom-1 right-0 bg-red-500 text-white w-7 h-7 rounded-full border-4 border-zinc-900 flex items-center justify-center font-bold shadow-lg animate-pulse text-xs" title="Action Required">
                    !
                  </div>
                )}
              </div>

              <h2 className="text-2xl font-bold text-white mb-0.5 tracking-tight">{profile.full_name}</h2>
              <p className="text-sm text-zinc-400 font-medium mb-6">{profile.company || 'Professional'}</p>

              {/* Action Grid */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-lg mb-6">
                <Link to="/dashboard/carddesign" className="group/btn flex flex-col items-center justify-center p-3 bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/50 hover:border-gold/50 rounded-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center mb-2 group-hover/btn:scale-110 transition-transform shadow-inner group-hover/btn:bg-zinc-950">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-400 group-hover/btn:text-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 group-hover/btn:text-white tracking-wide uppercase">Design</span>
                </Link>
                <Link to={`/profile/${profile.id}/edit`} className="group/btn flex flex-col items-center justify-center p-3 bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/50 hover:border-gold/50 rounded-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center mb-2 group-hover/btn:scale-110 transition-transform shadow-inner group-hover/btn:bg-zinc-950">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-400 group-hover/btn:text-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 group-hover/btn:text-white tracking-wide uppercase">NFC Link</span>
                </Link>
                <Link to="/payment" className="group/btn flex flex-col items-center justify-center p-3 bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/50 hover:border-gold/50 rounded-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center mb-2 group-hover/btn:scale-110 transition-transform shadow-inner group-hover/btn:bg-zinc-950">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-400 group-hover/btn:text-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 group-hover/btn:text-white tracking-wide uppercase">Pay</span>
                </Link>
              </div>

              {/* Status Pill */}
              {profile.upi_transaction_id ? (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-900/10 border border-green-500/20 rounded-full shadow-inner">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-[10px] font-bold text-green-400 tracking-wide uppercase">Active & Paid</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-900/10 border border-red-500/20 rounded-full shadow-inner">
                  <span className="h-2 w-2 rounded-full bg-red-500"></span>
                  <span className="text-[10px] font-bold text-red-400 tracking-wide uppercase">Payment Pending</span>
                </div>
              )}
            </div>
          </div>

          {/* Print Designs Section */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-1 bg-gold rounded-full"></div>
              <h2 className="text-xl font-bold text-white">Your Print Designs</h2>
            </div>

            {profile.front_side && profile.back_side ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {['Front', 'Back'].map((side) => {
                  const imgUrl = side === 'Front' ? profile.front_side : profile.back_side;
                  return (
                    <div key={side} className="group relative">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-zinc-700 to-zinc-800 rounded-2xl opacity-75 group-hover:opacity-100 transition duration-500 blur"></div>
                      <div className="relative bg-black rounded-2xl p-1">
                        <div className="relative overflow-hidden rounded-xl bg-zinc-900 aspect-video">
                          <img src={`${imgUrl}${getCacheBuster()}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={`${side} Design`} />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                            <Link to="/dashboard/carddesign" className="bg-white text-black px-6 py-2 rounded-full font-bold text-sm transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                              Edit Design
                            </Link>
                          </div>
                        </div>
                      </div>
                      <h3 className="absolute top-4 left-4 text-xs font-bold text-white/50 uppercase tracking-widest bg-black/50 backdrop-blur px-2 py-1 rounded border border-white/10">{side} Side</h3>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed hover:border-gold/30 transition-colors">
                <p className="text-zinc-500 mb-4">You haven't saved any designs yet.</p>
                <Link to="/dashboard/carddesign" className="text-gold font-bold hover:underline">Complete your card design &rarr;</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
