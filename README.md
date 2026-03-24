# Multi-Language Wordsearch Generator

A static website that generates wordsearch puzzles with vocabulary in multiple languages and themes. Choose a theme, which language appears in the grid, and which language appears in the word list, then find the word list language words hidden in the grid.

## Features

- 100 language-learning themes (counting, greetings, colors, school, travel, food, nature, technology, and more)
- Theme data is organized under `data/themes/` with a catalog file at `data/themes/index.json`
- Pre-loaded vocabulary words in `es`, `fr`, `en`, and `kw` fields
- Supports all combinations of grid and word list languages
- Generates a 12x12 wordsearch grid with words placed in deterministic directions
- Translation words displayed in the list for lookup
- Interactive selection: click and drag to find words
- Visual feedback for found words and active selections (line overlays in the grid, struck through in list)

## How to Use

1. Open `index.html` in a web browser
2. Select the language pair first
3. Continue to the theme step and choose one of the available themes
4. Click "Load Wordsearch" to generate the puzzle
5. The selection form will be hidden and the wordsearch will fill the screen
6. Click and drag on the grid to select sequences of letters
7. Find all the word list language words - reference translations are in the list
8. Found words are marked complete and remembered when returning to the same theme/language combination

## Adding More Words

Theme files live in `data/themes/`, and each entry should have all four language keys:

### Example theme file (`data/themes/food.json`):
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

### Theme catalog (`data/themes/index.json`):
```json
[
  {
    "id": "food",
    "name": "Food",
    "file": "food.json"
  }
]
```

## Hosting on GitHub Pages

1. Create a new repository on GitHub
2. Upload these files: `index.html`, `styles.css`, `script.js`, and the full `data/themes/` folder
3. Go to repository Settings > Pages
4. Set source to "Deploy from a branch"
5. Select "main" branch and "/ (root)" folder
6. Save and wait for deployment

Your wordsearch will be available at `https://yourusername.github.io/repositoryname/`

## Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript