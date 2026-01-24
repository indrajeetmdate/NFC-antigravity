
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import HeroImageSequence from './HeroImageSequence';

const Home: React.FC = () => {
  const { session, loading } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      navigate('/dashboard', { replace: true });
    }
  }, [session, loading, navigate]);

  // Icons
  const ShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367 2.684z" />
    </svg>
  );

  const LeafIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const PaintBrushIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
    </svg>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="bg-black text-gray-100 font-poppins overflow-hidden">


      {/* 1. Hero Image Sequence Section */}
      <HeroImageSequence totalFrames={192} duration={8000} />


      {/* Content Section (Below Image) */}
      <section className="relative px-4 sm:px-6 lg:px-8 pb-20 pt-8 text-center bg-black -mt-12 z-10">

        {/* 2. Offer & CTA */}
        <div className="flex flex-col items-center justify-center gap-6 mb-16 animate-fade-in-up">
          <div className="text-xl font-medium text-yellow-300 bg-zinc-900/90 px-6 py-2 rounded-full border border-gold/40 shadow-[0_0_15px_rgba(215,186,82,0.2)] backdrop-blur-sm">
            Promotional Offer: <span className="line-through text-zinc-500 mr-2">₹749</span>
            <span className="text-gold font-bold text-2xl">₹549</span>
          </div>

          <Link to="/signup" className="inline-flex items-center justify-center h-14 px-12 text-lg font-bold text-black bg-gold rounded-full hover:bg-gold-600 transition-all shadow-[0_0_20px_rgba(215,186,82,0.4)] hover:shadow-[0_0_30px_rgba(215,186,82,0.6)] hover:scale-105">
            Get Started Now
          </Link>
        </div>

        {/* 3. Sign In & Main Heading */}
        <div className="mb-12 space-y-6">
          <div>
            <Link to="/login" className="text-base sm:text-lg font-medium text-zinc-400 hover:text-white transition-colors border-b border-zinc-700 hover:border-white pb-0.5">
              Already have an account? Sign In
            </Link>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
            <span className="block text-white mb-1">Unlock Your</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-gold via-yellow-200 to-gold">Network's Potential</span>
            <span className="block text-white text-2xl sm:text-3xl mt-4 font-light opacity-90">
              with One Tap.
            </span>
          </h1>
        </div>

        {/* 4. Description */}
        <p className="max-w-3xl mx-auto text-lg sm:text-xl text-zinc-400 leading-relaxed font-normal">
          We craft premium <span className="text-white font-semibold">NFC Business Cards, Restaurant Standies, Google Review Cards, Payment Cards, Instagram Keychains, and YouTube Cards</span>. Welcome to the future of connectivity with CanopyCorp.
        </p>

      </section>

      {/* Features Section */}
      <section className="py-24 bg-zinc-950/50 border-y border-zinc-900 relative">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold text-gold tracking-[0.2em] uppercase mb-3">Features</h2>
            <p className="text-3xl font-extrabold text-white tracking-tight sm:text-5xl">
              Network Smarter, Not Harder
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: <ShareIcon />,
                title: "Instant Sharing",
                desc: "Share your contact details, social profiles, and more with a single tap. No apps required for the recipient."
              },
              {
                icon: <LeafIcon />,
                title: "Eco-Friendly",
                desc: "Reduce paper waste and your carbon footprint. One card is all you'll ever need."
              },
              {
                icon: <PaintBrushIcon />,
                title: "Fully Customizable",
                desc: "Design a digital profile that truly represents you or your brand. Update it anytime, instantly."
              }
            ].map((feature, idx) => (
              <div key={idx} className="group relative p-8 bg-zinc-900/40 rounded-2xl border border-zinc-800 hover:border-gold/30 transition-all duration-300 hover:bg-zinc-900/60 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-zinc-800 border border-zinc-700 mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-black/50">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-base text-zinc-400 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">How It Works</h2>
          <p className="text-lg text-zinc-400 mb-16">
            Get your digital business card in three simple steps.
          </p>
          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Dashed line connector for desktop */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px">
              <div className="w-full h-full border-t-2 border-dashed border-zinc-800"></div>
            </div>

            {[
              { step: 1, title: "Create Profile", desc: "Sign up and fill in your contact details, social media links, and professional info." },
              { step: 2, title: "Design Card", desc: "Customize the look of your physical NFC card and your digital profile." },
              { step: 3, title: "Tap to Share", desc: "Receive your card and start networking by tapping it on any smartphone." }
            ].map((item) => (
              <div key={item.step} className="relative z-10 flex flex-col items-center group">
                <div className="flex items-center justify-center h-24 w-24 rounded-full bg-zinc-900 text-gold font-bold text-3xl border-4 border-zinc-800 shadow-[0_0_30px_-10px_rgba(215,186,82,0.3)] group-hover:border-gold transition-colors duration-300 mb-6">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed max-w-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-zinc-900 border-y border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-white">Loved by Professionals</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { quote: "This card is a game-changer. I get compliments every time I use it, and it makes follow-ups so much easier.", name: "Shirish Date", role: "Real Estate Agent" },
              { quote: "As a tech founder, I love the blend of physical and digital. It's sleek, sustainable, and super efficient.", name: "Siddharth Yadav", role: "Startup CEO" }
            ].map((testimonial, idx) => (
              <div key={idx} className="bg-zinc-950 p-10 rounded-2xl border border-zinc-800 relative">
                <svg className="absolute top-6 left-6 h-8 w-8 text-gold opacity-20" fill="currentColor" viewBox="0 0 32 32"><path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" /></svg>
                <p className="text-zinc-300 text-lg relative z-10 italic mb-6">"{testimonial.quote}"</p>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-white">{testimonial.name}</p>
                    <p className="text-sm text-zinc-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[100px] -z-10"></div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-6">Ready to Elevate Your Connections?</h2>
          <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
            Join thousands of professionals who have upgraded their networking game.
          </p>
          <div className="flex justify-center">
            <Link to="/signup" className="inline-flex items-center justify-center h-16 px-10 text-lg font-bold text-black bg-gold rounded-lg hover:bg-gold-600 transition-colors shadow-lg shadow-gold/20">
              Get Started Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
