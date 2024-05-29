#!/usr/bin/env node
/** 
 * Node version: >=9.11.1
 * Command: node index.js /var/www/html/sntpms/pms-ui-staff/rover/partials/companyCard/rvCompanyCardContactInformation.html
 * 
 * Example usage: 
 * node index.js <Absolute_path_to_HTML_file> <Module_Name> <Context_Name> <Absolute_path_to_new_translation_JSON_file>
*/
const projectRoot = '/var/www/html/sntpms/pms-ui-staff';

/**
 * Inputs
 */
const defaultFilePathToUpdate = '/rover/partials/companyCard/rvCompanyCardContactInformation.html';
const defaultModuleName = 'ACTIONS';
const defaultContextName = 'ACTIONS_MANAGER';

/**
 * Outputs
 */
const defaultTranslationJsonFile = '/rover/rvLocales/locales_v2/en/en_actions.json';

/**
 * Non translatable words
 */
const blackListedWords = [
  '&nbsp;'
];

/**
 * Predefined translation keys
 */
const predefinedTranslationKeys = {
  DAY_SYMBOL: 'D',
  NIGHT_SYMBOL: 'N',
  BASE_RATE_SYMBOL: 'B',
  ACCOUNT_SYMBOL: 'A',
  NOT_AVAILABLE: 'N/A',
  EOD: 'End of Day',
};

/**
 * Code
 */
const fs = require('fs');
const args = process.argv.slice(2);

const inputHtmlFile = args[0] || `${projectRoot}${defaultFilePathToUpdate}`;
const moduleName = args[1] || defaultModuleName;
const contextName = args[2] || defaultContextName;
const translationJsonFile = args[3] || `${projectRoot}${defaultTranslationJsonFile}`;


const outputHtmlFile = inputHtmlFile;

const enJsonFile = `${projectRoot}/dist/rvLocales/EN.json`;
const enTranslations = JSON.parse(fs.readFileSync(enJsonFile, 'utf-8'));

const readline = require('readline');

// Function to prompt user input
const promptUser = (currentKey) => {
  return new Promise((resolve) => {
    let userInput = currentKey;
    let cursorPosition = currentKey.length;

    process.stdout.write(`\x1b[32m${currentKey}\x1b[0m:\n`);
    process.stdout.write(userInput);

    // Create readline interface
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    });

    rl.input.on('keypress', (character, key) => {
      if (key && key.name === 'backspace') {
        // Handle backspace
        if (cursorPosition > 0) {
          userInput = userInput.slice(0, cursorPosition - 1) + userInput.slice(cursorPosition);
          cursorPosition--;
          // Clear current line and re-render prompt
          readline.clearLine(process.stdout, 0);
          readline.cursorTo(process.stdout, 0);
          process.stdout.write(userInput);
          readline.cursorTo(process.stdout, cursorPosition);
        }
      } else if (key && key.name === 'return') {
        // Handle enter
        rl.close();
      } else if (key && key.ctrl && key.name === 'c') {
        // Handle Ctrl+C
        process.exit();
      } else if (key && key.name === 'left') {
        // Handle left arrow
        if (cursorPosition > 0) {
          cursorPosition--;
          readline.cursorTo(process.stdout, cursorPosition);
        }
      } else if (key && key.name === 'right') {
        // Handle right arrow
        if (cursorPosition < userInput.length) {
          cursorPosition++;
          readline.cursorTo(process.stdout, cursorPosition);
        }
      } else if(character) {
        // Append typed characters
        userInput = userInput.slice(0, cursorPosition) + character + userInput.slice(cursorPosition);
        cursorPosition++;
        // Clear current line and re-render prompt
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(userInput);
        readline.cursorTo(process.stdout, cursorPosition);
      }
    });

    rl.on('close', () => {
      resolve(userInput || currentKey);
    });
  });
};

// Read the HTML content
let htmlContent = fs.readFileSync(inputHtmlFile, 'utf-8');

// Load translation JSON file
let translations;
if (fs.existsSync(translationJsonFile)) {
  try {
    translations = JSON.parse(fs.readFileSync(translationJsonFile, 'utf-8'));
  } catch (error) {
    translations = {};
  }
}

if (!translations[moduleName]) {
  translations[moduleName] = {};
}

if (!translations[moduleName][contextName]) {
  translations[moduleName][contextName] = {};
}

let newTranslationKeys = {};

const findKeyByValue = (obj, key) => {
  for (const k in obj) {
    if (typeof obj[k] === 'object') {
      const result = findKeyByValue(obj[k], key);
      if (result) return result;
    } else if (obj[k] === key) {
      return k;
    }
  }
  return null;
}

// Translation key cleanup
const translationKeyCleanup = (key, isNew) => {
  // If found value in en.json
  if (isNew) {
    const findKey = (obj) => Object.keys(obj).find(k => obj[k] === key.trim());
    const inCurrentModuleKey = findKey(translations[moduleName][contextName]);
    if (inCurrentModuleKey) return inCurrentModuleKey;

    // find in predefined keys
    const predefinedKey = findKey(predefinedTranslationKeys, key.trim());
    if (predefinedKey) return predefinedKey;

    // Generate a new key by allow only letters, numbers, hash and underscore
    return key.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_#]/g, '').replace(/^_+|_+$/g, '').replace(/_+/g, '_').toUpperCase();
  }
  return key.trim();
}

// Function to update the translation keys and texts
const updateTranslations = () => {
    // Extract comments
    const comments = [];
    htmlContent = htmlContent.replace(/<!--[\s\S]*?-->/g, (comment) => {
        comments.push(comment);
        return `<!--comment${comments.length - 1}-->`;
    });

    console.log('Updating translation keys and texts \n\n');
    // To update interpolation translation
    htmlContent = htmlContent.replace(/\{\{\s*'([^']*)'\s*\|\s*translate\s*\}\}/g, (match, existingKey) => {
        const oldKey = translationKeyCleanup(existingKey);
        let newkey = `${moduleName}.${contextName}.${oldKey}`.toUpperCase();
        if (!translations[moduleName][contextName][newkey]) {
          // If the key is not already present, try to find its value in en.json
          if (enTranslations.hasOwnProperty(oldKey)) {
            console.log('\x1b[31m%s\x1b[0m to \x1b[32m%s\x1b[0m', oldKey, newkey);
            translations[moduleName][contextName][oldKey] = enTranslations[oldKey];
          } else {
            newkey = `${moduleName}.${contextName}.${translationKeyCleanup(existingKey, true)}`;
            console.log('New key: \x1b[31m%s\x1b[0m to \x1b[32m%s\x1b[0m', existingKey, newkey);
            newTranslationKeys[oldKey] = existingKey;
            translations[moduleName][contextName][translationKeyCleanup(existingKey, true)] = existingKey;
          }
        }
        return `{{'${newkey}' | translate}}`;
    });

    // To update attribute translation
    htmlContent = htmlContent.replace(/(?<=<[^>"{}]*(?:"[^"]*"[^>"{}]*)*(translate)[^>"{}]*(?:"[^"]*"[^>"{}]*)*>)([\w\s#.]+)(?=<\/([a-z\d]+)>)/gi, (match, _, existingKey) => {
        if(existingKey.trim() && !existingKey.trim().includes('{{')) {
          const oldKey = translationKeyCleanup(existingKey);
          let newkey = `${moduleName}.${contextName}.${oldKey}`.toUpperCase();
          if (!translations[moduleName][contextName][newkey]) {
            // If the key is not already present, try to find its value in en.json
            if (enTranslations.hasOwnProperty(oldKey)) {
              console.log('\x1b[31m%s\x1b[0m to \x1b[32m%s\x1b[0m', oldKey, newkey);
              translations[moduleName][contextName][oldKey] = enTranslations[oldKey];
            } else {
              newkey = `${moduleName}.${contextName}.${translationKeyCleanup(existingKey, true)}`;
              console.log('New key: \x1b[31m%s\x1b[0m to \x1b[32m%s\x1b[0m', existingKey, newkey);
              newTranslationKeys[oldKey] = existingKey;
              translations[moduleName][contextName][translationKeyCleanup(existingKey, true)] = existingKey;
            }
          }
          return `${newkey}`;
        } else {
          return match;
        }
    });

    // Add new keys
    console.log('\n\n\n');
    
    // Update placeholder values
    htmlContent = htmlContent.replace(/(?<=<[^>]*\s+placeholder\s*=\s*")([^"]+)(?="[^>]*>)/gi, (match) => {
        if(!match.trim().includes('{{')) {
          const placeholderKey = `${moduleName}.${contextName}.${translationKeyCleanup(match, true)}`;
          console.log('New key: \x1b[31m%s\x1b[0m to \x1b[32m%s\x1b[0m', match.replace(/\s+/g, ' ').trim(), placeholderKey);
          translations[moduleName][contextName][translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
          newTranslationKeys[translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
          return `{{'${placeholderKey}' | translate}}`;
        } else {
          return match;
        }
    });

    // Update label values
    htmlContent = htmlContent.replace(/(?<=<[^>]*label\s*=\s*")([^"]+)(?="[^>]*>)/gi, (match) => {
        if(!match.trim().includes('{{')) {
          const placeholderKey = `${moduleName}.${contextName}.${translationKeyCleanup(match, true)}`;
          console.log('New key: \x1b[31m%s\x1b[0m to \x1b[32m%s\x1b[0m', match.replace(/\s+/g, ' ').trim(), placeholderKey);
          translations[moduleName][contextName][translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
          newTranslationKeys[translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
          return `{{'${placeholderKey}' | translate}}`;
        } else {
          return match;
        }
    });

    // Update between starting and ending tags
    htmlContent = htmlContent.replace(/(?<=<([A-Za-z\d]+)(?![^>]*\btranslate\b)[^>"{}]*(?:"[^"]*"[^>"{}]*)*>)(\s*)([A-Za-z\s\d(),\/\\&;+!\-':#?.]*[A-Za-z]{1,}[A-Za-z\s\d(),\/\\&;+!\-':#?.]*?)(\s*)(?=<\/([A-Za-z\d]+)>)/gi, (match, ...args) => {
      if(!blackListedWords.includes(match.trim())) {
        const placeholderKey = `${moduleName}.${contextName}.${translationKeyCleanup(match, true)}`;
        console.log('New key: \x1b[31m%s\x1b[0m to \x1b[32m%s\x1b[0m', match.replace(/\s+/g, ' ').trim(), placeholderKey);
        translations[moduleName][contextName][translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
        newTranslationKeys[translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
        return `${args[1]}{{'${placeholderKey}' | translate}}${args[3]}`;
      } else {
        return match;
      }
    });

    // Update between two starting tags
    htmlContent = htmlContent.replace(/(?<=<([A-Za-z\d]+)[^>"{}]*(?:"[^"]*"[^>"{}]*)*>)(\s*)([A-Za-z\s\d(),\/\\&;+!\-':#?.]*[A-Za-z]{1,}[A-Za-z\s\d(),\/\\&;+!\-':#?.]*?)(\s*)(?=<([A-Za-z\d]+)[^>"{}]*(?:"[^"]*"[^>"{}]*)*>)/gi, (match, ...args) => {
      if(!blackListedWords.includes(match.trim())) {
        const placeholderKey = `${moduleName}.${contextName}.${translationKeyCleanup(match, true)}`;
        console.log('New key: \x1b[31m%s\x1b[0m to \x1b[32m%s\x1b[0m', match.replace(/\s+/g, ' ').trim(), placeholderKey);
        translations[moduleName][contextName][translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
        newTranslationKeys[translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
        return `${args[1]}{{'${placeholderKey}' | translate}}${args[3]}`;
      } else {
        return match;
      }
    });

    // Update between ending and starting tags
    htmlContent = htmlContent.replace(/(?<=<\/([A-Za-z\d]+)>)(\s*)([A-Za-z\s\d(),\/\\&;+!\-':#?.]*[A-Za-z]{1,}[A-Za-z\s\d(),\/\\&;+!\-':#?.]*?)(\s*)(?=<([A-Za-z\d]+)[^>"{}]*(?:"[^"]*"[^>"{}]*)*>)/gi, (match, ...args) => {
      if(!blackListedWords.includes(match.trim())) {
        const placeholderKey = `${moduleName}.${contextName}.${translationKeyCleanup(match, true)}`;
        console.log('New key: \x1b[31m%s\x1b[0m to \x1b[32m%s\x1b[0m', match.replace(/\s+/g, ' ').trim(), placeholderKey);
        translations[moduleName][contextName][translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
        newTranslationKeys[translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
        return `${args[1]}{{'${placeholderKey}' | translate}}${args[3]}`;
      } else {
        return match;
      }
    });

    // Update between two ending tags
    htmlContent = htmlContent.replace(/(?<=<\/([A-Za-z\d]+)[^>"{}]*(?:"[^"]*"[^>"{}]*)*>)(\s*)([A-Za-z\s\d(),\/\\&;+!\-':#?.]*[A-Za-z]{1,}[A-Za-z\s\d(),\/\\&;+!\-':#?.]*?)(\s*)(?=<\/([A-Za-z\d]+)>)/gi, (match, ...args) => {
      if(!blackListedWords.includes(match.trim())) {
        const placeholderKey = `${moduleName}.${contextName}.${translationKeyCleanup(match, true)}`;
        console.log('New key: \x1b[31m%s\x1b[0m to \x1b[32m%s\x1b[0m', match.replace(/\s+/g, ' ').trim(), placeholderKey);
        translations[moduleName][contextName][translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
        newTranslationKeys[translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
        return `${args[1]}{{'${placeholderKey}' | translate}}${args[3]}`;
      } else {
        return match;
      }
    });


    // Update self ending tag and ending tags
    htmlContent = htmlContent.replace(/(?<=<\/([A-Za-z\d]+)[^>"{}]*(?:"[^"]*"[^>"{}]*)*>)(\s*)([A-Za-z\s\d(),\/\\&;+!\-':#?.]*[A-Za-z]{1,}[A-Za-z\s\d(),\/\\&;+!\-':#?.]*?)(\s*)(?=<\/([A-Za-z\d]+)>)/gi, (match, ...args) => {
      if(!blackListedWords.includes(match.trim())) {
        const placeholderKey = `${moduleName}.${contextName}.${translationKeyCleanup(match, true)}`;
        console.log('New key: \x1b[31m%s\x1b[0m to \x1b[32m%s\x1b[0m', match.replace(/\s+/g, ' ').trim(), placeholderKey);
        translations[moduleName][contextName][translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
        newTranslationKeys[translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
        return `${args[1]}{{'${placeholderKey}' | translate}}${args[3]}`;
      } else {
        return match;
      }
    });

    // Reinsert comments
    htmlContent = htmlContent.replace(/<!--comment(\d+)-->/g, (_, commentIndex) => {
      return comments[commentIndex];
    });
};

// self async call function
(async function () {
  // Perform the update
  updateTranslations();

  // filter long keys
  const longKeys = Object.keys(newTranslationKeys).filter((key) => key.length > 25 && key.split('_').length > 5);
  if(longKeys.length > 0) {
    console.log('\n\n\x1b[33m%s\x1b[0m', `\n\nFound ${longKeys.length} long keys:(recommended max 5 words)`);
    for (const key of longKeys) {
      console.log('\x1b[31m%s\x1b[0m', key);
    }
    // Save updated HTML content
    fs.writeFileSync(outputHtmlFile, htmlContent, 'utf-8');

    // Save updated translations JSON file
    fs.writeFileSync(translationJsonFile, JSON.stringify(translations, null, 2), 'utf-8');

    console.log('\n\x1b[33m%s\x1b[0m', 'Press control + C to finish, or enter to continue with the update');
    await new Promise((resolve) => {
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', () => {
        resolve();
      });
    });
    for (const longKey of longKeys) {
      const userInput = await promptUser(longKey);
      const cleanedInput = translationKeyCleanup(userInput);
      const newPlaceholderKey = `${moduleName}.${contextName}.${cleanedInput}`;

      htmlContent = htmlContent.replace(`${moduleName}.${contextName}.${longKey}`, newPlaceholderKey);
      translations[moduleName][contextName][cleanedInput] = translations[moduleName][contextName][longKey];
      if(cleanedInput !== longKey)delete translations[moduleName][contextName][longKey];
    }
  }
  // Save updated HTML content
  fs.writeFileSync(outputHtmlFile, htmlContent, 'utf-8');

  // Save updated translations JSON file
  fs.writeFileSync(translationJsonFile, JSON.stringify(translations, null, 2), 'utf-8');

  console.log('\n\n\x1b[32m%s\x1b[0m', 'Done!');
  process.exit(0);
})();