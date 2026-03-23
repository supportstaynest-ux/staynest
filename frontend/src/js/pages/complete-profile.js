import { updateProfile, uploadAvatar } from '../supabase.js';
import { state, setState, showToast, showLoading, hideLoading, CITIES } from '../state.js';
import { navigate } from '../router.js';
import { redirectByRole } from './auth.js';
import { renderNavbar, initNavbarEvents } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';

export function renderCompleteProfile() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="min-h-screen flex flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 transition-colors duration-300">
        ${renderNavbar()}
        
        <main class="flex-grow flex items-center justify-center p-4 py-12 w-full max-w-7xl mx-auto animate-in zoomIn">
            <div class="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl p-8 md:p-12 shadow-xl border border-slate-100 dark:border-slate-800">
                <div class="text-center mb-8">
                    <h2 class="text-3xl font-black text-slate-900 dark:text-white mb-2">Complete Your Profile</h2>
                    <p class="text-slate-500 font-medium">Help us customize your PG search experience</p>
                </div>
                
                <form id="profile-form" class="space-y-6">
                    <div class="flex flex-col items-center justify-center mb-6">
                        <div id="avatar-preview" class="size-28 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-700 flex items-center justify-center mb-3 cursor-pointer overflow-hidden group hover:border-primary transition-colors relative" onclick="document.getElementById('avatar-input').click()">
                            <span class="material-symbols-outlined text-4xl text-slate-400 group-hover:scale-110 transition-transform">add_a_photo</span>
                            <div class="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[10px] uppercase font-bold text-center py-1 opacity-0 group-hover:opacity-100 transition-opacity">Upload</div>
                        </div>
                        <input type="file" id="avatar-input" accept="image/*" class="hidden">
                        <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Profile Photo</span>
                    </div>

                    <div class="space-y-5">
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Full Name <span class="text-red-500">*</span></label>
                            <input id="cp-name" placeholder="John Doe" required class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Phone Number</label>
                            <input id="cp-phone" placeholder="+91 9876543210" type="tel" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all">
                        </div>
                        
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Gender <span class="text-red-500">*</span></label>
                                <select id="cp-gender" required class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none cursor-pointer hidden-scrollbar">
                                    <option value="" disabled selected>Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Preferred City</label>
                                <select id="cp-city" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none cursor-pointer hidden-scrollbar">
                                    <option value="">Select City</option>
                                    ${CITIES.map(c => `<option value="${c}">${c}</option>`).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="pt-2">
                            <div class="flex items-center justify-between mb-4">
                                <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300">Monthly Budget Range</label>
                                <span id="budget-label" class="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">₹0 – ₹50,000</span>
                            </div>
                            <div class="flex flex-col gap-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div class="flex items-center gap-4">
                                    <span class="text-xs font-bold text-slate-400 w-8">Min</span>
                                    <input type="range" id="cp-budget-min" min="0" max="50000" step="1000" value="0" class="flex-1 accent-primary">
                                </div>
                                <div class="flex items-center gap-4">
                                    <span class="text-xs font-bold text-slate-400 w-8">Max</span>
                                    <input type="range" id="cp-budget-max" min="0" max="50000" step="1000" value="50000" class="flex-1 accent-primary">
                                </div>
                            </div>
                        </div>
                    </div>

                    <button type="submit" class="w-full bg-primary hover:brightness-110 text-white font-bold py-4 rounded-xl transition-all shadow-md mt-8 flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined text-[20px]">save</span> Save Profile
                    </button>
                    ${state.profile ? `<button type="button" onclick="window.history.back()" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl transition-all mt-3">Cancel</button>` : ''}
                </form>
            </div>
        </main>
        
        ${renderFooter()}
    </div>
    <style>.hidden-scrollbar::-webkit-scrollbar{display:none;}</style>`;

  initNavbarEvents();

  const budgetMin = document.getElementById('cp-budget-min');
  const budgetMax = document.getElementById('cp-budget-max');
  const budgetLabel = document.getElementById('budget-label');

  // Pre-fill if profile exists
  if (state.profile) {
    document.getElementById('cp-name').value = state.profile.full_name || '';
    document.getElementById('cp-phone').value = state.profile.phone || '';
    if (state.profile.gender) {
        const genLower = state.profile.gender.toLowerCase();
        const sel = document.getElementById('cp-gender');
        if (Array.from(sel.options).some(o => o.value === genLower)) {
            sel.value = genLower;
        }
    }
    document.getElementById('cp-city').value = state.profile.preferred_city || '';
    if (state.profile.budget_min !== undefined) budgetMin.value = state.profile.budget_min;
    if (state.profile.budget_max !== undefined) budgetMax.value = state.profile.budget_max;
    if (state.profile.avatar_url) {
      document.getElementById('avatar-preview').innerHTML = `<img src="${state.profile.avatar_url}" class="w-full h-full object-cover">`;
    }
  }

  const updateBudget = () => {
    const mn = Math.min(+budgetMin.value, +budgetMax.value);
    const mx = Math.max(+budgetMin.value, +budgetMax.value);
    budgetLabel.textContent = `₹${mn.toLocaleString('en-IN')} – ₹${mx.toLocaleString('en-IN')}`;
  };
  budgetMin.oninput = updateBudget;
  budgetMax.oninput = updateBudget;
  updateBudget();

  let avatarFile = null;
  document.getElementById('avatar-input').onchange = (e) => {
    avatarFile = e.target.files[0];
    if (avatarFile) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        document.getElementById('avatar-preview').innerHTML = `<img src="${ev.target.result}" class="w-full h-full object-cover">`;
      };
      reader.readAsDataURL(avatarFile);
    }
  };

  document.getElementById('profile-form').onsubmit = async (e) => {
    e.preventDefault();
    showLoading();
    try {
      let avatar_url = null;
      if (avatarFile) avatar_url = await uploadAvatar(state.user.id, avatarFile);
      const updates = {
        full_name: document.getElementById('cp-name').value,
        phone: document.getElementById('cp-phone').value,
        gender: document.getElementById('cp-gender').value,
        preferred_city: document.getElementById('cp-city').value || null,
        budget_min: Math.min(+budgetMin.value, +budgetMax.value),
        budget_max: Math.max(+budgetMin.value, +budgetMax.value),
      };
      if (avatar_url) updates.avatar_url = avatar_url;
      const profile = await updateProfile(state.user.id, updates);
      setState({ profile });
      showToast('Profile saved successfully!', 'success');
      redirectByRole(profile);
    } catch (err) { showToast(err.message, 'error'); }
    hideLoading();
  };
}
