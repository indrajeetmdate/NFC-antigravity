import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface FeedbackFormProps {
  onSuccess?: () => void;
  className?: string;
  variant?: 'compact' | 'full' | 'footer';
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSuccess, className = '', variant = 'compact' }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert('Please select a star rating');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('feedbacks').insert({
        user_id: user?.id || null,
        rating,
        comment: comment.trim(),
      });

      if (error) throw error;

      setSubmitted(true);
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (error: any) {
      console.error('Feedback error:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'footer') {
    if (submitted) {
        return (
             <div className={`text-center p-2 bg-zinc-900/50 rounded border border-zinc-800 ${className}`}>
                 <span className="text-green-500 text-xs font-bold flex items-center justify-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" /></svg>
                    Feedback Sent!
                 </span>
             </div>
        );
    }
    
    return (
        <div className={`${className} flex flex-col gap-1.5 max-w-sm ml-auto`}>
            <div className="flex items-center justify-between gap-2">
                 <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Rate your experience</span>
                 <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="focus:outline-none transition-transform hover:scale-110"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill={(hoverRating || rating) >= star ? '#d7ba52' : 'none'}
                                viewBox="0 0 24 24"
                                stroke={(hoverRating || rating) >= star ? '#d7ba52' : '#52525b'}
                                strokeWidth={1.5}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                        </button>
                    ))}
                </div>
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2 items-center">
                <input 
                    type="text" 
                    value={comment}
                    onChange={(e) => setComment(e.target.value.slice(0, 200))}
                    placeholder="Feedback (optional)..." 
                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-white placeholder-zinc-600 focus:border-gold focus:outline-none flex-grow h-7"
                    maxLength={200}
                />
                 <button 
                    type="submit" 
                    disabled={loading || rating === 0}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 rounded px-2 h-7 text-xs font-bold disabled:opacity-50"
                >
                    {loading ? '...' : 'Send'}
                </button>
            </form>
        </div>
    );
  }

  if (submitted) {
    return (
      <div className={`text-center p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 ${className}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-white font-bold">Thank You!</h3>
        <p className="text-zinc-400 text-sm mt-1">We appreciate your feedback.</p>
      </div>
    );
  }

  return (
    <div className={`bg-zinc-900 rounded-lg border border-zinc-700 p-4 sm:p-6 ${className}`}>
      <h3 className="text-gold font-bold text-lg mb-1">Rate Your Experience</h3>
      <p className="text-zinc-400 text-xs mb-4">Help us improve CanopyCorp</p>
      
      <form onSubmit={handleSubmit}>
        {/* Star Rating */}
        <div className="flex items-center justify-center gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="focus:outline-none transition-transform hover:scale-110 p-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 sm:h-10 sm:w-10"
                fill={(hoverRating || rating) >= star ? '#d7ba52' : 'none'}
                viewBox="0 0 24 24"
                stroke={(hoverRating || rating) >= star ? '#d7ba52' : '#52525b'}
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          ))}
        </div>

        {/* Comment Box */}
        <div className="mb-4">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 200))}
            placeholder="Tell us what you think (optional)..."
            className="w-full bg-zinc-950 border border-zinc-700 rounded-md p-3 text-sm text-white placeholder-zinc-600 focus:ring-1 focus:ring-gold focus:border-gold resize-none"
            rows={variant === 'compact' ? 2 : 3}
            maxLength={200}
          />
          <div className="text-right text-xs text-zinc-600 mt-1">
            {comment.length}/200
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || rating === 0}
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm border border-zinc-700"
        >
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
};

export default FeedbackForm;