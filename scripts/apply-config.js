// Writes from the theme.config.json file to the various other locations, to customize the application.
import fse from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

// Get current directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to import configDir from constant, fallback to local definition if it fails
let configDir;
try {
  // Try to import compiled JS version first
  const constants = await import('../dist-electron/main/constant.js');
  configDir = constants.configDir;
} catch (firstError) {
  try {
    // Try local fallback constant.js
    const fallbackConstants = await import('./constant.js');
    configDir = fallbackConstants.configDir;
  } catch (secondError) {
    console.log('Could not import from compiled or fallback constant.js:', firstError);
    console.warn('Using hardcoded fallback config path');
    const homeDir = os.homedir();
    const appDir = path.join(homeDir, '.dive');
    configDir = path.join(appDir, 'config');
  }
}

// Ensure the config directory exists
fse.ensureDirSync(configDir);

// Read the config file
const configPath = path.join(__dirname, '../config/theme.config.json');
const styleOutputPath = path.join(__dirname, '../src/styles/_generated-theme.scss');
const indexHtmlPath = path.join(__dirname, '../index.html');
const translationPath = path.join(__dirname, '../public/locales/en/translation.json');

// Ensure output directories exist
fse.ensureDirSync(path.dirname(styleOutputPath));
fse.ensureDirSync(path.dirname(translationPath));

const customRulesPath = path.join(configDir, 'customrules');

// Create a default theme config if it doesn't exist
if (!fse.existsSync(configPath)) {
  const defaultConfig = {
    style: {
      light: {
        "primary-color": "#4a6cf7",
        "background-color": "#ffffff",
        "text-color": "#232323"
      },
      dark: {
        "primary-color": "#4a6cf7",
        "background-color": "#1d232a",
        "text-color": "#ffffff"
      }
    },
    prompt: "You are a helpful assistant.",
    text: {
      title: "AI Assistant",
      welcomeMessage: "Welcome",
      subtitle: "Start your AI conversation"
    }
  };
  
  // Ensure the config directory exists
  fse.ensureDirSync(path.dirname(configPath));
  // Write the default config
  fse.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
  console.log(`Created default config at ${configPath}`);
}

try {
  const config = JSON.parse(fse.readFileSync(configPath, 'utf8'));
  const styleConfig = config.style;
  const prompt = config.prompt;
  const textConfig = config.text || {};
  
  // Set default text values if not provided
  const title = textConfig.title || 'AI Assistant';
  const welcomeMessage = textConfig.welcomeMessage || 'Welcome';
  const welcomeSubtitle = textConfig.subtitle || 'Start your AI conversation';

  // Ensure index.html exists before trying to update it
  if (fse.existsSync(indexHtmlPath)) {
    // Update index.html title
    let indexHtml = fse.readFileSync(indexHtmlPath, 'utf8');
    indexHtml = indexHtml.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
    fse.writeFileSync(indexHtmlPath, indexHtml);
  } else {
    console.warn(`Index file not found at ${indexHtmlPath}, skipping title update`);
  }

  // Ensure translation.json exists before trying to update it
  if (fse.existsSync(translationPath)) {
    // Update translation.json title
    let translation = JSON.parse(fse.readFileSync(translationPath, 'utf8'));
    translation.header.title = title;
    fse.writeFileSync(translationPath, JSON.stringify(translation, null, 2));
  } else {
    console.warn(`Translation file not found at ${translationPath}, skipping translation update`);
    // Create a basic translation file
    const defaultTranslation = {
      "header": {
        "title": title
      }
    };
    fse.ensureDirSync(path.dirname(translationPath));
    fse.writeFileSync(translationPath, JSON.stringify(defaultTranslation, null, 2));
    console.log(`Created default translation file at ${translationPath}`);
  }

  // Save the user prompt
  fse.writeFileSync(customRulesPath, prompt);

  // Generate SCSS content
  let scssContent = '// This file is auto-generated. Do not edit directly.\n\n' +
                    '@forward "variables";  // Forward all variables to importing files\n' +
                    '@use "variables" as *;  // Use variables in this file\n\n';
  
  // Ensure styleConfig has the expected structure
  if (!styleConfig) {
    console.warn('Style config missing, using default values');
    styleConfig = {
      light: {
        "primary-color": "#4a6cf7",
        "background-color": "#ffffff",
        "text-color": "#232323"
      },
      dark: {
        "primary-color": "#4a6cf7",
        "background-color": "#1d232a",
        "text-color": "#ffffff"
      }
    };
  }
  
  // Ensure light and dark themes exist
  if (!styleConfig.light) styleConfig.light = {};
  if (!styleConfig.dark) styleConfig.dark = {};
  
  // Generate SASS variables
  Object.entries(styleConfig).forEach(([key, value]) => {
    if (typeof value === 'object') {
      // Skip nested objects like light/dark themes as they'll be handled separately
      return;
    }
    scssContent += `$${key}: ${value};\n`;
  });
  
  // Generate CSS Custom Properties with higher specificity that overrides both light and dark themes
  scssContent += '\n// CSS Custom Properties\n';
  
  // Apply to :root (default theme)
  scssContent += ':root {\n';
  Object.entries(styleConfig.light).forEach(([key, value]) => {
    scssContent += `  --${key}: ${value};\n`;
  });
  // Add text variables
  scssContent += `  --app-title: "${title}";\n`;
  scssContent += `  --welcome-message: "${welcomeMessage}";\n`;
  scssContent += `  --welcome-subtitle: "${welcomeSubtitle}";\n`;
  scssContent += '}\n\n';
  
  // Apply dark theme
  scssContent += '[data-theme="dark"],\n:root:has([data-theme="dark"]) {\n';
  Object.entries(styleConfig.dark).forEach(([key, value]) => {
    scssContent += `  --${key}: ${value};\n`;
  });
  // Add text variables
  scssContent += `  --app-title: "${title}";\n`;
  scssContent += `  --welcome-message: "${welcomeMessage}";\n`;
  scssContent += `  --welcome-subtitle: "${welcomeSubtitle}";\n`;
  scssContent += '}\n';
  
  // Write the generated SCSS file
  fse.writeFileSync(styleOutputPath, scssContent);
  console.log('Theme variables generated successfully!');
} catch (error) {
  console.error('Error generating theme variables:', error);
  process.exit(1);
} 