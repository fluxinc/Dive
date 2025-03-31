# Theme Configuration Guide

The `theme.config.json` file controls both the visual styling and AI behavior in the Dive RAG application. This README explains how to configure and customize these settings.

## File Location

Place your `theme.config.json` file in the `config/` directory.

## Configuration Structure

The configuration file has three main sections:

```json
{
  "style": {
    // Visual theme colors
  },
  "text": {
    // Application text content
  },
  "prompt": "System prompt for the AI assistant"
}
```

### Style Configuration

The `style` object contains color definitions used throughout the application. These colors are applied as CSS variables and SASS variables.

```json
"style": {
  "bg": "#ffffff",        // Main background color
  "text": "#213547",      // Primary text color
  "border": "#d9d9d9",    // Border color
  "shadow": "rgba(0, 0, 0, 0.1)" // Shadow color
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
- title: "Dive AI"
- welcomeMessage: "Welcome to Dive AI"
- subtitle: "Start your AI conversation"

### Prompt Configuration

The `prompt` string defines the system prompt for the AI assistant, controlling how it responds to user queries.

```json
"prompt": "You are a helpful assistant that answers questions about documents in the database. You fetch information from this database by calling the query tool with the user's query. If the information isn't in the database, let the user know you don't have that information. Always cite your sources by referencing the document IDs where you found the information."
```

## Example Use Cases

1. **Medical Information Assistant**
   ```json
   {
     "style": {
       "bg": "#f0f7ff",
       "text": "#333333", 
       "border": "#c0d8f0",
       "shadow": "rgba(0, 0, 0, 0.1)"
     },
     "text": {
       "title": "Medical Assistant",
       "welcomeMessage": "Welcome to Your Medical Information Assistant",
       "subtitle": "Ask me about medical topics"
     },
     "prompt": "You are a medical assistant that provides information about health topics. You fetch information from a verified medical database and always cite your sources."
   }
   ```

2. **Code Documentation Helper**
   ```json
   {
     "style": {
       "bg": "#282c34",
       "text": "#abb2bf",
       "border": "#3e4451",
       "shadow": "rgba(255, 255, 255, 0.1)"
     },
     "text": {
       "title": "Code Helper",
       "welcomeMessage": "Your Code Documentation Assistant",
       "subtitle": "Ask questions about code and documentation"
     },
     "prompt": "You are a programming assistant that helps with code documentation. You retrieve coding examples and best practices from the repository database."
   }
   ```

## Applying Changes

After modifying the theme configuration, the application needs to regenerate theme files. This happens automatically during the build process, or you can run:

```
npm run generate-theme
```

This will generate the necessary SCSS variables and update the AI prompt. 