const fs = require('fs');
let c = fs.readFileSync('src/js/pages/admin.js', 'utf8');

c = c.replace(/<\s+div\s+class=\s+"/g, '<div class="');
c = c.replace(/<\s+div\s+class\s*=\s*"/g, '<div class="');
c = c.replace(/<\s*div\s*class\s*=\s*"/g, '<div class="');
c = c.replace(/"\s+>/g, '">');
c = c.replace(/<\s*\/\s*div\s*>/g, '</div>');
c = c.replace(/<\s*!\s*-\s*-/g, '<!--');
c = c.replace(/-\s*-\s*>/g, '-->');

// Fix the planCard inner div
c = c.replace(/data\s*-\s*plan\s*-\s*idx/g, 'data-plan-idx');

// Add prettier-ignore to all content declarations
c = c.replace(/const\s+content\s*=\s*`/g, '// prettier-ignore\n  const content = `');

// Fix planCard definition specifically
c = c.replace(/const\s+planCard\s*=\s*\(p,\s*idx\)\s*=>\s*`/g, '// prettier-ignore\n  const planCard = (p, idx) => `');

// Also fix any other variables that might be formatted
c = c.replace(/const\s+adminLayout\s*=\s*\(content,\s*activeTab,\s*pageTitle\)\s*=>\s*`/g, '// prettier-ignore\nexport const adminLayout = (content, activeTab, pageTitle) => `');

fs.writeFileSync('src/js/pages/admin.js', c);
console.log('Fixed Prettier issues in admin.js');
