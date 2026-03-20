import { setOnboarded } from '../state.js';
import { navigate } from '../router.js';

const slides = [
  {
    icon: 'search',
    title: 'Find Your Perfect PG',
    desc: 'Discover premium living spaces tailored for students and working professionals.',
    img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800&auto=format&fit=crop'
  },
  {
    icon: 'location_city',
    title: 'Explore Top Cities',
    desc: 'From Delhi to Bangalore, find stays in top educational and tech hubs across India.',
    img: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?q=80&w=800&auto=format&fit=crop'
  },
  {
    icon: 'compare_arrows',
    title: 'Compare Prices & Amenities',
    desc: 'View transparent pricing, WiFi, AC, and food facilities side by side for a smart choice.',
    img: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=800&auto=format&fit=crop'
  },
  {
    icon: 'verified_user',
    title: 'Secure & Verified Listings',
    desc: 'Your safety is our priority. Every listing is manually verified by our team before going live.',
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop'
  },
  {
    icon: 'chat',
    title: 'Contact Owners Directly',
    desc: 'Skip the heavy commission fees. Message or call property owners instantly and book your stay.',
    img: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?q=80&w=800&auto=format&fit=crop'
  }
];

export function renderOnboarding() {
  const app = document.getElementById('app');
  let current = 0;

  function render() {
    app.innerHTML = `
      <div class="relative flex h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <!-- Top Navigation -->
        <header class="flex items-center justify-between px-6 py-4 md:px-12 lg:px-40 border-b border-primary/10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md z-10">
            <div class="flex items-center gap-2">
                <div class="flex items-center justify-center size-10 rounded-lg bg-primary text-white">
                    <span class="material-symbols-outlined text-2xl">home_pin</span>
                </div>
                <h1 class="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">StayNest</h1>
            </div>
            <button onclick="window._skipOnboarding()" class="text-sm font-semibold text-slate-500 hover:text-primary transition-colors">
                Skip
            </button>
        </header>

        <!-- Main Slider Content -->
        <main class="flex-1 overflow-x-hidden relative flex flex-col justify-center animate-in fadeIn">
            <div class="px-6 md:px-12 w-full max-w-lg mx-auto flex flex-col items-center text-center mt-[-2rem]">
                <div class="w-full aspect-[4/3] rounded-3xl bg-slate-100 dark:bg-slate-800 mb-8 overflow-hidden relative shadow-lg">
                    <img src="${slides[current].img}" class="w-full h-full object-cover" />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-6">
                        <div class="size-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-lg">
                            <span class="material-symbols-outlined text-3xl">${slides[current].icon}</span>
                        </div>
                    </div>
                </div>
                <h2 class="text-2xl md:text-3xl font-extrabold mb-3 text-slate-900 dark:text-white leading-tight">${slides[current].title}</h2>
                <p class="text-slate-500 font-medium leading-relaxed px-4">${slides[current].desc}</p>
            </div>
        </main>

        <!-- Footer: Progress & Navigation -->
        <footer class="p-6 md:p-8 lg:p-12 w-full max-w-md mx-auto flex flex-col gap-8 pb-10">
            <!-- Progress Dots -->
            <div class="flex justify-center gap-2">
                ${slides.map((_, i) => `<div class="h-1.5 ${i === current ? 'w-8 bg-primary rounded-full' : 'w-2 bg-slate-200 dark:bg-slate-700 rounded-full'} transition-all duration-300"></div>`).join('')}
            </div>

            <!-- Dynamic Buttons -->
            <div class="w-full">
                ${current < slides.length - 1 ? `
                <button onclick="window._nextSlide()" class="w-full bg-primary text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-md text-lg">
                    Next
                </button>
                ` : `
                <div class="flex flex-col gap-3 w-full animate-in slideInUp">
                    <button onclick="window._getStarted()" class="w-full bg-primary text-white font-bold py-4 rounded-xl flex items-center justify-center transition-all shadow-md text-lg">
                        Sign Up
                    </button>
                    <button onclick="window._getStarted()" class="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold py-4 rounded-xl flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-lg">
                        Log In
                    </button>
                </div>
                `}
            </div>
        </footer>
      </div>
    `;
  }

  window._prevSlide = () => { if (current > 0) { current--; render(); } };
  window._nextSlide = () => { if (current < slides.length - 1) { current++; render(); } };
  window._skipOnboarding = () => { setOnboarded(); navigate('/home'); };
  window._getStarted = () => { setOnboarded(); navigate('/auth'); };

  render();
  return () => { delete window._nextSlide; delete window._prevSlide; delete window._skipOnboarding; delete window._getStarted; };
}
