const fs = require('fs');
const path = require('path');

const CODED_LOGO = `                <a href="#/home" class="flex items-center gap-2 group p-1 transition-transform hover:scale-[1.02]">
                    <svg viewBox="0 0 100 100" class="h-9 w-9 md:h-10 md:w-10 flex-shrink-0 drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="logoBg" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stop-color="#4EEDCD"/>
                          <stop offset="45%" stop-color="#27ADD2"/>
                          <stop offset="55%" stop-color="#0C4FCE"/>
                          <stop offset="100%" stop-color="#061546"/>
                        </linearGradient>
                      </defs>
                      <rect x="10" y="10" width="80" height="80" rx="28" fill="url(#logoBg)"/>
                      <path d="M 82 20 Q 82 24 86 24 Q 82 24 82 28 Q 82 24 78 24 Q 82 24 82 20" fill="#4EEDCD" />
                      <path d="M 72 15 Q 72 18 75 18 Q 72 18 72 21 Q 72 18 69 18 Q 72 18 72 15" fill="#4EEDCD" />
                      <path d="M 90 32 Q 90 34 92 34 Q 90 34 90 36 Q 90 34 88 34 Q 90 34 90 32" fill="#4EEDCD" />
                      <text x="50" y="72" font-family="'Poppins', sans-serif" font-size="64" font-weight="900" fill="white" text-anchor="middle">N</text>
                    </svg>
                    <div class="flex flex-col justify-center mt-1">
                      <h2 class="text-[26px] md:text-3xl font-black tracking-tight leading-none mb-0.5" style="font-family:'Poppins', sans-serif;">
                        <span class="text-[#0A1A44] dark:text-white">Nesto</span><span class="text-transparent bg-clip-text bg-gradient-to-r from-[#0C8990] to-[#34CDCB]">ra</span>
                      </h2>
                      <div class="h-px w-full bg-gradient-to-r from-[#0A1A44] to-[#34CDCB] opacity-30 dark:from-white mb-0.5"></div>
                      <p class="text-[6.5px] md:text-[7.5px] font-bold text-slate-500 tracking-[0.16em] uppercase whitespace-nowrap">Your First Home Away From Home</p>
                    </div>
                </a>`;

const PATTERNS_TO_REPLACE = [
  /<a href="#\/home" class="flex flex-col items-center gap-0\.5 group mt-1">\s*<img src="\/assets\/images\/logo-dark\.jpg"[\s\S]*?Your First Home Away From Home<\/span>\s*<\/a>/g,
  /<a href="#\/home" class="flex flex-col items-center gap-0\.5 text-primary hover:opacity-90 transition-opacity">\s*<img src="\/assets\/images\/logo-dark\.jpg"[\s\S]*?Your First Home Away From Home<\/span>\s*<\/a>/g,
  /<a href="#\/home" class="flex flex-col items-start gap-0\.5 mt-1">\s*<img src="\/assets\/images\/logo-dark\.jpg"[\s\S]*?Your First Home Away From Home<\/span>\s*<\/a>/g,
  /<a href="#\/home" class="flex flex-col items-start gap-0\.5 w-full mt-1">\s*<div class="flex items-end gap-2">\s*<img src="\/assets\/images\/logo-dark\.jpg"[\s\S]*?Your First Home Away From Home<\/span>\s*<\/a>/g,
  /<a href="#\/home" class="flex flex-col items-start gap-0\.5 w-full mt-1">\s*<img src="\/assets\/images\/logo-dark\.jpg"[\s\S]*?VENDOR CONSOLE<\/p>\s*<\/a>/g,
];

const files = [
  'c:/Users/pc/Desktop/staynest/frontend/src/js/components/navbar.js',
  'c:/Users/pc/Desktop/staynest/frontend/src/js/pages/auth.js',
  'c:/Users/pc/Desktop/staynest/frontend/src/js/pages/dashboard.js',
  'c:/Users/pc/Desktop/staynest/frontend/src/js/pages/admin.js',
  'c:/Users/pc/Desktop/staynest/frontend/src/js/pages/vendor.js',
  'c:/Users/pc/Desktop/staynest/frontend/src/js/pages/onboarding.js'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let replaced = false;
    
    PATTERNS_TO_REPLACE.forEach(regex => {
      if (regex.test(content)) {
        content = content.replace(regex, CODED_LOGO);
        replaced = true;
      }
    });
    
    // Also perform any fallback search if the file was missed by strict regex
    if (!replaced && content.includes('logo-dark.jpg')) {
        // Find the <a> tag that contains logo-dark.jpg
        const aStart = content.lastIndexOf('<a href="#/home"', content.indexOf('logo-dark.jpg'));
        const aEnd = content.indexOf('</a>', aStart) + 4;
        if (aStart !== -1 && aEnd !== -1) {
            content = content.slice(0, aStart) + CODED_LOGO + content.slice(aEnd);
            replaced = true;
        }
    }

    if (replaced) {
      fs.writeFileSync(file, content, 'utf8');
      console.log('Updated ' + file);
    }
  }
});
