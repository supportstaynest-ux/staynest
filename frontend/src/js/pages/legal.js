import { renderNavbar, initNavbarEvents } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';

function legalPageShell(content) {
    return `
    <div class="relative flex min-h-screen w-full flex-col bg-[#F8FAFC] dark:bg-background-dark font-display text-[#1F2937] dark:text-slate-200">
      ${renderNavbar()}
      <main class="flex-grow">
        ${content}
      </main>
      ${renderFooter()}
    </div>`;
}

// ── About Us ──────────────────────────────────────────────
export function renderAbout() {
    const app = document.getElementById('app');
    app.innerHTML = legalPageShell(`
    <section class="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      
      <!-- Hero -->
      <div class="text-center mb-16">
        <div class="inline-flex items-center gap-2 bg-primary/10 text-primary font-bold text-sm px-4 py-2 rounded-full mb-6">
          <span class="material-symbols-outlined text-[18px]">info</span> Learn About Us
        </div>
        <h1 class="text-4xl md:text-5xl font-black mb-4" style="font-family:'Poppins',sans-serif;">About StayNest</h1>
        <div class="w-20 h-1.5 bg-primary mx-auto rounded-full mb-8"></div>
        <p class="text-lg leading-relaxed text-slate-600 dark:text-slate-400 max-w-2xl mx-auto" style="font-family:'Inter','Poppins',sans-serif;">
          StayNest is a modern platform designed to help students and working professionals find safe, affordable and comfortable PG accommodations near their colleges, universities and workplaces. Our goal is to simplify the process of discovering trusted living spaces by providing verified listings, advanced search filters and direct communication with PG owners.
        </p>
      </div>

      <!-- Mission -->
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-md mb-8">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <span class="material-symbols-outlined text-primary text-2xl">flag</span>
          </div>
          <h2 class="text-2xl font-bold" style="font-family:'Poppins',sans-serif;">Our Mission</h2>
        </div>
        <p class="text-base leading-relaxed text-slate-600 dark:text-slate-400" style="font-family:'Inter','Poppins',sans-serif;">
          To make PG discovery simple, transparent and reliable for everyone.
        </p>
      </div>

      <!-- What We Offer -->
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-md mb-8">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
            <span class="material-symbols-outlined text-teal-500 text-2xl">star</span>
          </div>
          <h2 class="text-2xl font-bold" style="font-family:'Poppins',sans-serif;">What We Offer</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          ${[
            { icon: 'verified', text: 'Verified PG listings', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/10' },
            { icon: 'search', text: 'Easy search by location, budget and amenities', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10' },
            { icon: 'lock', text: 'Secure communication with PG owners', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/10' },
            { icon: 'handshake', text: 'A trusted platform for students and professionals', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/10' }
        ].map(f => `
            <div class="flex items-start gap-3 ${f.bg} p-4 rounded-xl">
              <span class="material-symbols-outlined ${f.color} text-2xl shrink-0 mt-0.5">${f.icon}</span>
              <span class="text-sm font-medium text-slate-700 dark:text-slate-300">${f.text}</span>
            </div>`).join('')}
        </div>
      </div>

      <!-- Vision -->
      <div class="bg-gradient-to-br from-primary/5 to-teal-500/5 dark:from-primary/10 dark:to-teal-500/10 border border-primary/20 rounded-2xl p-8 shadow-md">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <span class="material-symbols-outlined text-primary text-2xl">visibility</span>
          </div>
          <h2 class="text-2xl font-bold" style="font-family:'Poppins',sans-serif;">Our Vision</h2>
        </div>
        <p class="text-base leading-relaxed text-slate-600 dark:text-slate-400" style="font-family:'Inter','Poppins',sans-serif;">
          We aim to become India's most trusted PG discovery platform — helping thousands of people find the perfect place to stay.
        </p>
      </div>

    </section>
  `);
    initNavbarEvents();
}

// ── Privacy Policy ────────────────────────────────────────
export function renderPrivacy() {
    const sections = [
        { icon: 'database', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10', title: 'Information We Collect', text: 'StayNest may collect basic information such as name, email address and phone number when users create an account or contact PG owners.' },
        { icon: 'analytics', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/10', title: 'How We Use Information', text: 'The information collected is used to improve our platform, help users discover PG accommodations and enable communication between users and property owners.' },
        { icon: 'shield', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/10', title: 'Data Protection', text: 'We implement appropriate security measures to protect user data from unauthorized access or misuse.' },
        { icon: 'extension', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/10', title: 'Third-Party Services', text: 'StayNest may use trusted third-party services such as maps or authentication providers to improve functionality.' },
        { icon: 'tune', color: 'text-primary', bg: 'bg-primary/10 dark:bg-primary/20', title: 'User Control', text: 'Users can request deletion or modification of their account information at any time.' }
    ];

    const app = document.getElementById('app');
    app.innerHTML = legalPageShell(`
    <section class="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div class="text-center mb-16">
        <div class="inline-flex items-center gap-2 bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold text-sm px-4 py-2 rounded-full mb-6">
          <span class="material-symbols-outlined text-[18px]">privacy_tip</span> Your Privacy Matters
        </div>
        <h1 class="text-4xl md:text-[42px] font-black mb-4" style="font-family:'Poppins',sans-serif;">Privacy Policy</h1>
        <div class="w-20 h-1.5 bg-violet-500 mx-auto rounded-full"></div>
      </div>

      <div class="space-y-6">
        ${sections.map(s => `
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-md">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center">
                <span class="material-symbols-outlined ${s.color} text-xl">${s.icon}</span>
              </div>
              <h2 class="text-xl font-bold" style="font-family:'Poppins',sans-serif;">${s.title}</h2>
            </div>
            <p class="text-base leading-relaxed text-slate-600 dark:text-slate-400 pl-14" style="font-family:'Inter',sans-serif;">${s.text}</p>
          </div>
        `).join('')}
      </div>
    </section>
  `);
    initNavbarEvents();
}

// ── Terms of Service ──────────────────────────────────────
export function renderTerms() {
    const sections = [
        { icon: 'devices', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10', title: 'Platform Usage', text: 'Users agree to use StayNest only for lawful purposes and provide accurate information when creating accounts or contacting property owners.' },
        { icon: 'apartment', color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/10', title: 'Listings', text: 'StayNest acts as a discovery platform and does not own or manage PG properties listed on the platform.' },
        { icon: 'person', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/10', title: 'User Responsibility', text: 'Users are responsible for verifying property details, rental terms and payment conditions directly with the PG owner.' },
        { icon: 'gavel', color: 'text-primary', bg: 'bg-primary/10 dark:bg-primary/20', title: 'Account Rules', text: 'StayNest reserves the right to suspend or remove accounts involved in fraudulent activities, spam or misuse of the platform.' },
        { icon: 'update', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/10', title: 'Service Changes', text: 'StayNest may update features, policies or services periodically to improve user experience.' }
    ];

    const app = document.getElementById('app');
    app.innerHTML = legalPageShell(`
    <section class="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div class="text-center mb-16">
        <div class="inline-flex items-center gap-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-sm px-4 py-2 rounded-full mb-6">
          <span class="material-symbols-outlined text-[18px]">description</span> Legal Agreement
        </div>
        <h1 class="text-4xl md:text-[42px] font-black mb-4" style="font-family:'Poppins',sans-serif;">Terms of Service</h1>
        <div class="w-20 h-1.5 bg-teal-500 mx-auto rounded-full"></div>
      </div>

      <div class="space-y-6">
        ${sections.map((s, i) => `
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-md">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center">
                <span class="material-symbols-outlined ${s.color} text-xl">${s.icon}</span>
              </div>
              <h2 class="text-xl font-bold" style="font-family:'Poppins',sans-serif;">${s.title}</h2>
              <span class="ml-auto text-xs text-slate-400 font-bold">${i + 1} / ${sections.length}</span>
            </div>
            <p class="text-base leading-relaxed text-slate-600 dark:text-slate-400 pl-14" style="font-family:'Inter',sans-serif;">${s.text}</p>
          </div>
        `).join('')}
      </div>
    </section>
  `);
    initNavbarEvents();
}

// ── Contact ───────────────────────────────────────────────
export function renderContact() {
    const app = document.getElementById('app');
    app.innerHTML = legalPageShell(`
    <section class="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div class="text-center mb-16">
        <div class="inline-flex items-center gap-2 bg-primary/10 text-primary font-bold text-sm px-4 py-2 rounded-full mb-6">
          <span class="material-symbols-outlined text-[18px]">support_agent</span> Get In Touch
        </div>
        <h1 class="text-4xl md:text-[42px] font-black mb-4" style="font-family:'Poppins',sans-serif;">Contact StayNest</h1>
        <div class="w-20 h-1.5 bg-primary mx-auto rounded-full mb-6"></div>
        <p class="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto" style="font-family:'Inter',sans-serif;">
          If you have any questions, feedback or support requests, feel free to reach out to us.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <!-- Email Support -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-md text-center hover:shadow-lg hover:border-primary/40 transition-all">
          <div class="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center mx-auto mb-5">
            <span class="material-symbols-outlined text-blue-500 text-3xl">mail</span>
          </div>
          <h3 class="text-lg font-bold mb-2" style="font-family:'Poppins',sans-serif;">Email Support</h3>
          <a href="mailto:support@staynest.com" class="text-primary font-semibold text-sm hover:underline">support@staynest.com</a>
        </div>

        <!-- Business Inquiries -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-md text-center hover:shadow-lg hover:border-primary/40 transition-all">
          <div class="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-900/10 flex items-center justify-center mx-auto mb-5">
            <span class="material-symbols-outlined text-teal-500 text-3xl">work</span>
          </div>
          <h3 class="text-lg font-bold mb-2" style="font-family:'Poppins',sans-serif;">Business Inquiries</h3>
          <a href="mailto:contact@staynest.com" class="text-primary font-semibold text-sm hover:underline">contact@staynest.com</a>
        </div>

        <!-- Response Time -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-md text-center hover:shadow-lg hover:border-primary/40 transition-all">
          <div class="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/10 flex items-center justify-center mx-auto mb-5">
            <span class="material-symbols-outlined text-amber-500 text-3xl">schedule</span>
          </div>
          <h3 class="text-lg font-bold mb-2" style="font-family:'Poppins',sans-serif;">Response Time</h3>
          <p class="text-sm font-semibold text-slate-500 dark:text-slate-400">Within 24–48 hours</p>
        </div>
      </div>

      <!-- Thank You -->
      <div class="bg-gradient-to-r from-primary/5 to-teal-500/5 dark:from-primary/10 dark:to-teal-500/10 border border-primary/20 rounded-2xl p-8 text-center">
        <span class="material-symbols-outlined text-primary text-4xl mb-3 block">favorite</span>
        <p class="text-lg font-bold text-slate-800 dark:text-slate-200" style="font-family:'Poppins',sans-serif;">Thank you for using StayNest.</p>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">We're always here to help you find your perfect stay.</p>
      </div>
    </section>
  `);
    initNavbarEvents();
}
