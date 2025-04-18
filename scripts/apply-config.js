// Writes from the theme.config.json file to the various other locations, to customize the application.
import fse from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import envPaths from 'env-paths';

// Get current directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the config file
const configPath = path.join(__dirname, '../config/theme.config.json');
const styleOutputPath = path.join(__dirname, '../src/styles/_generated-theme.scss');
const indexHtmlPath = path.join(__dirname, '../index.html');
const translationPath = path.join(__dirname, '../public/locales/en/translation.json');

const packageJson = JSON.parse(fse.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const appName = packageJson.name;
export const envPath = envPaths(appName, {suffix: ""})
const configDir = envPath.config
const customRulesPath = path.join(configDir, '.customrules');
try {
  const config = JSON.parse(fse.readFileSync(configPath, 'utf8'));
  const styleConfig = config.style;
  const prompt = config.prompt;
  const textConfig = config.text || {};
  
  // Set default text values if not provided
  const title = textConfig.title || 'AI Assistant';
  const welcomeMessage = textConfig.welcomeMessage || 'Welcome';
  const welcomeSubtitle = textConfig.subtitle || 'Start your AI conversation';

  // Update index.html title
  let indexHtml = fse.readFileSync(indexHtmlPath, 'utf8');
  indexHtml = indexHtml.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
  fse.writeFileSync(indexHtmlPath, indexHtml);

  // Update translation.json title
  let translation = JSON.parse(fse.readFileSync(translationPath, 'utf8'));
  translation.header.title = title;
  fse.writeFileSync(translationPath, JSON.stringify(translation, null, 2));

  // Save the user prompt
  fse.writeFileSync(customRulesPath, prompt);

  // Generate SCSS content
  let scssContent = '// This file is auto-generated. Do not edit directly.\n\n' +
                    '@forward "variables";  // Forward all variables to importing files\n' +
                    '@use "variables" as *;  // Use variables in this file\n\n';
  
  // Generate SASS variables
  Object.entries(styleConfig).forEach(([key, value]) => {
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