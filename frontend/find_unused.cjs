const fs = require('fs');
const path = require('path');

const rootDirs = ['src', 'public', 'index.html'];

function getAllFiles(dirPath, arrayOfFiles) {
    if (!fs.existsSync(dirPath)) return arrayOfFiles;
    
    // If it's a file, push and return
    if (fs.statSync(dirPath).isFile()) {
        arrayOfFiles.push(dirPath);
        return arrayOfFiles;
    }

    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        if (file === 'node_modules' || file === '.git' || file === 'dist' || file.startsWith('.')) {
            return;
        }
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
            // only check specific extensions
            arrayOfFiles.push(fullPath);
        }
    });

    return arrayOfFiles;
}

let allFiles = [];
rootDirs.forEach(d => {
    allFiles = getAllFiles(d, allFiles);
});
allFiles = allFiles.map(f => f.replace(/\\/g, '/'));

console.log('Total files to check:', allFiles.length);

// Read all file contents
const fileContents = allFiles.map(f => {
    try {
        return fs.readFileSync(f, 'utf8');
    } catch (e) {
        return '';
    }
});

const unusedFiles = [];
const possiblyUnused = [];

allFiles.forEach(file => {
    const basename = path.basename(file);
    if (basename === 'main.js' || basename === 'index.html' || basename === 'index.css' || basename === 'vite.config.js' || basename === 'package.json') {
        return; // Entry points
    }

    let isUsed = false;
    let occurrences = 0;

    for (let i = 0; i < fileContents.length; i++) {
        if (allFiles[i] === file) continue; // Skip self

        // check if basename without extension is mentioned
        const ext = path.extname(basename);
        const nameWithoutExt = basename.replace(ext, '');
        
        // Match exact basename or path
        if (fileContents[i].includes(basename) || fileContents[i].includes(nameWithoutExt)) {
            isUsed = true;
            occurrences++;
            break;
        }
    }

    if (!isUsed) {
        unusedFiles.push(file);
    }
});

console.log('--- UNUSED FILES ---');
unusedFiles.forEach(f => console.log(f));
console.log('--- DONE ---');
