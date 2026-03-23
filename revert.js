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

const CODED_LOGO_ONBOARD = `            <div class="flex items-center gap-2 group p-1 w-full justify-center md:justify-start">
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
            </div>`;

// NOTE: Since the text replace string 'Nestora' will replace the text in these HTML strings, we must perform the HTML replacement AFTER the text replacement or dynamically re-insert them.
// Wait, actually, the easiest way is to read the file, replace the chunks exactly as they are now, THEN do a global text replace from Nestora back to StayNest, and nestora back to staynest.

const blocks = {
  'c:/Users/pc/Desktop/staynest/frontend/src/js/components/navbar.js': \`                <a href="#/home" class="flex items-center gap-2.5 group">
                    <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center shadow-md shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
                        <span class="material-symbols-outlined text-[20px] text-white">home_pin</span>
                    </div>
                    <h2 class="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white hidden sm:block">Stay<span class="text-primary">Nest</span></h2>
                </a>\`,
  'c:/Users/pc/Desktop/staynest/frontend/src/js/pages/auth.js': \`            <a href="#/home" class="flex items-center gap-2 text-primary hover:opacity-90 transition-opacity">
              <span class="material-symbols-outlined text-4xl">home_pin</span>
              <h2 class="text-2xl font-black leading-tight tracking-tight">StayNest</h2>
            </a>\`,
  'c:/Users/pc/Desktop/staynest/frontend/src/js/pages/dashboard.js': \`                <a href="#/home" class="flex items-center gap-3">
                    <div class="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                        <span class="material-symbols-outlined">home_pin</span>
                    </div>
                    <h1 class="text-xl font-bold tracking-tight text-slate-900 dark:text-white">StayNest</h1>
                </a>\`,
  'c:/Users/pc/Desktop/staynest/frontend/src/js/pages/admin.js': \`                <a href="#/home" class="flex items-center gap-3 w-full">
                    <div class="size-8 bg-primary rounded-lg flex items-center justify-center text-white shrink-0">
                        <span class="material-symbols-outlined font-bold text-lg">meeting_room</span>
                    </div>
                    <div>
                        <h1 class="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">StayNest</h1>
                        <p class="text-[10px] text-primary font-bold uppercase tracking-widest mt-0.5">ADMIN</p>
                    </div>
                </a>\`,
  'c:/Users/pc/Desktop/staynest/frontend/src/js/pages/vendor.js': \`                <a href="#/home" class="flex items-center gap-3 w-full">
                    <div class="size-10 bg-primary rounded-xl flex items-center justify-center text-white shrink-0">
                        <span class="material-symbols-outlined font-bold">home_work</span>
                    </div>
                    <div>
                        <h1 class="text-xl font-bold tracking-tight text-slate-900 dark:text-white">StayNest</h1>
                        <p class="text-xs text-slate-500 font-medium tracking-wide mt-1">Vendor Console</p>
                    </div>
                </a>\`,
  'c:/Users/pc/Desktop/staynest/frontend/src/js/pages/onboarding.js': \`            <div class="flex items-center gap-2">
                <div class="flex items-center justify-center size-10 rounded-lg bg-primary text-white">
                    <span class="material-symbols-outlined text-2xl">home_pin</span>
                </div>
                <h1 class="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">StayNest</h1>
            </div>\`
};

// Replace logo blocks back
Object.keys(blocks).forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let targetRegex = filePath.includes('onboarding') ? CODED_LOGO_ONBOARD : CODED_LOGO;
    
    // exact replacement handles newlines better
    if (content.includes(targetRegex)) {
        content = content.replace(targetRegex, blocks[filePath]);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(\`Reverted logo in \${filePath}\`);
    } else {
        // Fallback since the word "Nesto" to "Nestora" etc.
        // We will just do the global Nestora -> StayNest search and replace next anyway.
    }
  }
});

// Global text revert
const dirs = [
  'c:/Users/pc/Desktop/staynest/frontend/src',
  'c:/Users/pc/Desktop/staynest/backend'
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !fullPath.includes('node_modules') && !fullPath.includes('.git')) {
      processDir(fullPath);
    } else if (stat.isFile()) {
      const ext = path.extname(fullPath);
      if (['.js', '.ts', '.css', '.json', '.html'].includes(ext)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        let newContent = content
          .replace(/Nestora/g, 'StayNest')
          .replace(/nestora/g, 'staynest');
        
        if (content !== newContent) {
          fs.writeFileSync(fullPath, newContent, 'utf8');
          console.log(\`Reverted text in: \${fullPath}\`);
        }
      }
    }
  }
}

dirs.forEach(d => {
  if (fs.existsSync(d)) {
    processDir(d);
  }
});
console.log('Revert complete.');
