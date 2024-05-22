const fs = require('fs');
const args = process.argv.slice(2);
const readline = require('readline');

const inputHtmlFile = args[0] || '/var/www/html/sntpms/pms-ui-staff/rover/partials/companyCard/rvCompanyCardContactInformation.html';

// Load HTML file
const moduleName = 'FRONT_DESK';
const contextName = 'CO_TA_CARD';
const translationJsonFile = '/var/www/html/sntpms/pms-ui-staff/rover/rvLocales/en/en_frontdesk.json';

const outputHtmlFile = inputHtmlFile;

const enJsonFile = '/var/www/html/sntpms/pms-ui-staff/dist/rvLocales/EN.json';
const enTranslations = JSON.parse(fs.readFileSync(enJsonFile, 'utf-8'));

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

if(!translations[moduleName]) {
  translations[moduleName] = {};
}

if(!translations[moduleName][contextName]) {
  translations[moduleName][contextName] = {};
}

const blackListedWords = [
  '&nbsp;'
]

let newTranslationKeys = {};

// Translation key cleanup
const translationKeyCleanup = (key, isNew) => {
  // If found value in en.json
  if (isNew) {
    const findKey = (obj) => Object.keys(obj).find(k => obj[k] === key.trim());
    const inCurrentModuleKey = findKey(translations[moduleName][contextName]);
    if (inCurrentModuleKey) return inCurrentModuleKey;
    const legacyKey = findKey(enTranslations);
    if (legacyKey) return legacyKey;
  }
  
  // Allow only letters, numbers and underscores
  return key.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_#]/g, '').replace(/^_+|_+$/g, '').replace(/_+/g, '_').toUpperCase();
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
        const newkey = `${moduleName}.${contextName}.${oldKey}`.toUpperCase();
        if (!translations[moduleName][contextName][newkey]) {
          // If the key is not already present, try to find its value in en.json
          const enTranslations = JSON.parse(fs.readFileSync(enJsonFile, 'utf-8'));
          if (enTranslations.hasOwnProperty(oldKey)) {
            console.log('\x1b[31m%s\x1b[0m to \x1b[32m%s\x1b[0m', oldKey, newkey);
            translations[moduleName][contextName][oldKey] = enTranslations[oldKey];
          } else {
            console.log('New key: \x1b[31m%s\x1b[0m to \x1b[32m%s\x1b[0m', match.replace(/\s+/g, ' ').trim(), newkey);
            newTranslationKeys[oldKey] = match.replace(/\s+/g, ' ').trim();
            translations[moduleName][contextName][translationKeyCleanup(existingKey, true)] = match.replace(/\s+/g, ' ').trim();
          }
        }
        return `{{'${newkey}' | translate}}`;
    });

    // To update attribute translation
    htmlContent = htmlContent.replace(/(?<=<[^>"{}]*(?:"[^"]*"[^>"{}]*)*(translate)[^>"{}]*(?:"[^"]*"[^>"{}]*)*>)([\w\s#]+)(?=<\/([a-z]+)>)/gm, (match, existingKey) => {
        if(existingKey.trim() && !existingKey.trim().includes('{{')) {
          const oldKey = translationKeyCleanup(existingKey);
          const newkey = `${moduleName}.${contextName}.${oldKey}`.toUpperCase();
          if (!translations[moduleName][contextName][newkey]) {
            // If the key is not already present, try to find its value in en.json
            const enTranslations = JSON.parse(fs.readFileSync(enJsonFile, 'utf-8'));
            if (enTranslations.hasOwnProperty(oldKey)) {
              console.log('\x1b[31m%s\x1b[0m to \x1b[32m%s\x1b[0m', oldKey, newkey);
              translations[moduleName][contextName][oldKey] = enTranslations[oldKey];
            } else {
              console.log('New key: \x1b[31m%s\x1b[0m to \x1b[32m%s\x1b[0m', match.replace(/\s+/g, ' ').trim(), newkey);
              newTranslationKeys[oldKey] = match.replace(/\s+/g, ' ').trim();
              translations[moduleName][contextName][translationKeyCleanup(existingKey, true)] = match.replace(/\s+/g, ' ').trim();
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
    htmlContent = htmlContent.replace(/(?<=<[^>]*\s+placeholder\s*=\s*")([^"]+)(?="[^>]*>)/g, (match) => {
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
    htmlContent = htmlContent.replace(/(?<=<[^>]*label\s*=\s*")([^"]+)(?="[^>]*>)/g, (match) => {
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
    htmlContent = htmlContent.replace(/(?<=<([a-z]+)[^>"{}]*(?:"[^"]*"[^>"{}]*)*>)([A-Za-z\s\d(),.\/\\&;+!\-':#?]*[A-Za-z]{1,}[A-Za-z\s\d(),.\/\\&;+!\-':#?]*)(?=<\/([a-z]+)>)/g, (match) => {
      if(!blackListedWords.includes(match.trim())) {
        const placeholderKey = `${moduleName}.${contextName}.${translationKeyCleanup(match, true)}`;
        console.log('New key: \x1b[31m%s\x1b[0m to \x1b[32m%s\x1b[0m', match.replace(/\s+/g, ' ').trim(), placeholderKey);
        translations[moduleName][contextName][translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
        newTranslationKeys[translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
        return `{{'${placeholderKey}' | translate}}`;
      } else {
        return match;
      }
    });

    // Update between two starting tags
    htmlContent = htmlContent.replace(/(?<=<([a-z]+)[^>"{}]*(?:"[^"]*"[^>"{}]*)*>)([A-Za-z\s\d(),.\/\\&;+!\-':#?]*[A-Za-z]{1,}[A-Za-z\s\d(),.\/\\&;+!\-':#?]*)(?=<([a-z]+)[^>"{}]*(?:"[^"]*"[^>"{}]*)*>)/g, (match) => {
      if(!blackListedWords.includes(match.trim())) {
        const placeholderKey = `${moduleName}.${contextName}.${translationKeyCleanup(match, true)}`;
        console.log('New key: \x1b[31m%s\x1b[0m to \x1b[32m%s\x1b[0m', match.replace(/\s+/g, ' ').trim(), placeholderKey);
        translations[moduleName][contextName][translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
        newTranslationKeys[translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
        return `{{'${placeholderKey}' | translate}}`;
      } else {
        return match;
      }
    });

    // Update between ending and starting tags
    htmlContent = htmlContent.replace(/(?<=<\/([a-z]+)>)([A-Za-z\s\d(),.\/\\&;+!\-':#?]*[A-Za-z]{1,}[A-Za-z\s\d(),.\/\\&;+!\-':#?]*)(?=<([a-z]+)[^>"{}]*(?:"[^"]*"[^>"{}]*)*>)/g, (match) => {
      if(!blackListedWords.includes(match.trim())) {
        const placeholderKey = `${moduleName}.${contextName}.${translationKeyCleanup(match, true)}`;
        console.log('New key: \x1b[31m%s\x1b[0m to \x1b[32m%s\x1b[0m', match.replace(/\s+/g, ' ').trim(), placeholderKey);
        translations[moduleName][contextName][translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
        newTranslationKeys[translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
        return `{{'${placeholderKey}' | translate}}`;
      } else {
        return match;
      }
    });

    // Update between two ending tags
    htmlContent = htmlContent.replace(/(?<=<\/([a-z]+)[^>"{}]*(?:"[^"]*"[^>"{}]*)*>)([A-Za-z\s\d(),.\/\\&;+!\-':#?]*[A-Za-z]{1,}[A-Za-z\s\d(),.\/\\&;+!\-':#?]*)(?=<\/([a-z]+)>)/g, (match) => {
      if(!blackListedWords.includes(match.trim())) {
        const placeholderKey = `${moduleName}.${contextName}.${translationKeyCleanup(match, true)}`;
        console.log('New key: \x1b[31m%s\x1b[0m to \x1b[32m%s\x1b[0m', match.replace(/\s+/g, ' ').trim(), placeholderKey);
        translations[moduleName][contextName][translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
        newTranslationKeys[translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
        return `{{'${placeholderKey}' | translate}}`;
      } else {
        return match;
      }
    });


    // Update self ending tag and ending tags
    htmlContent = htmlContent.replace(/(?<=<\/([a-z]+)[^>"{}]*(?:"[^"]*"[^>"{}]*)*>)([A-Za-z\s\d(),.\/\\&;+!\-':#?]*[A-Za-z]{1,}[A-Za-z\s\d(),.\/\\&;+!\-':#?]*)(?=<\/([a-z]+)>)/g, (match) => {
      if(!blackListedWords.includes(match.trim())) {
        const placeholderKey = `${moduleName}.${contextName}.${translationKeyCleanup(match, true)}`;
        console.log('New key: \x1b[31m%s\x1b[0m to \x1b[32m%s\x1b[0m', match.replace(/\s+/g, ' ').trim(), placeholderKey);
        translations[moduleName][contextName][translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
        newTranslationKeys[translationKeyCleanup(match, true)] = match.replace(/\s+/g, ' ').trim();
        return `{{'${placeholderKey}' | translate}}`;
      } else {
        return match;
      }
    });

    // Reinsert comments
    htmlContent = htmlContent.replace(/<!--comment(\d+)-->/g, (match, commentIndex) => {
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
      delete translations[moduleName][contextName][longKey];
    }
  }
  // Save updated HTML content
  fs.writeFileSync(outputHtmlFile, htmlContent, 'utf-8');

  // Save updated translations JSON file
  fs.writeFileSync(translationJsonFile, JSON.stringify(translations, null, 2), 'utf-8');

  console.log('\n\n\x1b[32m%s\x1b[0m', 'Done!');
  process.exit(0);
})();