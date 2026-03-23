# Multi-Language Wordsearch Generator

A static website that generates wordsearch puzzles with vocabulary in multiple languages and themes. Choose a theme, which language appears in the grid, and which language appears in the word list, then find the word list language words hidden in the grid.

## Features

- Multiple themes: Food vocabulary and Family member names
- Pre-loaded vocabulary words from `food.json` and `family.json` with `es`, `fr`, `en`, and `kw` translations
- Supports all combinations of grid and word list languages
- Generates a 12x12 wordsearch grid with words placed in deterministic directions
- Translation words displayed in the list for lookup
- Interactive selection: click and drag to find words
- Visual feedback for found words (highlighted in yellow, struck through in list)

## How to Use

1. Open `index.html` in a web browser
2. Select a theme: Food or Family Members
3. Select the language for the grid (where words will be hidden) - `es` is selected by default
4. The word list language automatically defaults to your browser's language (`es`, `fr`, `en`, or `kw` when available)
5. Adjust selections as needed, then click the "Load Wordsearch" button to generate the puzzle
6. The selection form will be hidden and the wordsearch will fill the screen
7. Click and drag on the grid to select sequences of letters
8. Find all the word list language words - reference translations are in the list
9. Found words are highlighted and marked complete
10. Refresh the page to generate a new wordsearch with different settings

## Adding More Words

Edit the appropriate JSON file to add more word pairs. Each entry should have all four languages:

### Food words (`food.json`):
```json
[
  {
    "es": "PAN",
    "fr": "PAIN",
    "en": "BREAD",
    "kw": "BARA"
  }
]
```

### Family member words (`family.json`):
```json
[
  {
    "es": "PADRE",
    "fr": "PERE",
    "en": "FATHER",
    "kw": "TAS"
  }
]
```

## Hosting on GitHub Pages

1. Create a new repository on GitHub
2. Upload these files: `index.html`, `styles.css`, `script.js`, `food.json`, `family.json`
3. Go to repository Settings > Pages
4. Set source to "Deploy from a branch"
5. Select "main" branch and "/ (root)" folder
6. Save and wait for deployment

Your wordsearch will be available at `https://yourusername.github.io/repositoryname/`

## Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript