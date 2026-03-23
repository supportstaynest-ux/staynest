const fs = require('fs');
const path = require('path');

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
          console.log('Reverted text in: ' + fullPath);
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
console.log('Text revert complete.');
