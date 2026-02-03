
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';
import { useProfile } from '../context/ProfileContext'; // Use context
import FeedbackForm from './FeedbackForm';
import { useToast } from '../context/ToastContext';

const PaymentPage: React.FC = () => {
    // Optimization: Use context data directly instead of fetching again
    const { profile, loading: profileLoading, refreshProfile } = useProfile();

    // Local state for payment specific interactions
    const [upiId, setUpiId] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [isSubmittingUpi, setIsSubmittingUpi] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [couponCode, setCouponCode] = useState('');

    const navigate = useNavigate();
    const { showToast } = useToast();

    // Check auth and profile status
    useEffect(() => {
        if (!profileLoading) {
            if (!profile) {
                navigate('/login');
                return;
            }

            // Check if subscription is valid (not expired)
            // If valid, redirect to dashboard. If expired, allow payment (renewal).
            let isSubscriptionValid = false;
            if (profile.upi_transaction_id) {
                // If they have paid, check if expired
                if (profile.subscription_end_date) {
                    const end = new Date(profile.subscription_end_date);
                    if (end > new Date()) {
                        isSubscriptionValid = true;
                    }
                } else {
                    // Fallback: If no date but has transaction_id, assume valid for 1 year from created_at
                    const created = new Date(profile.created_at);
                    const end = new Date(created);
                    end.setDate(end.getDate() + 365);
                    if (end > new Date()) {
                        isSubscriptionValid = true;
                    }
                }
            }

            if (isSubscriptionValid) {
                showToast("You have an active subscription. Redirecting to dashboard...", "info");
                setTimeout(() => navigate('/dashboard'), 1500);
            }
            // Pre-fill address if available
            if (profile.delivery_address_url && !deliveryAddress) {
                setDeliveryAddress(profile.delivery_address_url);
            }
        }
    }, [profile, profileLoading, navigate, showToast]);

    // Check various coupon states
    const isLoyaltyApplied = couponCode.trim().toUpperCase() === 'LOYALTYCARD' && upiId === '111111111111';
    const isNoFeesApplied = (couponCode.trim().toUpperCase() === 'NOFEES' || couponCode.trim().toUpperCase() === 'BBNGWARJE') && upiId === '222222222222';
    const isCouponApplied = isLoyaltyApplied || isNoFeesApplied;

    const handleUpiIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isCouponApplied) return;
        const value = e.target.value.replace(/\D/g, ''); // Allow only digits
        if (value.length <= 12) {
            setUpiId(value);
        }
    };

    const handleApplyCoupon = async () => {
        const code = couponCode.trim().toUpperCase();
        if (!profile) return;

        if (code === 'LOYALTYCARD') {
            try {
                // Automatically update the back side image for loyalty card holders
                const { error } = await getSupabase()
                    .from('profiles')
                    .update({
                        back_side: 'https://jotjgsgadnwosofaonso.supabase.co/storage/v1/object/public/card_images/Loyalty_back_side.png',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', profile.id);

                if (error) throw error;

                setUpiId('111111111111');
                showToast("Coupon applied! Payment waived & Loyalty Card design updated.", 'success');
            } catch (err) {
                console.error("Error applying loyalty coupon:", err);
                showToast("Failed to apply coupon changes. Please try again.", 'error');
            }
        } else if (code === 'NOFEES' || code === 'BBNGWARJE') {
            setUpiId('222222222222');
            showToast("Coupon applied! Payment waived.", 'success');
        } else {
            showToast("Invalid coupon code.", 'error');
        }
    };

    const handleRemoveCoupon = () => {
        setUpiId('');
        setCouponCode('');
        showToast("Coupon removed.", 'info');
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            showToast('Geolocation is not supported by your browser', 'error');
            return;
        }

        setGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const locationString = `Current Location: https://maps.google.com/?q=${latitude},${longitude}`;
                setDeliveryAddress((prev) => {
                    const sep = prev.trim() ? '\n\n' : '';
                    return prev + sep + locationString;
                });
                setGettingLocation(false);
                showToast('Location fetched successfully', 'success');
            },
            (error) => {
                console.error("Error getting location: ", error);
                showToast('Unable to retrieve your location. Please enter address manually.', 'error');
                setGettingLocation(false);
            }
        );
    };

    const handleUpiSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!upiId.trim() || upiId.trim().length !== 12 || !profile || !deliveryAddress.trim()) return;

        setIsSubmittingUpi(true);
        try {
            // Use RPC call to submit payment and address
            const { error } = await getSupabase().rpc('submit_payment', {
                profile_id: profile.id,
                upi_id: upiId.trim(),
                address_url: deliveryAddress.trim()
            });

            if (error) throw error;

            // OPTIMISTIC UPDATE FOR RENEWAL:
            // Calculate new end date.
            // If currently active, add 1 year to existing end date.
            // If expired or new, add 1 year to NOW.
            const now = new Date();
            let startDate = now;
            if (profile.subscription_end_date) {
                const currentEnd = new Date(profile.subscription_end_date);
                if (currentEnd > now) {
                    startDate = currentEnd;
                }
            }

            const newEndDate = new Date(startDate);
            newEndDate.setFullYear(newEndDate.getFullYear() + 1);


            await getSupabase()
                .from('profiles')
                .update({
                    subscription_end_date: newEndDate.toISOString()
                })
                .eq('id', profile.id);


            setUpiId('');

            // Refresh profile immediately to update dashboard status
            await refreshProfile();

            setShowFeedbackModal(true);

        } catch (err: any) {
            console.error("Error submitting payment:", err);
            if (err.message && err.message.includes('Webhook notification to Make.com failed')) {
                showToast(`Webhook Error: ${err.message}`, 'error');
            } else {
                showToast(`Failed to submit: ${err.message}`, 'error');
            }
        } finally {
            setIsSubmittingUpi(false);
        }
    };

    if (profileLoading) {
        return (
            <div className="max-w-7xl mx-auto p-8 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
            </div>
        );
    }

    if (showFeedbackModal) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="bg-zinc-900 rounded-lg border border-zinc-700 w-full max-w-md p-6 shadow-2xl relative animate-fade-in">
                    <div className="text-center mb-6">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-900/30 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Order Placed!</h2>
                        <p className="text-zinc-400">
                            We've received your request. Your NFC card will be processed shortly.
                        </p>
                    </div>

                    <FeedbackForm onSuccess={() => navigate('/dashboard')} variant="full" />

                    <button
                        onClick={() => navigate('/dashboard')}
                        className="mt-4 w-full py-2 text-sm text-zinc-500 hover:text-white transition-colors"
                    >
                        Skip Feedback
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex flex-col items-center min-h-[80vh] justify-center">
            <div className="text-center mb-4">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Complete Your Order</h1>
                <p className="mt-3 text-zinc-400 max-w-2xl">Scan the QR code to pay securely, then enter your details to confirm delivery.</p>
            </div>

            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden w-full">
                <div className="grid grid-cols-1 lg:grid-cols-12">
                    {/* Left Column: Payment (Scan & Amount) */}
                    <div className="lg:col-span-5 bg-zinc-950/50 p-8 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-zinc-800 relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-50"></div>

                        <div className="bg-white p-4 rounded-xl shadow-lg shadow-black/50 mb-6 transform transition-transform hover:scale-105 duration-300">
                            <img
                                src="https://jotjgsgadnwosofaonso.supabase.co/storage/v1/object/public/card_images/CC_Payment_549.png"
                                alt="Scan to Pay QR Code"
                                className="w-48 h-48 object-contain"
                            />
                        </div>

                        {(() => {
                            // Check for renewal eligibility:
                            // 1. Has transaction ID (Active/Recently Expired)
                            // 2. OR Has subscription_end_date (Expired but was a subscriber)
                            const isRenewal = !!profile?.upi_transaction_id || !!profile?.subscription_end_date;

                            const amount = isRenewal ? 299 : 549;
                            const strikeAmount = isRenewal ? 549 : 749;
                            const upiLink = `upi://pay?pa=canopycorp@ybl&pn=CANOPY%20CORP&cu=INR&am=${amount}`;

                            return (
                                <>
                                    <div className="text-center mb-6">
                                        <div className="inline-block mb-2 px-3 py-1 bg-gold/10 rounded-full border border-gold/30">
                                            <span className="text-xs font-bold text-gold uppercase tracking-wider">{isRenewal ? 'Renewal Offer' : 'Promotional Offer'}</span>
                                        </div>
                                        <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">Total Payable</p>
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-baseline justify-center gap-3">
                                                <span className="text-4xl font-bold text-white">₹{amount} <span className="text-sm font-normal text-zinc-400">/ year</span></span>
                                                <span className="text-lg text-zinc-600 line-through decoration-2">₹{strikeAmount}</span>
                                            </div>
                                            {!isRenewal && <p className="text-[10px] text-zinc-500 mt-1 font-medium">(Renews at ₹299 / year)</p>}
                                        </div>
                                    </div>

                                    <a
                                        href={upiLink}
                                        className="w-full max-w-xs bg-zinc-800 hover:bg-zinc-700 text-white py-3 px-4 rounded-lg border border-zinc-700 transition-all duration-200 flex items-center justify-center gap-3 group"
                                    >
                                        <span className="bg-zinc-900 p-1.5 rounded-md group-hover:text-gold transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                        </span>
                                        <span className="font-semibold group-hover:text-gold transition-colors">Pay ₹{amount} via UPI App</span>
                                    </a>
                                </>
                            );
                        })()}
                    </div>

                    {/* Right Column: Details Form */}
                    <div className="lg:col-span-7 p-8 flex flex-col justify-center">
                        <form onSubmit={handleUpiSubmit} className="space-y-6">

                            {/* Coupon Section */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-zinc-400">Have a Coupon Code?</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value)}
                                        placeholder="Enter code"
                                        disabled={isCouponApplied}
                                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all disabled:opacity-50 uppercase"
                                    />
                                    {isCouponApplied ? (
                                        <button
                                            type="button"
                                            onClick={handleRemoveCoupon}
                                            className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors"
                                        >
                                            Remove
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleApplyCoupon}
                                            disabled={!couponCode.trim()}
                                            className="px-5 py-2 text-sm font-bold text-black bg-gold rounded-lg hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Apply
                                        </button>
                                    )}
                                </div>
                                {isLoyaltyApplied && (
                                    <p className="text-sm text-green-400 flex items-center gap-1.5 animate-fade-in">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Success! Payment waived for Loyalty Card.
                                    </p>
                                )}
                                {isNoFeesApplied && (
                                    <p className="text-sm text-green-400 flex items-center gap-1.5 animate-fade-in">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Success! Payment waived.
                                    </p>
                                )}
                            </div>

                            {/* Loyalty Card Note */}
                            {isLoyaltyApplied && (
                                <div className="mt-2 p-3 bg-zinc-900/80 border border-zinc-700/50 rounded-lg">
                                    <p className="text-xs text-zinc-400">
                                        <span className="text-gold font-bold">Note:</span> Loyalty card members back side card design is fixed.
                                    </p>
                                </div>
                            )}

                            <div className="w-full h-px bg-zinc-800 my-6"></div>

                            {/* Transaction Input */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-zinc-300">
                                    Payment Transaction ID <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        value={upiId}
                                        onChange={handleUpiIdChange}
                                        placeholder={isCouponApplied ? "Waived" : "Enter 12-digit UTR / Ref ID"}
                                        disabled={isCouponApplied}
                                        maxLength={12}
                                        className="w-full pl-10 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all disabled:bg-zinc-900 disabled:text-green-500 font-mono tracking-wider"
                                        required
                                    />
                                </div>
                                {!isCouponApplied && (
                                    <p className="text-xs text-zinc-500">Found in your payment app (GooglePay, PhonePe, Paytm) details.</p>
                                )}
                            </div>

                            {/* Address Input */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-zinc-300">
                                    Shipping Address <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <textarea
                                        value={deliveryAddress}
                                        onChange={(e) => setDeliveryAddress(e.target.value)}
                                        placeholder="Full address including pincode and landmarks..."
                                        rows={3}
                                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all resize-none"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={handleGetLocation}
                                        disabled={gettingLocation}
                                        className="absolute bottom-3 right-3 p-1.5 text-zinc-400 hover:text-gold bg-zinc-800 hover:bg-zinc-700 rounded-md border border-zinc-600 transition-colors"
                                        title="Use Current Location"
                                    >
                                        {gettingLocation ? (
                                            <div className="animate-spin h-4 w-4 border-2 border-gold border-t-transparent rounded-full"></div>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span className="text-xs font-medium">Detect</span>
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmittingUpi || (!isCouponApplied && upiId.length !== 12) || !deliveryAddress}
                                className="w-full bg-gold text-black font-bold py-4 px-6 rounded-lg hover:bg-gold-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gold/10 hover:shadow-gold/20 transform hover:-translate-y-0.5"
                            >
                                {isSubmittingUpi ? 'Processing Order...' : 'Confirm Payment & Order'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;
