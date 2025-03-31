import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the config file
const configPath = path.join(__dirname, '../config/theme.config.json');
const styleOutputPath = path.join(__dirname, '../src/styles/_generated-theme.scss');
const promptOutputPath = path.join(__dirname, '../resources/generated-prompt-wrapper.txt');

try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const styleConfig = config.style;
  const prompt = config.prompt;
  const title = config.title || 'Dive AI'; // Default title if not specified
  const welcomeMessage   = config.welcomeMessage || 'Welcome to Dive AI'; // Default welcome message
  const welcomeSubtitle = config.welcomeSubtitle || 'Start your AI conversation'; // Default welcome subtitle

  // Save the prompt wrapper
  fs.writeFileSync(promptOutputPath, prompt);

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
  Object.entries(styleConfig).forEach(([key, value]) => {
    scssContent += `  --${key}: ${value} !important;\n`;
  });
  // Add title and welcome message variables
  scssContent += `  --app-title: "${title}" !important;\n`;
  scssContent += `  --welcome-message: "${welcomeMessage}" !important;\n`;
  scssContent += `  --welcome-subtitle: "${welcomeSubtitle}" !important;\n`;
  scssContent += '}\n\n';
  
  // Apply to dark theme as well to ensure it overrides everywhere
  scssContent += '[data-theme="dark"],\n:root:has([data-theme="dark"]) {\n';
  Object.entries(styleConfig).forEach(([key, value]) => {
    scssContent += `  --${key}: ${value} !important;\n`;
  });
  // Add title and welcome message variables
  scssContent += `  --app-title: "${title}" !important;\n`;
  scssContent += `  --welcome-message: "${welcomeMessage}" !important;\n`;
  scssContent += `  --welcome-subtitle: "${welcomeSubtitle}" !important;\n`;
  scssContent += '}\n';
  
  // Write the generated SCSS file
  fs.writeFileSync(styleOutputPath, scssContent);
  console.log('Theme variables generated successfully!');
} catch (error) {
  console.error('Error generating theme variables:', error);
  process.exit(1);
} 