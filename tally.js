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
      return key.includes('.') ? false : true;
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
    }
  });
};

findHtmlFiles(startDir);

console.log('Translation key check completed.');
