const fs = require('fs');
fs.renameSync('temp/cjs/index.js', 'dist/index.js');
fs.renameSync('temp/mjs/index.js', 'dist/index.mjs');