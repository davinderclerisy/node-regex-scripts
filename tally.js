const fs = require('fs');
const path = require('path');

// Start searching for HTML files from the current directory
const startDir = '/var/www/html/sntpms/pms-ui-staff';  // Adjust as needed

// Load the JSON file containing translation keys
const translationJsonPath = '/var/www/html/sntpms/pms-ui-staff/dist/rvLocales/EN.json';  // Adjust the path as needed
const translations = JSON.parse(fs.readFileSync(translationJsonPath, 'utf8'));

// Function to recursively check if a key exists in the JSON object
const keyExists = (obj, key) => {
  const keys = key.split('.');
  
  let currentObj = obj;
  for (const k of keys) {
    if (!currentObj || !Object.prototype.hasOwnProperty.call(currentObj, k)) {
      return false;
    }
    currentObj = currentObj[k];
  }
  return true;
};

// Regex patterns
const regex1 = /\{\{\s*'([^']*)'\s*\|\s*translate\s*\}\}/g;
const regex2 = /(?<=<[^>"{}]*(?:"[^"]*"[^>"{}]*)*(translate)[^>"{}]*(?:"[^"]*"[^>"{}]*)*>)([\w\s#.]+)(?=<\/([a-z]+)>)/gm;

// Function to check keys in HTML content
const checkKeysInHtml = (htmlContent, filePath) => {
  let match;

  // Check for keys in the first pattern
  while ((match = regex1.exec(htmlContent)) !== null) {
    const key = match[1];
    if (!keyExists(translations, key)) {
      console.log(`Missing key in JSON: ${key} in file ${filePath}`);
    }
  }

  // Check for keys in the second pattern
  while ((match = regex2.exec(htmlContent)) !== null) {
    const key = match[2].trim();
    if (!keyExists(translations, key)) {
      console.log(`Missing key in JSON: ${key} in file ${filePath}`);
    }
  }
};

let htmlFiles = [];

// Recursive function to traverse directories and find HTML files
const findHtmlFiles = (dir) => {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findHtmlFiles(filePath);
    } else if (stat.isFile() && path.extname(file) === '.html') {
      const htmlContent = fs.readFileSync(filePath, 'utf8');
      checkKeysInHtml(htmlContent, filePath);
      htmlFiles.push(filePath);
    }
  });
};

// Function to search for a specified HTML file in all .js and .html files
const findHtmlReferences = (dir, targetFile) => {
  const files = fs.readdirSync(dir);
  const targetFileName = path.basename(targetFile);
  let found = false;

  const searchFile = (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.replace(/<!--[\s\S]*?-->/g, '').includes(targetFileName)) {
      // console.log(`Found reference to ${targetFileName} in file ${filePath}`);
      found = true;
      return true;
    }
  };

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      found = findHtmlReferences(filePath, targetFile) || found;
    } else if (stat.isFile() && (path.extname(file) === '.js' || path.extname(file) === '.html') && !filePath.includes('/node_modules/') && !filePath.includes('/dist/')) {
      searchFile(filePath);
    }
  });

  return found;
};

findHtmlFiles(startDir);

htmlFiles = htmlFiles.filter((htmlFile) => !htmlFile.includes('/node_modules/') && !htmlFile.includes('/dist/'));

const notFoundFiles = []

for (const htmlFile of htmlFiles) {
  // draw progress bar in colourful text red and green
  const progress = (htmlFiles.indexOf(htmlFile) / htmlFiles.length) * 100;
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(`Progress: ${progress.toFixed(2)}% (${htmlFiles.indexOf(htmlFile) + 1}/${htmlFiles.length})`);
  process.stdout.write('\x1b[32m');
  process.stdout.write(' ✓ ');
  process.stdout.write('\x1b[31m');
  process.stdout.write(` ${htmlFile} `);
  process.stdout.write('\x1b[0m');
  const found = findHtmlReferences(startDir, htmlFile.split('/').pop());
  if (!found) {
    notFoundFiles.push(htmlFile);
    console.log('\n\n\x1b[33m%s\x1b[0m', 'Found missing references in HTML files', htmlFile);
  }
}

if (notFoundFiles.length > 0) {
  console.log('\n\n\x1b[33m%s\x1b[0m', 'Found missing references in HTML files', notFoundFiles);
}
