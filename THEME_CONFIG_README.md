# Theme Configuration Guide

The `theme.config.json` file controls both the visual styling and AI behavior in the Dive RAG application. This README explains how to configure and customize these settings.

## File Location

Place your `theme.config.json` file in the `config/` directory.

## Configuration Structure

The configuration file has four main sections:

```json
{
  "windowTitle": "Custom Window Title",  // Window title for the application
  "style": {
    // Visual theme colors for light and dark modes
  },
  "text": {
    // Application text content
  },
  "prompt": "System prompt for the AI assistant"
}
```

### Window Title

The `windowTitle` string defines the title that appears in the application window and browser tab. If not specified, it defaults to "AI Assistant".

### Style Configuration

The `style` object contains color definitions for both light and dark modes. These colors are applied as CSS variables and SASS variables.

```json
"style": {
  "dark": {
    "bg": "#894167",                    // Main background color in dark mode
    "bg-weak": "#3f3f3f",               // Secondary background color in dark mode
    "text-weak": "rgba(255, 255, 255, 0.7)",    // Secondary text color in dark mode
    "text-inverted-weak": "rgba(255, 255, 255, 0.5)",  // Inverted text color in dark mode
    "text-link": "#e0d0e3",             // Link color in dark mode
    "text-link-hover": "#ffffff"        // Link hover color in dark mode
  },
  "light": {
    "bg": "#f8f0f5",                    // Main background color in light mode
    "bg-weak": "#f2e6ee",               // Secondary background color in light mode
    "text-weak": "rgba(0, 0, 0, 0.7)",  // Secondary text color in light mode
    "text-inverted-weak": "rgba(0, 0, 0, 0.5)",  // Inverted text color in light mode
    "text-link": "#894167",             // Link color in light mode
    "text-link-hover": "#632d4a"        // Link hover color in light mode
  }
}
```

All colors can use any valid CSS color format: hex, rgb, rgba, hsl, etc.

### Text Configuration

The `text` object contains all configurable text content in the application. This includes the application title and welcome messages.

```json
"text": {
  "title": "My Custom RAG App",         // Application title in the header
  "welcomeMessage": "Welcome",          // Main welcome message
  "subtitle": "Start the conversation"  // Welcome page subtitle
}
```

If not specified, these values default to:
- title: "AI Assistant"
- welcomeMessage: "Welcome to the AI Assistant"
- subtitle: "Start the conversation"

### Prompt Configuration

The `prompt` string defines the system prompt for the AI assistant, controlling how it responds to user queries.

```json
"prompt": "You are a helpful assistant that answers questions about documents in the database. You fetch information from this database by calling the query tool with the user's query. If the information isn't in the database, let the user know you don't have that information. Always cite your sources by referencing the document IDs where you found the information."
```

## Example

**Medical Information Assistant**
   ```json
   {
     "windowTitle": "Medical Information Assistant",
     "style": {
       "dark": {
         "bg": "#1a365d",
         "bg-weak": "#2d3748",
         "text-weak": "rgba(255, 255, 255, 0.7)",
         "text-inverted-weak": "rgba(255, 255, 255, 0.5)",
         "text-link": "#63b3ed",
         "text-link-hover": "#90cdf4"
       },
       "light": {
         "bg": "#ebf8ff",
         "bg-weak": "#bee3f8",
         "text-weak": "rgba(0, 0, 0, 0.7)",
         "text-inverted-weak": "rgba(0, 0, 0, 0.5)",
         "text-link": "#3182ce",
         "text-link-hover": "#2c5282"
       }
     },
     "text": {
       "title": "Medical Assistant",
       "welcomeMessage": "Welcome to Your Medical Information Assistant",
       "subtitle": "Ask me about medical topics"
     },
     "prompt": "You are a medical assistant that provides information about health topics. You fetch information from a verified medical database and always cite your sources."
   }
   ```

## Applying Changes

After modifying the theme configuration, the application needs to regenerate theme files. This happens automatically during the build process, or you can run:

```
npm run generate-theme
```

This will generate the necessary SCSS variables and update the AI prompt. 