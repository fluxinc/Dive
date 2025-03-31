import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the config file
const configPath = path.join(__dirname, '../src/styles/theme.config.json');
const styleOutputPath = path.join(__dirname, '../src/styles/_generated-theme.scss');
const promptOutputPath = path.join(__dirname, '../resources/generated-prompt-wrapper.txt');
try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const styleConfig = config.style;
  const prompt = config.prompt;

  // Save the prompt wrapper
  fs.writeFileSync(promptOutputPath, prompt);

  // Generate SCSS content
  let scssContent = '// This file is auto-generated. Do not edit directly.\n\n';
  
  // Generate SASS variables
  Object.entries(styleConfig).forEach(([key, value]) => {
    scssContent += `$${key}: ${value};\n`;
  });
  
  // Generate CSS Custom Properties
  scssContent += '\n// CSS Custom Properties\n';
  scssContent += ':root {\n';
  Object.entries(styleConfig).forEach(([key, value]) => {
    scssContent += `  --${key}: #{$${key}};\n`;
  });
  scssContent += '}\n';
  
  // Write the generated SCSS file
  fs.writeFileSync(styleOutputPath, scssContent);
  console.log('Theme variables generated successfully!');
} catch (error) {
  console.error('Error generating theme variables:', error);
  process.exit(1);
} 