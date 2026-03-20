const fs = require('fs');
const files = ['src/js/pages/admin.js', 'src/js/pages/vendor.js', 'src/js/pages/auth.js', 'src/js/pages/user-pages.js'];

files.forEach(file => {
    if (fs.existsSync(file)) {
        let c = fs.readFileSync(file, 'utf8');

        // Fix spaces inside HTML tags inadvertently added by a rogue formatter
        c = c.replace(/<\s*div\s+class\s*=\s*(['"])/g, '<div class=$1');
        c = c.replace(/<\s*div\s+id\s*=\s*(['"])/g, '<div id=$1');
        c = c.replace(/(['"])\s*>\s*/g, '$1>');
        c = c.replace(/<\/\s*div\s*>/g, '</div>');
        c = c.replace(/data\s*-\s*plan\s*-\s*idx/g, 'data-plan-idx');
        c = c.replace(/<\s*div\s*>/g, '<div>');

        // Some other common issues with the rogue formatter:
        c = c.replace(/<\s*!--/g, '<!--');
        c = c.replace(/--\s*>/g, '-->');

        fs.writeFileSync(file, c);
        console.log('Fixed', file);
    }
});
