const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '../src/migrations');
const destination = path.join(__dirname, '../dist/migrations');

fs.cpSync(source, destination, { recursive: true });
