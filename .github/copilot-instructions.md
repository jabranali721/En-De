# Copilot Instructions for En-De (Modular Deutsch)

## Repository Overview

This is a modular German language learning web application that helps users learn German vocabulary through different interactive modes. The app is designed for Italian speakers learning German (Deutsch) at A1-A2 level.

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Storage**: Browser localStorage for persistence
- **Audio**: Web Speech API (SpeechSynthesisUtterance)
- **Build**: None - runs directly in the browser, no build step required
- **Testing**: No automated testing framework currently in place

## Architecture

### Single-Page Application Structure
The app consists of three main files:
- `index.html` - Main HTML structure with panels for setup, dashboard, and game
- `app.js` - All application logic
- `style.css` - Monkeytype-inspired styling with CSS Grid

### Key Concepts

1. **Modules**: Each CSV file becomes a learning module (e.g., "A1_Saluti_e_Presentazioni", "STORY_Presentazione_Interattiva")
2. **Library**: Object containing all loaded modules: `{ "moduleName": [...cards] }`
3. **Cards**: Individual vocabulary/phrase items with Italian and German translations
4. **User Stats**: Progress tracking stored in localStorage under 'deutschStats'
5. **Learning Modes**:
   - **Standard Mode**: Type the German translation for Italian words
   - **Dictation Mode**: Listen to German audio and type what you hear
   - **Study Mode**: View-only mode to review vocabulary
   - **Quiz Mode**: Multiple-choice questions (files starting with "QUIZ_")
   - **Story Mode**: Interactive stories with dynamic variable capture (files starting with "STORY_")

## File Structure

```
/
├── index.html          # Main HTML with three panels (setup, dashboard, game)
├── app.js              # Core application logic
├── style.css           # Monkeytype-inspired dark theme
├── vocaboli.csv        # Sample vocabulary file
├── A1 De/              # Default vocabulary modules directory
│   ├── A1_*.csv        # A1 level vocabulary modules
│   ├── QUIZ_*.csv      # Quiz mode modules
│   └── STORY_*.csv     # Interactive story modules
└── .github/
    └── copilot-instructions.md  # This file
```

## CSV File Format

All vocabulary files use semicolon-separated format:
```csv
Italian Phrase;German Translation
Ciao;Hallo
Grazie;Danke
```

**Special Prefixes**:
- `QUIZ_` - Activates quiz mode (multiple choice)
- `STORY_` - Activates story mode with dynamic variables
- Numbers (e.g., `03_`, `05_`) - Used for ordering modules

## Key Variables (app.js)

- `library` - Object containing all loaded modules
- `currentList` - Array of cards for the current active module
- `currentCard` - The card currently being studied
- `userStats` - Object tracking user progress (level per word)
- `isStudyMode`, `isDictationMode`, `isQuizMode`, `isStoryMode` - Mode flags
- `storyVariables` - Object storing captured variables in story mode (e.g., `{nome: "Jabran"}`)

## Important Constants

- `VARIABLE_CAPTURE_PATTERN` - Regex for capturing story variables (limited to 50 chars for security)
- `VARIABLE_PLACEHOLDER_REGEX` - Pattern to find `{variableName}` placeholders
- `sessionTotalGoal` - Number of correct answers per round (default: 10)

## Code Style & Conventions

1. **Language**: Code comments and variable names are in Italian (reflecting the target audience)
2. **Naming**: camelCase for variables and functions
3. **DOM Elements**: Cached in variables at the top of app.js
4. **Functions**: Well-documented with JSDoc comments for security-sensitive functions
5. **Security**: 
   - Input sanitization using `escapeRegexSpecialChars()`
   - ReDoS prevention with character limits in regex patterns
   - HTML escaping with `escapeForHtml()`
6. **Storage**: localStorage key is 'deutschStats'

## Security Considerations

⚠️ **Important**: This codebase has specific security measures in place:

1. **Regex Security**: Variable capture patterns are limited to 50 characters to prevent ReDoS attacks
2. **Input Sanitization**: All user input is escaped before use in regex or HTML
3. **Helper Functions**: Use existing security functions:
   - `escapeRegexSpecialChars()` - Escape special regex characters
   - `escapeForHtml()` - Escape for safe HTML injection
   - `buildVariableCaptureRegex()` - Build safe regex for story mode

When modifying regex patterns or handling user input, always use these helper functions.

## Development Workflow

### Running the Application
1. Open `index.html` in a modern browser (Chrome, Firefox, Safari, Edge)
2. Click "Choose Files" and select a folder containing CSV files
3. Choose a module to start learning

### Testing Changes
1. Open browser DevTools console for debugging
2. Test with the included `vocaboli.csv` or files in `A1 De/` directory
3. Test localStorage persistence by refreshing the page
4. Check different modes: standard, dictation, quiz, and story

### Common Tasks

**Adding a new learning mode:**
1. Add a flag variable (e.g., `isNewMode = false`)
2. Create activation function in module selection
3. Modify `pickCard()` to handle the new mode
4. Update `checkAnswer()` for mode-specific validation
5. Add UI elements in `index.html` if needed

**Modifying answer validation:**
- Primary validation is in `checkAnswer()` function
- Story mode has special handling with `buildVariableCaptureRegex()`
- Quiz mode uses `quiz_` prefix in answers for multiple choice

**Adding new CSV vocabulary:**
1. Create CSV file with format: `Italian;German`
2. Use prefixes: `QUIZ_` for quizzes, `STORY_` for stories
3. Place in root directory or `A1 De/` folder
4. Reload the app and select the folder

## Browser Compatibility

The app uses:
- `webkitdirectory` attribute for folder selection (supported in modern browsers)
- Web Speech API for audio playback
- localStorage for data persistence
- ES6+ JavaScript features

Supported browsers: Recent versions of Chrome, Firefox, Safari, and Edge

## Known Limitations

1. No backend - all data is stored in browser localStorage
2. No user authentication or multi-device sync
3. Audio playback relies on browser's speech synthesis (quality varies)
4. No automated tests - manual testing required
5. No TypeScript or type checking

## Future Enhancement Areas

Consider these areas when adding features:
- Add unit tests for core functions (especially security-sensitive regex functions)
- Implement spaced repetition algorithm
- Add export/import functionality for user progress
- Support for more language pairs beyond Italian-German
- Mobile-responsive improvements
- Accessibility enhancements (ARIA labels, keyboard navigation)

## Getting Help

- The main logic is in `app.js` - start there for understanding game flow
- Look at `folderInput.addEventListener('change', ...)` for CSV loading logic
- Check `pickCard()` and `checkAnswer()` for core game mechanics
- Review `buildVariableCaptureRegex()` for story mode variable handling
