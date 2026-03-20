const fs = require('fs');
let c = fs.readFileSync('src/js/pages/admin.js', 'utf8');

c = c.replace(/<\s*div\s*class=\s*"/g, '<div class="');
c = c.replace(/"\s*>/g, '">');
c = c.replace(/<\/\s*div\s*>/g, '</div>');
c = c.replace(/data\s*-\s*plan\s*-\s*idx/g, 'data-plan-idx');

fs.writeFileSync('src/js/pages/admin.js', c);
console.log('Fixed tags with flexible regex');
